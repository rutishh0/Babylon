import type {
  MediaResponse,
  MediaType,
  ListMediaQuery,
  CreateMediaInput,
  UpdateMediaInput,
  UpdateProgressInput,
  InitiateUploadInput,
  CompleteUploadInput,
  HomeScreenResponse,
  IngestStatus,
  WatchlistEntry,
  AddToWatchlistInput,
  QueueIngestInput,
} from '@babylon/shared';

// ── Types ──────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface MetadataSearchResult {
  id: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  source: 'tmdb' | 'jikan';
  overview: string | null;
}

export interface JikanSearchResult {
  malId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  episodes: number | null;
  synopsis: string | null;
  genres: string[];
  inLibrary: boolean;
  libraryId: string | null;
}

// ── Helpers ────────────────────────────────────────────

function getPin(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('babylon-pin') ?? '';
  } catch {
    return '';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.internalrr.info/api';
  const url = `${baseUrl}${path}`;

  const pin = getPin();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (pin) {
    headers['X-Babylon-Pin'] = pin;
  }

  if (options.body && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.message ?? data.error ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ── Media ──────────────────────────────────────────────

export function listMedia(query?: Partial<ListMediaQuery>): Promise<MediaResponse[]> {
  const params = new URLSearchParams();
  if (query?.type) params.set('type', query.type);
  if (query?.genre) params.set('genre', query.genre);
  if (query?.q) params.set('q', query.q);
  if (query?.sort) params.set('sort', query.sort);
  if (query?.limit != null) params.set('limit', String(query.limit));
  if (query?.offset != null) params.set('offset', String(query.offset));
  const qs = params.toString();
  return request<MediaResponse[]>(`/media${qs ? `?${qs}` : ''}`);
}

export function getMedia(id: string): Promise<MediaResponse> {
  return request<MediaResponse>(`/media/${id}`);
}

export function createMedia(input: CreateMediaInput): Promise<MediaResponse> {
  return request<MediaResponse>('/media', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateMedia(id: string, input: UpdateMediaInput): Promise<MediaResponse> {
  return request<MediaResponse>(`/media/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteMedia(id: string): Promise<void> {
  return request<void>(`/media/${id}`, { method: 'DELETE' });
}

// ── Metadata ───────────────────────────────────────────

export function searchMetadata(q: string, type?: MediaType): Promise<MetadataSearchResult[]> {
  const params = new URLSearchParams({ q });
  if (type) params.set('type', type);
  return request<MetadataSearchResult[]>(`/metadata/search?${params}`);
}

export function applyMetadata(id: string): Promise<MediaResponse> {
  return request<MediaResponse>(`/metadata/apply/${id}`, { method: 'POST' });
}

// ── Upload ─────────────────────────────────────────────

export function initiateUpload(input: InitiateUploadInput): Promise<{ uploadUrl: string; s3Key: string }> {
  return request<{ uploadUrl: string; s3Key: string }>('/upload/initiate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function completeUpload(input: CompleteUploadInput): Promise<void> {
  return request<void>('/upload/complete', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ── Stream ─────────────────────────────────────────────

export function getStreamUrl(id: string, episodeId?: string): Promise<{ url: string }> {
  const params = episodeId ? `?episode_id=${encodeURIComponent(episodeId)}` : '';
  return request<{ url: string }>(`/stream/${id}${params}`);
}

export function getSubtitleUrl(id: string, episodeId: string, language: string): Promise<{ url: string }> {
  const params = new URLSearchParams({ episode_id: episodeId, language });
  return request<{ url: string }>(`/stream/${id}/subtitle?${params}`);
}

// ── Progress ───────────────────────────────────────────

export function getContinueWatching(): Promise<MediaResponse[]> {
  return request<MediaResponse[]>('/progress');
}

export function updateProgress(mediaId: string, input: UpdateProgressInput): Promise<void> {
  return request<void>(`/progress/${mediaId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteProgress(mediaId: string): Promise<void> {
  return request<void>(`/progress/${mediaId}`, { method: 'DELETE' });
}

// ── Library ────────────────────────────────────────────

export function getHomeScreen(): Promise<HomeScreenResponse> {
  return request<HomeScreenResponse>('/library/home');
}

export function getGenres(): Promise<Array<{ genre: string; count: number }>> {
  return request<Array<{ genre: string; count: number }>>('/library/genres');
}

// ── Ingest ─────────────────────────────────────────────

export function getIngestStatus(): Promise<IngestStatus> {
  return request<IngestStatus>('/ingest/status');
}

export function queueIngest(input: QueueIngestInput): Promise<void> {
  return request<void>('/ingest/queue', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function searchIngest(q: string): Promise<JikanSearchResult[]> {
  return request<JikanSearchResult[]>(`/ingest/search?q=${encodeURIComponent(q)}`);
}

export function getWatchlist(): Promise<WatchlistEntry[]> {
  return request<WatchlistEntry[]>('/ingest/watchlist');
}

export function addToWatchlist(input: AddToWatchlistInput): Promise<void> {
  return request<void>('/ingest/watchlist', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function removeFromWatchlist(title: string): Promise<void> {
  return request<void>(`/ingest/watchlist/${encodeURIComponent(title)}`, { method: 'DELETE' });
}

export function triggerIngest(): Promise<void> {
  return request<void>('/ingest/trigger', { method: 'POST' });
}
