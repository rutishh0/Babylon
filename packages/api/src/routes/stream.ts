import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { media, mediaFile, episode, subtitle } from '../db/schema.js';

const streamRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/stream/:id?episode_id=
  app.get('/api/stream/:id', async (request, reply) => {
    if (!app.s3) {
      return reply.status(503).send({ error: 'S3 client not configured' });
    }

    const { id } = request.params as { id: string };
    const query = request.query as { episode_id?: string };

    // Verify media exists
    const rows = app.db.select().from(media).where(eq(media.id, id)).all();
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }
    const mediaEntry = rows[0];

    let s3Key: string | null = null;

    if (query.episode_id) {
      // Look up episode s3Key
      const episodes = app.db
        .select()
        .from(episode)
        .where(eq(episode.id, query.episode_id))
        .all();
      if (episodes.length === 0) {
        return reply.status(404).send({ error: 'Episode not found' });
      }
      s3Key = episodes[0].s3Key ?? null;
      if (!s3Key) {
        return reply.status(404).send({ error: 'No file associated with this episode' });
      }
    } else {
      // Movie — look up mediaFile
      const files = app.db
        .select()
        .from(mediaFile)
        .where(eq(mediaFile.mediaId, id))
        .all();
      if (files.length === 0) {
        return reply.status(404).send({ error: 'No file associated with this media' });
      }
      s3Key = files[0].s3Key;
    }

    const streamUrl = await app.s3.getStreamUrl(s3Key);
    return reply.send({ streamUrl, s3Key });
  });

  // GET /api/stream/:id/subtitle?episode_id=&language=
  app.get('/api/stream/:id/subtitle', async (request, reply) => {
    if (!app.s3) {
      return reply.status(503).send({ error: 'S3 client not configured' });
    }

    const { id } = request.params as { id: string };
    const query = request.query as { episode_id?: string; language?: string };

    // Verify media exists
    const rows = app.db.select().from(media).where(eq(media.id, id)).all();
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }

    let subtitleRows: typeof subtitle.$inferSelect[];

    if (query.episode_id) {
      subtitleRows = app.db
        .select()
        .from(subtitle)
        .where(eq(subtitle.episodeId, query.episode_id))
        .all();
    } else {
      // Movie — find via mediaFile
      const files = app.db
        .select()
        .from(mediaFile)
        .where(eq(mediaFile.mediaId, id))
        .all();
      if (files.length === 0) {
        return reply.send([]);
      }
      subtitleRows = app.db
        .select()
        .from(subtitle)
        .where(eq(subtitle.mediaFileId, files[0].id))
        .all();
    }

    // Filter by language if specified
    const filtered = query.language
      ? subtitleRows.filter((s) => s.language === query.language)
      : subtitleRows;

    const results = await Promise.all(
      filtered.map(async (sub) => {
        const url = await app.s3.getStreamUrl(sub.s3Key);
        return {
          id: sub.id,
          language: sub.language,
          label: sub.label,
          format: sub.format,
          url,
        };
      })
    );

    return reply.send(results);
  });
};

export default streamRoutes;
