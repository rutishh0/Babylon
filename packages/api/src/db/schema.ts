import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type', { enum: ['movie', 'series', 'anime'] }).notNull(),
  description: text('description'),
  posterUrl: text('poster_url'),
  backdropUrl: text('backdrop_url'),
  genres: text('genres'),
  rating: real('rating'),
  year: integer('year'),
  source: text('source', { enum: ['tmdb', 'jikan', 'manual', 'ingest'] }),
  externalId: text('external_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const season = sqliteTable('season', {
  id: text('id').primaryKey(),
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  seasonNumber: integer('season_number').notNull(),
  title: text('title'),
});

export const episode = sqliteTable('episode', {
  id: text('id').primaryKey(),
  seasonId: text('season_id').notNull().references(() => season.id, { onDelete: 'cascade' }),
  episodeNumber: integer('episode_number').notNull(),
  title: text('title'),
  duration: integer('duration'),
  thumbnailUrl: text('thumbnail_url'),
  s3Key: text('s3_key'),
  fileSize: integer('file_size'),
  format: text('format'),
  originalFilename: text('original_filename'),
});

export const mediaFile = sqliteTable('media_file', {
  id: text('id').primaryKey(),
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  s3Key: text('s3_key').notNull(),
  fileSize: integer('file_size'),
  duration: integer('duration'),
  format: text('format'),
  originalFilename: text('original_filename'),
});

export const subtitle = sqliteTable('subtitle', {
  id: text('id').primaryKey(),
  mediaFileId: text('media_file_id').references(() => mediaFile.id, { onDelete: 'cascade' }),
  episodeId: text('episode_id').references(() => episode.id, { onDelete: 'cascade' }),
  language: text('language').notNull(),
  label: text('label').notNull(),
  s3Key: text('s3_key').notNull(),
  format: text('format', { enum: ['srt', 'vtt', 'ass'] }).notNull(),
});

export const watchProgress = sqliteTable('watch_progress', {
  id: text('id').primaryKey(),
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  episodeId: text('episode_id').references(() => episode.id, { onDelete: 'cascade' }),
  positionSeconds: real('position_seconds').notNull(),
  durationSeconds: real('duration_seconds').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  lastWatchedAt: text('last_watched_at').notNull(),
});

export const ingestSeen = sqliteTable(
  'ingest_seen',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    episode: text('episode').notNull(),
    torrentHash: text('torrent_hash'),
    processedAt: text('processed_at').notNull(),
  },
  (table) => [index('idx_ingest_seen_title_episode').on(table.title, table.episode)]
);

export const ingestFailed = sqliteTable('ingest_failed', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  reason: text('reason'),
  failedAt: text('failed_at').notNull(),
});
