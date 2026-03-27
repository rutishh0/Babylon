import type { FastifyPluginAsync } from 'fastify';
import { eq, desc, isNull } from 'drizzle-orm';
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

const libraryRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/library/home — Aggregated home screen data
  app.get('/api/library/home', async (_request, reply) => {
    // continueWatching: incomplete progress items, ordered by lastWatchedAt desc, limit 20
    const progressRows = app.db
      .select()
      .from(watchProgress)
      .where(eq(watchProgress.completed, false))
      .orderBy(desc(watchProgress.lastWatchedAt))
      .limit(20)
      .all();

    const continueWatching = progressRows.map((prog) => {
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

    // recentlyAdded: all media ordered by createdAt desc, limit 20
    const recentlyAddedRows = app.db
      .select()
      .from(media)
      .orderBy(desc(media.createdAt))
      .limit(20)
      .all();

    const recentlyAdded = recentlyAddedRows.map(formatMedia);

    // genreRows: group all media by genre, each row has { genre, media[] } (max 20 per genre)
    const allMediaRows = app.db.select().from(media).all();

    const genreMap = new Map<string, ReturnType<typeof formatMedia>[]>();
    for (const row of allMediaRows) {
      const formatted = formatMedia(row);
      const genres: string[] = formatted.genres;
      for (const genre of genres) {
        if (!genreMap.has(genre)) {
          genreMap.set(genre, []);
        }
        genreMap.get(genre)!.push(formatted);
      }
    }

    // Sort by genre popularity (most media first), then cap each at 20
    const genreRows = Array.from(genreMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([genre, mediaItems]) => ({
        genre,
        media: mediaItems.slice(0, 20),
      }));

    return reply.send({ continueWatching, recentlyAdded, genreRows });
  });

  // GET /api/library/genres — Returns { genre, count }[] sorted by count desc
  app.get('/api/library/genres', async (_request, reply) => {
    const allMediaRows = app.db.select().from(media).all();

    const genreCountMap = new Map<string, number>();
    for (const row of allMediaRows) {
      const genres: string[] = row.genres ? JSON.parse(row.genres) : [];
      for (const genre of genres) {
        genreCountMap.set(genre, (genreCountMap.get(genre) ?? 0) + 1);
      }
    }

    const genres = Array.from(genreCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count }));

    return reply.send(genres);
  });
};

export default libraryRoutes;
