import type {
  MediaResponse,
  CreateMediaInput,
  ListMediaQuery,
  IngestStatus,
  WatchlistEntry,
  AddToWatchlistInput,
} from '@babylon/shared';
import { readConfig } from './config.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cfg = await readConfig();
  const url = `${cfg.apiUrl.replace(/\/$/, '')}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (cfg.pin) {
    headers['X-Babylon-Pin'] = cfg.pin;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      // ignore parse error, use status message
    }
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface InitiateUploadResponse {
  uploadUrl: string;
  s3Key: string;
}

export interface InitiateUploadRequest {
  filename: string;
  contentType: string;
  mediaId: string;
  type: 'movie' | 'series' | 'anime';
  seasonNumber?: number;
  episodeNumber?: number;
}

export async function initiateUpload(
  body: InitiateUploadRequest
): Promise<InitiateUploadResponse> {
  return request<InitiateUploadResponse>('/upload/initiate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface CompleteUploadRequest {
  s3Key: string;
  mediaId: string;
  fileSize?: number;
  duration?: number;
  format?: string;
  originalFilename?: string;
  episodeId?: string;
}

export async function completeUpload(body: CompleteUploadRequest): Promise<void> {
  await request<void>('/upload/complete', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Media CRUD ────────────────────────────────────────────────────────────────

export async function createMedia(body: CreateMediaInput): Promise<MediaResponse> {
  return request<MediaResponse>('/media', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listMedia(params: Partial<ListMediaQuery> = {}): Promise<MediaResponse[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request<MediaResponse[]>(`/media${query}`);
}

export async function getMedia(id: string): Promise<MediaResponse> {
  return request<MediaResponse>(`/media/${id}`);
}

export async function deleteMedia(id: string): Promise<void> {
  await request<void>(`/media/${id}`, { method: 'DELETE' });
}

export async function searchMetadata(
  q: string,
  type?: 'movie' | 'series' | 'anime'
): Promise<MediaResponse[]> {
  const qs = new URLSearchParams({ q });
  if (type) qs.set('type', type);
  return request<MediaResponse[]>(`/metadata/search?${qs.toString()}`);
}

// ── Ingest ────────────────────────────────────────────────────────────────────

export async function getIngestStatus(): Promise<IngestStatus> {
  return request<IngestStatus>('/ingest/status');
}

export async function getWatchlist(): Promise<WatchlistEntry[]> {
  return request<WatchlistEntry[]>('/ingest/watchlist');
}

export async function addToWatchlist(body: AddToWatchlistInput): Promise<void> {
  await request<void>('/ingest/watchlist', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function removeFromWatchlist(title: string): Promise<void> {
  await request<void>(`/ingest/watchlist/${encodeURIComponent(title)}`, {
    method: 'DELETE',
  });
}

export async function triggerIngest(): Promise<void> {
  await request<void>('/ingest/trigger', { method: 'POST' });
}
