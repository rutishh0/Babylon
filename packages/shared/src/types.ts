import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────

export const MediaType = z.enum(['movie', 'series', 'anime']);
export type MediaType = z.infer<typeof MediaType>;

export const MetadataSource = z.enum(['tmdb', 'jikan', 'manual', 'ingest']);
export type MetadataSource = z.infer<typeof MetadataSource>;

export const SubtitleFormat = z.enum(['srt', 'vtt', 'ass']);
export type SubtitleFormat = z.infer<typeof SubtitleFormat>;

// ── Request Schemas ────────────────────────────────────

export const CreateMediaSchema = z.object({
  title: z.string().min(1),
  type: MediaType,
  description: z.string().optional(),
  posterUrl: z.string().optional(),
  backdropUrl: z.string().optional(),
  genres: z.array(z.string()).optional(),
  rating: z.number().min(0).max(10).optional(),
  year: z.number().int().optional(),
  source: MetadataSource.optional(),
  externalId: z.string().optional(),
});
export type CreateMediaInput = z.infer<typeof CreateMediaSchema>;

export const UpdateMediaSchema = CreateMediaSchema.partial();
export type UpdateMediaInput = z.infer<typeof UpdateMediaSchema>;

export const ListMediaQuerySchema = z.object({
  type: MediaType.optional(),
  genre: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['title', 'year', 'rating', 'created_at']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListMediaQuery = z.infer<typeof ListMediaQuerySchema>;

export const UpdateProgressSchema = z.object({
  episodeId: z.string().optional(),
  positionSeconds: z.number().min(0),
  durationSeconds: z.number().min(0),
});
export type UpdateProgressInput = z.infer<typeof UpdateProgressSchema>;

export const InitiateUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  mediaId: z.string().min(1),
  type: MediaType,
  seasonNumber: z.number().int().optional(),
  episodeNumber: z.number().int().optional(),
});
export type InitiateUploadInput = z.infer<typeof InitiateUploadSchema>;

export const CompleteUploadSchema = z.object({
  s3Key: z.string().min(1),
  mediaId: z.string().min(1),
  fileSize: z.number().int().optional(),
  duration: z.number().int().optional(),
  format: z.string().optional(),
  originalFilename: z.string().optional(),
  episodeId: z.string().optional(),
});
export type CompleteUploadInput = z.infer<typeof CompleteUploadSchema>;

export const AddToWatchlistSchema = z.object({
  title: z.string().min(1),
  aliases: z.array(z.string()).optional().default([]),
  season: z.number().int().optional().default(1),
});
export type AddToWatchlistInput = z.infer<typeof AddToWatchlistSchema>;

export const QueueIngestSchema = z.object({
  title: z.string().min(1),
  nyaaQuery: z.string().optional(),
});
export type QueueIngestInput = z.infer<typeof QueueIngestSchema>;

// ── Response Types ─────────────────────────────────────

export interface MediaResponse {
  id: string;
  title: string;
  type: MediaType;
  description: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  rating: number | null;
  year: number | null;
  source: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
  seasons?: SeasonResponse[];
  mediaFile?: MediaFileResponse | null;
  progress?: ProgressResponse | null;
}

export interface SeasonResponse {
  id: string;
  seasonNumber: number;
  title: string | null;
  episodes: EpisodeResponse[];
}

export interface EpisodeResponse {
  id: string;
  episodeNumber: number;
  title: string | null;
  duration: number | null;
  thumbnailUrl: string | null;
  s3Key: string | null;
  fileSize: number | null;
  format: string | null;
  progress?: ProgressResponse | null;
}

export interface MediaFileResponse {
  id: string;
  s3Key: string;
  fileSize: number | null;
  duration: number | null;
  format: string | null;
}

export interface ProgressResponse {
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface SubtitleResponse {
  id: string;
  language: string;
  label: string;
  format: string;
}

export interface WatchlistEntry {
  title: string;
  aliases: string[];
  mode: 'rss' | 'backlog';
  season: number;
  addedAt: string;
}

export interface IngestStatus {
  running: boolean;
  lastPollAt: string | null;
  currentTask: {
    title: string;
    state: 'searching' | 'downloading' | 'transcoding' | 'uploading' | 'done';
    progress: number;
  } | null;
  queue: Array<{
    title: string;
    state: 'pending' | 'searching' | 'downloading' | 'transcoding' | 'uploading' | 'done' | 'failed';
    progress: number;
  }>;
}

export interface HomeScreenResponse {
  continueWatching: MediaResponse[];
  recentlyAdded: MediaResponse[];
  genreRows: Array<{
    genre: string;
    media: MediaResponse[];
  }>;
}
