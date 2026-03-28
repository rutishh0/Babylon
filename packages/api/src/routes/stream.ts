import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import { media, mediaFile, episode, subtitle } from '../db/schema.js';

const streamRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/stream/:id?episode_id=
  app.get('/api/stream/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { episode_id?: string };

    // Verify media exists
    const rows = app.db.select().from(media).where(eq(media.id, id)).all();
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }

    let s3Key: string | null = null;

    if (query.episode_id) {
      const episodes = app.db.select().from(episode).where(eq(episode.id, query.episode_id)).all();
      if (episodes.length === 0) {
        return reply.status(404).send({ error: 'Episode not found' });
      }
      s3Key = episodes[0].s3Key ?? null;
    } else {
      const files = app.db.select().from(mediaFile).where(eq(mediaFile.mediaId, id)).all();
      if (files.length === 0) {
        return reply.status(404).send({ error: 'No file associated with this media' });
      }
      s3Key = files[0].s3Key;
    }

    if (!s3Key) {
      return reply.status(404).send({ error: 'No file path available' });
    }

    // Resolve to absolute path on disk
    if (!app.storage) {
      return reply.status(503).send({ error: 'Storage not configured' });
    }

    const filePath = app.storage.resolve(s3Key);
    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'File not found on disk' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.mp4' ? 'video/mp4' : ext === '.mkv' ? 'video/x-matroska' : 'application/octet-stream';

    const range = request.headers.range;

    if (range) {
      // Parse Range header: "bytes=start-end"
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        reply.status(416).header('Content-Range', `bytes */${fileSize}`).send();
        return;
      }

      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      reply
        .status(206)
        .header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        .header('Accept-Ranges', 'bytes')
        .header('Content-Length', chunkSize)
        .header('Content-Type', mimeType)
        .send(stream);
    } else {
      // Full file
      const stream = fs.createReadStream(filePath);
      reply
        .header('Accept-Ranges', 'bytes')
        .header('Content-Length', fileSize)
        .header('Content-Type', mimeType)
        .send(stream);
    }
  });

  // GET /api/stream/:id/subtitle?episode_id=&language=
  app.get('/api/stream/:id/subtitle', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { episode_id?: string; language?: string };

    const rows = app.db.select().from(media).where(eq(media.id, id)).all();
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }

    let subtitleRows: typeof subtitle.$inferSelect[];

    if (query.episode_id) {
      subtitleRows = app.db.select().from(subtitle).where(eq(subtitle.episodeId, query.episode_id)).all();
    } else {
      const files = app.db.select().from(mediaFile).where(eq(mediaFile.mediaId, id)).all();
      if (files.length === 0) {
        return reply.send([]);
      }
      subtitleRows = app.db.select().from(subtitle).where(eq(subtitle.mediaFileId, files[0].id)).all();
    }

    const filtered = query.language
      ? subtitleRows.filter((s) => s.language === query.language)
      : subtitleRows;

    if (!app.storage) {
      return reply.send(filtered.map((sub) => ({
        id: sub.id, language: sub.language, label: sub.label, format: sub.format, url: null,
      })));
    }

    const results = filtered.map((sub) => {
      // Build URL for the subtitle file — client fetches from /api/stream/:id/subtitle-file?path=...
      const url = `/api/stream/${id}/subtitle-file?path=${encodeURIComponent(sub.s3Key)}`;
      return {
        id: sub.id,
        language: sub.language,
        label: sub.label,
        format: sub.format,
        url,
      };
    });

    return reply.send(results);
  });

  // GET /api/stream/:id/subtitle-file?path= — serves actual VTT file from disk
  app.get('/api/stream/:id/subtitle-file', async (request, reply) => {
    if (!app.storage) {
      return reply.status(503).send({ error: 'Storage not configured' });
    }

    const query = request.query as { path?: string };
    if (!query.path) {
      return reply.status(400).send({ error: 'path parameter required' });
    }

    const filePath = app.storage.resolve(query.path);
    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'Subtitle file not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    reply.header('Content-Type', 'text/vtt').send(content);
  });
};

export default streamRoutes;
