import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';
import { AddToWatchlistSchema, QueueIngestSchema } from '@babylon/shared';
import { media } from '../db/schema.js';

const ingestRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/ingest/watchlist — returns watchlist.json contents
  app.get('/api/ingest/watchlist', async (_request, reply) => {
    const entries = app.watchlist.read();
    return reply.send(entries);
  });

  // POST /api/ingest/watchlist — add to watchlist
  app.post('/api/ingest/watchlist', async (request, reply) => {
    const parsed = AddToWatchlistSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: parsed.error.issues });
    }

    try {
      const entry = app.watchlist.add(parsed.data);
      return reply.status(201).send(entry);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(409).send({ error: message });
    }
  });

  // DELETE /api/ingest/watchlist/:title — remove by title
  app.delete('/api/ingest/watchlist/:title', async (request, reply) => {
    const { title } = request.params as { title: string };
    const decodedTitle = decodeURIComponent(title);
    const removed = app.watchlist.remove(decodedTitle);
    if (!removed) {
      return reply.status(404).send({ error: `"${decodedTitle}" not found in watchlist` });
    }
    return reply.status(204).send();
  });

  // GET /api/ingest/status — returns daemon status
  app.get('/api/ingest/status', async (_request, reply) => {
    const status = app.watchlist.readStatus();
    return reply.send(status);
  });

  // POST /api/ingest/trigger — write trigger file for Python daemon
  app.post('/api/ingest/trigger', async (_request, reply) => {
    app.watchlist.trigger();
    return reply.send({ triggered: true });
  });

  // GET /api/ingest/search?q= — search Jikan for anime
  app.get('/api/ingest/search', async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q || q.trim() === '') {
      return reply.status(400).send({ error: 'Query parameter "q" is required' });
    }

    const results = await app.jikan.search(q.trim());

    const enriched = results.map((item) => {
      const searchTitle = item.title_english || item.title;

      // Exact case-insensitive match against the library
      const libraryRows = app.db
        .select()
        .from(media)
        .where(sql`LOWER(${media.title}) = LOWER(${searchTitle})`)
        .all();

      const libraryMatch = libraryRows[0] ?? null;

      return {
        malId: item.mal_id,
        title: item.title,
        synopsis: item.synopsis,
        posterUrl: item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null,
        genres: item.genres.map((g) => g.name),
        rating: item.score,
        year: item.year,
        episodeCount: item.episodes,
        inLibrary: libraryMatch !== null,
        libraryId: libraryMatch ? libraryMatch.id : null,
      };
    });

    return reply.send(enriched);
  });

  // POST /api/ingest/queue — add to watchlist + trigger
  app.post('/api/ingest/queue', async (request, reply) => {
    const parsed = QueueIngestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: parsed.error.issues });
    }

    const { title } = parsed.data;

    // Check if already in library using exact case-insensitive match
    const libraryRows = app.db
      .select()
      .from(media)
      .where(sql`LOWER(${media.title}) = LOWER(${title})`)
      .all();

    if (libraryRows.length > 0) {
      return reply.send({ alreadyInLibrary: true, mediaId: libraryRows[0].id });
    }

    // Add to watchlist and trigger daemon
    try {
      app.watchlist.add({ title });
    } catch {
      // Already in watchlist is fine — still trigger
    }
    app.watchlist.trigger();

    return reply.send({ queued: true, title });
  });
};

export default ingestRoutes;
