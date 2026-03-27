import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { media } from '../db/schema.js';

interface SearchResult {
  title: string;
  overview: string;
  posterUrl: string | null;
  genres: string[];
  rating: number | null;
  year: number | null;
  source: 'tmdb' | 'jikan';
  externalId: string;
}

const metadataRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/metadata/search?q=...&type=movie|series|anime
  app.get('/api/metadata/search', async (request, reply) => {
    const query = request.query as { q?: string; type?: string };

    if (!query.q) {
      return reply.status(400).send({ error: 'Missing required query parameter: q' });
    }

    const type = query.type ?? 'movie';

    if (type === 'anime') {
      // Use Jikan for anime
      const results = await app.jikan.search(query.q);
      const mapped: SearchResult[] = results.map((r) => ({
        title: r.title_english ?? r.title,
        overview: r.synopsis ?? '',
        posterUrl: r.images?.jpg?.large_image_url ?? r.images?.jpg?.image_url ?? null,
        genres: r.genres.map((g) => g.name),
        rating: r.score ?? null,
        year: r.year ?? null,
        source: 'jikan',
        externalId: String(r.mal_id),
      }));
      return reply.send(mapped);
    } else {
      // Use TMDB for movie or series
      if (!app.tmdb) {
        return reply.status(503).send({ error: 'TMDB client not configured' });
      }
      const tmdbType = type === 'series' ? 'tv' : 'movie';
      const results = await app.tmdb.search(query.q, tmdbType);
      const mapped: SearchResult[] = results.map((r) => ({
        title: r.title ?? r.name ?? '',
        overview: r.overview,
        posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        genres: app.tmdb.mapGenres(r.genre_ids),
        rating: r.vote_average ?? null,
        year: r.release_date
          ? parseInt(r.release_date.substring(0, 4), 10)
          : r.first_air_date
          ? parseInt(r.first_air_date.substring(0, 4), 10)
          : null,
        source: 'tmdb',
        externalId: String(r.id),
      }));
      return reply.send(mapped);
    }
  });

  // POST /api/metadata/apply/:id
  app.post('/api/metadata/apply/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const rows = app.db.select().from(media).where(eq(media.id, id)).all();
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Media not found' });
    }
    const entry = rows[0];

    if (!entry.externalId) {
      return reply.status(400).send({ error: 'Media has no externalId set' });
    }

    const now = new Date().toISOString();

    if (entry.source === 'jikan' || entry.type === 'anime') {
      const detail = await app.jikan.getDetail(parseInt(entry.externalId, 10));
      app.db
        .update(media)
        .set({
          title: detail.title_english ?? detail.title,
          description: detail.synopsis ?? null,
          posterUrl: detail.images?.jpg?.large_image_url ?? detail.images?.jpg?.image_url ?? null,
          genres: detail.genres ? JSON.stringify(detail.genres.map((g) => g.name)) : null,
          rating: detail.score ?? null,
          year: detail.year ?? null,
          source: 'jikan',
          updatedAt: now,
        })
        .where(eq(media.id, id))
        .run();
    } else {
      if (!app.tmdb) {
        return reply.status(503).send({ error: 'TMDB client not configured' });
      }
      const tmdbType = entry.type === 'series' ? 'tv' : 'movie';
      const detail = await app.tmdb.getDetail(parseInt(entry.externalId, 10), tmdbType);
      app.db
        .update(media)
        .set({
          title: detail.title ?? detail.name ?? entry.title,
          description: detail.overview ?? null,
          posterUrl: detail.posterUrl ?? null,
          backdropUrl: detail.backdropUrl ?? null,
          genres: detail.genres ? JSON.stringify(detail.genres.map((g) => g.name)) : null,
          rating: detail.vote_average ?? null,
          year: detail.release_date
            ? parseInt(detail.release_date.substring(0, 4), 10)
            : detail.first_air_date
            ? parseInt(detail.first_air_date.substring(0, 4), 10)
            : null,
          source: 'tmdb',
          updatedAt: now,
        })
        .where(eq(media.id, id))
        .run();
    }

    const updated = app.db.select().from(media).where(eq(media.id, id)).all();
    return reply.send({
      id: updated[0].id,
      title: updated[0].title,
      description: updated[0].description,
      posterUrl: updated[0].posterUrl,
      backdropUrl: updated[0].backdropUrl,
      genres: updated[0].genres ? JSON.parse(updated[0].genres) : [],
      rating: updated[0].rating,
      year: updated[0].year,
      source: updated[0].source,
      externalId: updated[0].externalId,
      updatedAt: updated[0].updatedAt,
    });
  });
};

export default metadataRoutes;
