// ── Movie Types (TamilMV) ──

export interface MovieListing {
  title: string;
  topic_url: string;
  parsed_title: string;
  year: number | null;
  languages: string[];
  quality_tag: string | null;
  resolutions: string[];
  file_size: string | null;
  has_esub: boolean;
}

export interface MovieVariant {
  magnet_url: string;
  resolution: string | null;
  quality_tag: string | null;
  file_size: string | null;
  languages: string[];
  has_esub: boolean;
  label: string;
}

export interface MovieDownloadJob {
  id: number;
  movie_id: string;
  title: string;
  status: string;
  progress: number;
  resolution: string | null;
  language: string | null;
}

// ── API Functions ──

async function movieRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/anime${path}`, options);  // proxied through Next.js rewrite
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  return res.json();
}

// Note: Next.js rewrites /api/anime/* to Flask localhost:5000/api/*
// So /api/anime/movies/browse -> Flask /api/movies/browse

export function browseMovies(language: string, forumType = 'webhd', page = 1): Promise<MovieListing[]> {
  return movieRequest(`/movies/browse?language=${language}&forum_type=${forumType}&page=${page}`);
}

export function searchMovies(query: string, language?: string): Promise<MovieListing[]> {
  const params = new URLSearchParams({ q: query });
  if (language) params.set('language', language);
  return movieRequest(`/movies/search?${params}`);
}

export function getMovieVariants(topicUrl: string): Promise<MovieVariant[]> {
  return movieRequest(`/movies/variants?topic_url=${encodeURIComponent(topicUrl)}`);
}

export function startMovieDownload(params: {
  magnet_url: string;
  title: string;
  year?: number | null;
  language?: string;
  resolution?: string;
  languages?: string[];
  quality_tag?: string;
  topic_url?: string;
}): Promise<{ job_id: number; torrent_hash: string; message: string }> {
  return movieRequest('/movies/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export function getMovieDownloadStatus(): Promise<Record<string, MovieDownloadJob>> {
  return movieRequest('/movies/download/status');
}

export function getMovieLibrary(): Promise<MovieListing[]> {
  return movieRequest('/movies/library');
}
