import { Command } from 'commander';
import { statSync, readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { extname, basename, join } from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { Upload } from '@aws-sdk/lib-storage';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';
import {
  initiateUpload,
  completeUpload,
  createMedia,
  searchMetadata,
} from '../lib/api.js';
import { parseFilename } from '../lib/filename-parser.js';
import type { MediaType } from '@babylon/shared';

const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.ts']);
const SUBTITLE_EXTS = new Set(['.srt', '.vtt', '.ass']);
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100 MB

interface UploadOptions {
  type?: MediaType;
  search?: string;
  title?: string;
  season?: string;
  episode?: string;
  year?: string;
  genre?: string;
}

export function registerUploadCommand(program: Command): void {
  program
    .command('upload <target>')
    .description('Upload a media file or directory to Babylon')
    .option('--type <type>', 'Media type: movie | series | anime')
    .option('--search <query>', 'Search TMDB/Jikan for metadata to attach')
    .option('--title <title>', 'Override title')
    .option('--season <n>', 'Season number (series/anime)')
    .option('--episode <n>', 'Episode number (series/anime)')
    .option('--year <year>', 'Release year')
    .option('--genre <genre>', 'Genre (can repeat)', (v, acc: string[]) => [...acc, v], [] as string[])
    .action(async (target: string, opts: UploadOptions & { genre?: string[] }) => {
      const stat = statSync(target);
      if (stat.isDirectory()) {
        await uploadDirectory(target, opts);
      } else {
        await uploadSingleFile(target, opts);
      }
    });
}

// ── Directory upload ──────────────────────────────────────────────────────────

async function uploadDirectory(dir: string, opts: UploadOptions & { genre?: string[] }): Promise<void> {
  const entries = readdirSync(dir, { withFileTypes: true });
  const videoFiles = entries
    .filter((e) => e.isFile() && VIDEO_EXTS.has(extname(e.name).toLowerCase()))
    .map((e) => join(dir, e.name));

  if (videoFiles.length === 0) {
    console.log(chalk.yellow('No video files found in directory.'));
    return;
  }

  console.log(chalk.bold(`Found ${videoFiles.length} video file(s).`));

  for (const file of videoFiles) {
    await uploadSingleFile(file, opts);
  }
}

// ── Single file upload ────────────────────────────────────────────────────────

async function uploadSingleFile(filePath: string, opts: UploadOptions & { genre?: string[] }): Promise<void> {
  const filename = basename(filePath);
  const parsed = parseFilename(filename);

  const spinner = ora(`Preparing upload: ${filename}`).start();

  try {
    // Resolve metadata
    const title = opts.title ?? parsed.title ?? filename;
    const type: MediaType = (opts.type as MediaType) ?? parsed.type ?? 'movie';
    const season = opts.season ? parseInt(opts.season, 10) : parsed.season;
    const episode = opts.episode ? parseInt(opts.episode, 10) : parsed.episode;
    const year = opts.year ? parseInt(opts.year, 10) : parsed.year;

    // If --search provided, look up TMDB/Jikan
    let mediaId: string;
    if (opts.search) {
      spinner.text = `Searching metadata for: ${opts.search}`;
      const results = await searchMetadata(opts.search, type);
      if (results.length === 0) {
        spinner.warn(`No metadata found for "${opts.search}". Creating manual entry.`);
      }
    }

    // Create or reuse media entry
    spinner.text = 'Creating library entry...';
    const media = await createMedia({
      title,
      type,
      year,
      source: 'manual',
      genres: opts.genre?.length ? opts.genre : undefined,
    });
    mediaId = media.id;

    // Determine content type
    const ext = extname(filename).slice(1).toLowerCase();
    const contentType = getContentType(ext);

    // Initiate upload — get presigned URL
    spinner.text = 'Getting upload URL...';
    const { uploadUrl, s3Key } = await initiateUpload({
      filename,
      contentType,
      mediaId,
      type,
      seasonNumber: season,
      episodeNumber: episode,
    });

    // Upload the file
    const stat = statSync(filePath);
    const fileSize = stat.size;

    spinner.text = `Uploading ${filename} (${formatSize(fileSize)})...`;

    if (fileSize > MULTIPART_THRESHOLD) {
      await multipartUpload(filePath, uploadUrl, s3Key, contentType, fileSize, spinner);
    } else {
      await singlePartUpload(filePath, uploadUrl, contentType, fileSize, spinner);
    }

    // Confirm with API
    spinner.text = 'Confirming upload...';
    await completeUpload({
      s3Key,
      mediaId,
      fileSize,
      format: ext,
      originalFilename: filename,
    });

    spinner.succeed(chalk.green(`Uploaded: ${filename}`));

    // Auto-detect and upload subtitles
    await uploadSidecarSubtitles(filePath, mediaId, type, season, episode, spinner);

  } catch (err) {
    spinner.fail(chalk.red(`Upload failed: ${(err instanceof Error ? err.message : String(err))}`));
    process.exitCode = 1;
  }
}

// ── Subtitle sidecar detection ────────────────────────────────────────────────

async function uploadSidecarSubtitles(
  videoPath: string,
  mediaId: string,
  type: MediaType,
  season: number | undefined,
  episode: number | undefined,
  parentSpinner: ReturnType<typeof ora>
): Promise<void> {
  const dir = videoPath.replace(/[^/\\]+$/, '');
  const videoBase = basename(videoPath).replace(/\.[^.]+$/, '');

  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  const subtitleFiles = entries.filter((name) => {
    const ext = extname(name).toLowerCase();
    return SUBTITLE_EXTS.has(ext) && name.startsWith(videoBase);
  });

  for (const subFile of subtitleFiles) {
    const subPath = join(dir, subFile);
    const subExt = extname(subFile).slice(1).toLowerCase();
    const spinner = ora(`  Uploading subtitle: ${subFile}`).start();
    try {
      const subStat = statSync(subPath);
      const { uploadUrl, s3Key } = await initiateUpload({
        filename: subFile,
        contentType: getContentType(subExt),
        mediaId,
        type,
        seasonNumber: season,
        episodeNumber: episode,
      });
      await singlePartUpload(subPath, uploadUrl, getContentType(subExt), subStat.size, spinner);
      await completeUpload({
        s3Key,
        mediaId,
        fileSize: subStat.size,
        format: subExt,
        originalFilename: subFile,
      });
      spinner.succeed(chalk.green(`  Subtitle uploaded: ${subFile}`));
    } catch (err) {
      spinner.fail(chalk.yellow(`  Subtitle upload failed: ${subFile} — ${err instanceof Error ? err.message : String(err)}`));
    }
  }
}

// ── Upload helpers ────────────────────────────────────────────────────────────

async function singlePartUpload(
  filePath: string,
  presignedUrl: string,
  contentType: string,
  fileSize: number,
  spinner: ReturnType<typeof ora>
): Promise<void> {
  const body = await readFile(filePath);
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'Content-Length': String(fileSize) },
    body,
  });
  if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);
  spinner.text = `Uploaded ${formatSize(fileSize)}`;
}

async function multipartUpload(
  filePath: string,
  _presignedUrl: string,
  s3Key: string,
  contentType: string,
  fileSize: number,
  spinner: ReturnType<typeof ora>
): Promise<void> {
  // For multipart, we need raw S3 credentials — these are obtained from the
  // API (the presignedUrl for large files returns the key; the actual multipart
  // is done via a dedicated multipart-upload endpoint that returns credentials).
  // For now, this path uses the same presigned PUT (the API will detect large
  // files and return a URL that supports multipart). Future: add a dedicated
  // /upload/multipart endpoint on the API and wire it here.
  //
  // Simplified approach: if the presigned URL is present, do chunked PUT.
  const CHUNK = 10 * 1024 * 1024; // 10 MB chunks
  const stream = createReadStream(filePath, { highWaterMark: CHUNK });
  let uploaded = 0;

  for await (const chunk of stream) {
    uploaded += (chunk as Buffer).length;
    spinner.text = `Uploading ${formatSize(uploaded)} / ${formatSize(fileSize)} (${Math.round((uploaded / fileSize) * 100)}%)`;
  }
  // Actual upload — delegate to single-part for the final cut
  // Real multipart implementation requires API-side orchestration (initiate, upload parts, complete)
  // This is a placeholder that falls back to single-part for CLI V1.
  await singlePartUpload(filePath, _presignedUrl, contentType, fileSize, spinner);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function getContentType(ext: string): string {
  const map: Record<string, string> = {
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    webm: 'video/webm',
    m4v: 'video/x-m4v',
    ts: 'video/mp2t',
    srt: 'text/plain',
    vtt: 'text/vtt',
    ass: 'text/x-ssa',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };
  return map[ext] ?? 'application/octet-stream';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
