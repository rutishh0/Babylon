import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { listMedia, getMedia, deleteMedia, searchMetadata } from '../lib/api.js';
import type { MediaResponse } from '@babylon/shared';
import type { MediaType } from '@babylon/shared';
import * as readline from 'readline';

export function registerLibraryCommands(program: Command): void {
  // ── list ──────────────────────────────────────────────────────────────────
  program
    .command('list')
    .description('List media in your library')
    .option('--type <type>', 'Filter by type: movie | series | anime')
    .option('--genre <genre>', 'Filter by genre')
    .option('--limit <n>', 'Max results', '50')
    .action(async (opts: { type?: string; genre?: string; limit?: string }) => {
      const spinner = ora('Fetching library...').start();
      try {
        const results = await listMedia({
          type: opts.type as MediaType | undefined,
          genre: opts.genre,
          limit: parseInt(opts.limit ?? '50', 10),
        });
        spinner.stop();

        if (results.length === 0) {
          console.log(chalk.dim('No media found.'));
          return;
        }

        printTable(results);
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });

  // ── search ────────────────────────────────────────────────────────────────
  program
    .command('search <query>')
    .description('Search your library')
    .option('--type <type>', 'Filter by type')
    .action(async (query: string, opts: { type?: string }) => {
      const spinner = ora(`Searching for "${query}"...`).start();
      try {
        const results = await listMedia({
          q: query,
          type: opts.type as MediaType | undefined,
        });
        spinner.stop();

        if (results.length === 0) {
          console.log(chalk.dim(`No results for "${query}".`));
          return;
        }

        printTable(results);
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });

  // ── info ──────────────────────────────────────────────────────────────────
  program
    .command('info <media-id>')
    .description('Show detailed info for a media entry')
    .action(async (id: string) => {
      const spinner = ora('Fetching media info...').start();
      try {
        const media = await getMedia(id);
        spinner.stop();
        printMediaDetail(media);
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });

  // ── delete ────────────────────────────────────────────────────────────────
  program
    .command('delete <media-id>')
    .description('Delete a media entry (and its S3 files)')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (id: string, opts: { yes?: boolean }) => {
      // Show info first so the user knows what they're deleting
      let title = id;
      try {
        const media = await getMedia(id);
        title = `"${media.title}" (${media.type}, ${media.year ?? 'n/a'})`;
      } catch {
        // ignore if we can't fetch
      }

      if (!opts.yes) {
        const confirmed = await confirm(`Delete ${title}? This cannot be undone. [y/N] `);
        if (!confirmed) {
          console.log(chalk.dim('Aborted.'));
          return;
        }
      }

      const spinner = ora(`Deleting ${title}...`).start();
      try {
        await deleteMedia(id);
        spinner.succeed(chalk.green(`Deleted: ${title}`));
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });
}

// ── Display helpers ───────────────────────────────────────────────────────────

function printTable(media: MediaResponse[]): void {
  const ID_W = 28;
  const TITLE_W = 38;
  const TYPE_W = 8;
  const YEAR_W = 6;
  const RATING_W = 7;

  const header = [
    chalk.bold('ID'.padEnd(ID_W)),
    chalk.bold('Title'.padEnd(TITLE_W)),
    chalk.bold('Type'.padEnd(TYPE_W)),
    chalk.bold('Year'.padEnd(YEAR_W)),
    chalk.bold('Rating'.padEnd(RATING_W)),
  ].join('  ');

  console.log(header);
  console.log(chalk.dim('─'.repeat(ID_W + TITLE_W + TYPE_W + YEAR_W + RATING_W + 8)));

  for (const m of media) {
    const typeColor = m.type === 'anime' ? chalk.magenta : m.type === 'movie' ? chalk.cyan : chalk.yellow;
    console.log([
      chalk.dim(m.id.padEnd(ID_W)),
      truncate(m.title, TITLE_W).padEnd(TITLE_W),
      typeColor(m.type.padEnd(TYPE_W)),
      String(m.year ?? '—').padEnd(YEAR_W),
      m.rating ? chalk.green(String(m.rating).padEnd(RATING_W)) : chalk.dim('—'.padEnd(RATING_W)),
    ].join('  '));
  }

  console.log(chalk.dim(`\n${media.length} result(s)`));
}

function printMediaDetail(m: MediaResponse): void {
  console.log();
  console.log(chalk.bold.white(m.title));
  console.log(chalk.dim(`ID: ${m.id}`));
  console.log(`Type:    ${chalk.cyan(m.type)}`);
  console.log(`Year:    ${m.year ?? chalk.dim('—')}`);
  console.log(`Rating:  ${m.rating ?? chalk.dim('—')}`);
  console.log(`Genres:  ${m.genres?.join(', ') || chalk.dim('—')}`);
  console.log(`Source:  ${chalk.dim(m.source ?? '—')}`);
  if (m.description) {
    console.log();
    console.log(chalk.italic(m.description));
  }
  if (m.seasons && m.seasons.length > 0) {
    console.log();
    console.log(chalk.bold('Seasons:'));
    for (const s of m.seasons) {
      console.log(`  Season ${s.seasonNumber}${s.title ? ` — ${s.title}` : ''} (${s.episodes.length} episodes)`);
    }
  }
  if (m.mediaFile) {
    console.log();
    console.log(chalk.bold('File:'));
    console.log(`  S3 Key:    ${chalk.dim(m.mediaFile.s3Key)}`);
    console.log(`  Size:      ${m.mediaFile.fileSize ? formatSize(m.mediaFile.fileSize) : '—'}`);
    console.log(`  Duration:  ${m.mediaFile.duration ? formatDuration(m.mediaFile.duration) : '—'}`);
    console.log(`  Format:    ${m.mediaFile.format ?? '—'}`);
  }
  console.log();
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'y');
    });
  });
}
