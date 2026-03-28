import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { InitiateUploadSchema, CompleteUploadSchema } from '@babylon/shared';
import { media, mediaFile, episode } from '../db/schema.js';

const uploadRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/upload/initiate
  app.post('/api/upload/initiate', async (request, reply) => {
    const parseResult = InitiateUploadSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send({ error: 'Invalid request body', details: parseResult.error.flatten() });
    }
    const input = parseResult.data;

    // Verify media exists
    const rows = app.db.select().from(media).where(eq(media.id, input.mediaId)).all();
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }

    // Phase 2: local storage — return the expected local path (no presigned URL needed)
    if (app.storage) {
      const s3Key = app.storage.buildKey(input.type, input.mediaId, {
        seasonNumber: input.seasonNumber,
        episodeNumber: input.episodeNumber,
        filename: input.filename,
      });
      return reply.send({ uploadUrl: null, s3Key });
    }

    // Phase 1 fallback: S3 presigned URL
    if (!app.s3) {
      return reply.status(503).send({ error: 'Storage not configured' });
    }

    const s3Key = app.s3.buildKey(input.type, input.mediaId, {
      seasonNumber: input.seasonNumber,
      episodeNumber: input.episodeNumber,
      filename: input.filename,
    });

    const uploadUrl = await app.s3.getUploadUrl(s3Key, input.contentType);

    return reply.send({ uploadUrl, s3Key });
  });

  // POST /api/upload/complete
  app.post('/api/upload/complete', async (request, reply) => {
    const parseResult = CompleteUploadSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send({ error: 'Invalid request body', details: parseResult.error.flatten() });
    }
    const input = parseResult.data;

    // Verify media exists
    const rows = app.db.select().from(media).where(eq(media.id, input.mediaId)).all();
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }
    const mediaEntry = rows[0];

    if (input.episodeId) {
      // Update the episode record with s3Key + file info
      app.db
        .update(episode)
        .set({
          s3Key: input.s3Key,
          fileSize: input.fileSize ?? null,
          duration: input.duration ?? null,
          format: input.format ?? null,
          originalFilename: input.originalFilename ?? null,
        })
        .where(eq(episode.id, input.episodeId))
        .run();

      return reply.send({ success: true, episodeId: input.episodeId });
    } else if (mediaEntry.type === 'movie') {
      // Create or replace mediaFile record
      const fileId = ulid();
      app.db
        .insert(mediaFile)
        .values({
          id: fileId,
          mediaId: input.mediaId,
          s3Key: input.s3Key,
          fileSize: input.fileSize ?? null,
          duration: input.duration ?? null,
          format: input.format ?? null,
          originalFilename: input.originalFilename ?? null,
        })
        .run();

      return reply.status(201).send({ success: true, mediaFileId: fileId });
    } else {
      return reply.status(400).send({
        error: 'episodeId required for series/anime uploads',
      });
    }
  });

  // POST /api/upload/bulk
  app.post('/api/upload/bulk', async (request, reply) => {
    const body = request.body as Array<{
      filename: string;
      contentType: string;
      mediaId: string;
      type: 'movie' | 'series' | 'anime';
      seasonNumber?: number;
      episodeNumber?: number;
    }>;

    if (!Array.isArray(body)) {
      return reply.status(400).send({ error: 'Request body must be an array' });
    }

    // Phase 2: local storage — return expected local paths
    if (app.storage) {
      const results = body.map((item) => {
        const parseResult = InitiateUploadSchema.safeParse(item);
        if (!parseResult.success) {
          return { error: 'Invalid item', details: parseResult.error.flatten() };
        }
        const input = parseResult.data;
        const s3Key = app.storage.buildKey(input.type, input.mediaId, {
          seasonNumber: input.seasonNumber,
          episodeNumber: input.episodeNumber,
          filename: input.filename,
        });
        return { uploadUrl: null, s3Key };
      });
      return reply.send(results);
    }

    // Phase 1 fallback: S3 presigned URLs
    if (!app.s3) {
      return reply.status(503).send({ error: 'Storage not configured' });
    }

    const results = await Promise.all(
      body.map(async (item) => {
        const parseResult = InitiateUploadSchema.safeParse(item);
        if (!parseResult.success) {
          return { error: 'Invalid item', details: parseResult.error.flatten() };
        }
        const input = parseResult.data;
        const s3Key = app.s3.buildKey(input.type, input.mediaId, {
          seasonNumber: input.seasonNumber,
          episodeNumber: input.episodeNumber,
          filename: input.filename,
        });
        const uploadUrl = await app.s3.getUploadUrl(s3Key, input.contentType);
        return { uploadUrl, s3Key };
      })
    );

    return reply.send(results);
  });
};

export default uploadRoutes;
