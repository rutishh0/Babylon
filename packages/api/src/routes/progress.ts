import type { FastifyPluginAsync } from 'fastify';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import { UpdateProgressSchema } from '@babylon/shared';
import { media, watchProgress } from '../db/schema.js';

function formatMedia(row: typeof media.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    description: row.description,
    posterUrl: row.posterUrl,
    backdropUrl: row.backdropUrl,
    genres: row.genres ? JSON.parse(row.genres) : [],
    rating: row.rating,
    year: row.year,
    source: row.source,
    externalId: row.externalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const progressRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/progress — Continue Watching list (incomplete progress, ordered by lastWatchedAt desc)
  app.get('/api/progress', async (_request, reply) => {
    const progressRows = app.db
      .select()
      .from(watchProgress)
      .where(eq(watchProgress.completed, false))
      .orderBy(desc(watchProgress.lastWatchedAt))
      .all();

    const items = progressRows.map((prog) => {
      const mediaRows = app.db
        .select()
        .from(media)
        .where(eq(media.id, prog.mediaId))
        .all();

      const mediaRow = mediaRows[0];
      if (!mediaRow) return null;

      return {
        ...formatMedia(mediaRow),
        progress: {
          id: prog.id,
          episodeId: prog.episodeId,
          positionSeconds: prog.positionSeconds,
          durationSeconds: prog.durationSeconds,
          completed: prog.completed,
          lastWatchedAt: prog.lastWatchedAt,
        },
      };
    }).filter(Boolean);

    return reply.send(items);
  });

  // PUT /api/progress/:mediaId — Upsert watch position
  app.put('/api/progress/:mediaId', async (request, reply) => {
    const { mediaId } = request.params as { mediaId: string };

    // Check media exists
    const mediaRows = app.db.select().from(media).where(eq(media.id, mediaId)).all();
    if (mediaRows.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }

    const parseResult = UpdateProgressSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: parseResult.error.flatten() });
    }
    const input = parseResult.data;

    const { episodeId, positionSeconds, durationSeconds } = input;
    const completed = durationSeconds > 0 && positionSeconds / durationSeconds > 0.95;

    // Delete existing progress for same mediaId + episodeId combination
    if (episodeId) {
      app.db
        .delete(watchProgress)
        .where(and(eq(watchProgress.mediaId, mediaId), eq(watchProgress.episodeId, episodeId)))
        .run();
    } else {
      app.db
        .delete(watchProgress)
        .where(and(eq(watchProgress.mediaId, mediaId), isNull(watchProgress.episodeId)))
        .run();
    }

    const id = ulid();
    const now = new Date().toISOString();

    app.db.insert(watchProgress).values({
      id,
      mediaId,
      episodeId: episodeId ?? null,
      positionSeconds,
      durationSeconds,
      completed,
      lastWatchedAt: now,
    }).run();

    const rows = app.db.select().from(watchProgress).where(eq(watchProgress.id, id)).all();
    const prog = rows[0];

    return reply.status(200).send({
      id: prog.id,
      mediaId: prog.mediaId,
      episodeId: prog.episodeId,
      positionSeconds: prog.positionSeconds,
      durationSeconds: prog.durationSeconds,
      completed: prog.completed,
      lastWatchedAt: prog.lastWatchedAt,
    });
  });

  // DELETE /api/progress/:mediaId — Clear all progress for a media item
  app.delete('/api/progress/:mediaId', async (request, reply) => {
    const { mediaId } = request.params as { mediaId: string };

    app.db.delete(watchProgress).where(eq(watchProgress.mediaId, mediaId)).run();

    return reply.status(204).send();
  });
};

export default progressRoutes;
