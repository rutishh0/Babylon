import type { FastifyPluginAsync } from 'fastify';
import { eq, like, and, desc, asc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { CreateMediaSchema, UpdateMediaSchema, ListMediaQuerySchema } from '@babylon/shared';
import { media, season, episode, mediaFile, watchProgress } from '../db/schema.js';

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

const mediaRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/media — list with optional filters, search, pagination
  app.get('/api/media', async (request, reply) => {
    const parseResult = ListMediaQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: parseResult.error.flatten() });
    }
    const query = parseResult.data;

    const conditions = [];
    if (query.type) {
      conditions.push(eq(media.type, query.type));
    }
    if (query.q) {
      conditions.push(like(media.title, `%${query.q}%`));
    }
    if (query.genre) {
      conditions.push(like(media.genres, `%${query.genre}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const allRows = app.db.select().from(media).where(where).all();
    const total = allRows.length;

    // Get paginated rows
    let queryBuilder = app.db
      .select()
      .from(media)
      .where(where);

    // Apply sort
    if (query.sort === 'title') {
      queryBuilder = (queryBuilder as any).orderBy(asc(media.title));
    } else if (query.sort === 'year') {
      queryBuilder = (queryBuilder as any).orderBy(desc(media.year));
    } else if (query.sort === 'rating') {
      queryBuilder = (queryBuilder as any).orderBy(desc(media.rating));
    } else {
      queryBuilder = (queryBuilder as any).orderBy(desc(media.createdAt));
    }

    const rows = (queryBuilder as any).limit(query.limit).offset(query.offset).all();

    return reply.send(rows.map(formatMedia));
  });

  // GET /api/media/:id — full detail
  app.get('/api/media/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const rows = app.db.select().from(media).where(eq(media.id, id)).all();
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }
    const row = rows[0];
    const formatted = formatMedia(row);

    if (row.type === 'movie') {
      // Include mediaFile for movies
      const files = app.db.select().from(mediaFile).where(eq(mediaFile.mediaId, id)).all();
      const file = files[0] ?? null;
      return reply.send({
        ...formatted,
        mediaFile: file
          ? {
              id: file.id,
              s3Key: file.s3Key,
              fileSize: file.fileSize,
              duration: file.duration,
              format: file.format,
            }
          : null,
      });
    } else {
      // series / anime — include seasons with episodes and watch progress
      const seasons = app.db.select().from(season).where(eq(season.mediaId, id)).all();
      const seasonsWithEpisodes = seasons.map((s) => {
        const episodes = app.db.select().from(episode).where(eq(episode.seasonId, s.id)).all();
        const episodesWithProgress = episodes.map((ep) => {
          const progressRows = app.db
            .select()
            .from(watchProgress)
            .where(eq(watchProgress.episodeId, ep.id))
            .all();
          const prog = progressRows[0] ?? null;
          return {
            id: ep.id,
            episodeNumber: ep.episodeNumber,
            title: ep.title,
            duration: ep.duration,
            thumbnailUrl: ep.thumbnailUrl,
            s3Key: ep.s3Key,
            fileSize: ep.fileSize,
            format: ep.format,
            progress: prog
              ? {
                  positionSeconds: prog.positionSeconds,
                  durationSeconds: prog.durationSeconds,
                  completed: prog.completed,
                  lastWatchedAt: prog.lastWatchedAt,
                }
              : null,
          };
        });
        return {
          id: s.id,
          seasonNumber: s.seasonNumber,
          title: s.title,
          episodes: episodesWithProgress,
        };
      });
      return reply.send({ ...formatted, seasons: seasonsWithEpisodes });
    }
  });

  // POST /api/media — create
  app.post('/api/media', async (request, reply) => {
    const parseResult = CreateMediaSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: parseResult.error.flatten() });
    }
    const input = parseResult.data;

    const now = new Date().toISOString();
    const id = ulid();

    app.db.insert(media).values({
      id,
      title: input.title,
      type: input.type,
      description: input.description ?? null,
      posterUrl: input.posterUrl ?? null,
      backdropUrl: input.backdropUrl ?? null,
      genres: input.genres ? JSON.stringify(input.genres) : null,
      rating: input.rating ?? null,
      year: input.year ?? null,
      source: input.source ?? null,
      externalId: input.externalId ?? null,
      createdAt: now,
      updatedAt: now,
    }).run();

    const rows = app.db.select().from(media).where(eq(media.id, id)).all();
    return reply.status(201).send(formatMedia(rows[0]));
  });

  // PATCH /api/media/:id — update
  app.patch('/api/media/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = app.db.select().from(media).where(eq(media.id, id)).all();
    if (existing.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }

    const parseResult = UpdateMediaSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: parseResult.error.flatten() });
    }
    const input = parseResult.data;

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.title !== undefined) updateData.title = input.title;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.posterUrl !== undefined) updateData.posterUrl = input.posterUrl;
    if (input.backdropUrl !== undefined) updateData.backdropUrl = input.backdropUrl;
    if (input.genres !== undefined) updateData.genres = JSON.stringify(input.genres);
    if (input.rating !== undefined) updateData.rating = input.rating;
    if (input.year !== undefined) updateData.year = input.year;
    if (input.source !== undefined) updateData.source = input.source;
    if (input.externalId !== undefined) updateData.externalId = input.externalId;

    app.db.update(media).set(updateData).where(eq(media.id, id)).run();

    const rows = app.db.select().from(media).where(eq(media.id, id)).all();
    return reply.send(formatMedia(rows[0]));
  });

  // DELETE /api/media/:id — delete
  app.delete('/api/media/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = app.db.select().from(media).where(eq(media.id, id)).all();
    if (existing.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }

    app.db.delete(media).where(eq(media.id, id)).run();
    return reply.status(204).send();
  });
};

export default mediaRoutes;
