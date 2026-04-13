// ── Types ──

export interface AnimeSearchResult {
  id: string;
  title: string;
  native_title: string | null;
  provider: string;
  languages: string[];
  year: number | null;
  episode_count: number | null;
  cover_url: string | null;
  description: string | null;
  genres: string[];
  status: string | null;
}

export interface EpisodeItem {
  anime_id: string;
  number: number;
  provider: string;
  language: string;
}

export interface StreamInfo {
  url: string;
  quality: string | null;
  format: string;
  referer: string | null;
  provider_name: string;
  subtitles: Array<{ url: string; language: string }>;
}

export interface DownloadJob {
  status: string;
  progress: number;
  total: number;
  current: number | null;
  completed: number[];
  errors: string[];
  title: string;
}

export interface LibraryAnime {
  id: string;
  title: string;
  cover_url: string | null;
  description: string | null;
  genres: string[];
  year: number | null;
  episode_count: number | null;
  status: string | null;
  languages: string[];
  episode_count_downloaded: number;
}

export interface DownloadedEpisode {
  episode_number: number;
  file_path: string;
  file_size: number | null;
  language: string;
  downloaded_at: string;
}

export interface LibraryAnimeDetail extends LibraryAnime {
  episodes: DownloadedEpisode[];
}

// ── API Functions ──

async function animeRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/anime${path}`, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  return res.json();
}

export function searchAnime(q: string): Promise<AnimeSearchResult[]> {
  return animeRequest(`/search?q=${encodeURIComponent(q)}`);
}

export function getEpisodes(animeId: string, lang = 'sub'): Promise<EpisodeItem[]> {
  return animeRequest(`/episodes?id=${encodeURIComponent(animeId)}&lang=${lang}`);
}

export function getStreamUrl(animeId: string, epNum: number, lang = 'sub', quality = 'best'): Promise<StreamInfo> {
  return animeRequest(`/stream?anime_id=${encodeURIComponent(animeId)}&ep=${epNum}&lang=${lang}&quality=${quality}`);
}

export async function startDownload(params: {
  anime_id: string;
  episodes: number[];
  lang: string;
  quality: string;
  title: string;
  cover_url?: string | null;
  genres?: string[];
  description?: string | null;
  year?: number | null;
  episode_count?: number | null;
  status?: string | null;
}): Promise<{ job_id: string }> {
  return animeRequest('/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export function getDownloadStatus(jobId?: string): Promise<Record<string, DownloadJob>> {
  const qs = jobId ? `?job_id=${jobId}` : '';
  return animeRequest(`/download/status${qs}`);
}

export function getLibrary(): Promise<LibraryAnime[]> {
  return animeRequest('/library');
}

export function getLibraryAnime(animeId: string): Promise<LibraryAnimeDetail> {
  return animeRequest(`/library/${encodeURIComponent(animeId)}`);
}

export function buildLocalStreamUrl(animeId: string, epNum: number): string {
  return `/api/anime/library/${encodeURIComponent(animeId)}/stream/${epNum}/web`;
}

// ── Discovery (Jikan/MAL) ──

export interface DiscoveryAnime {
  id: string;
  title: string;
  native_title: string | null;
  cover_url: string | null;
  year: number | null;
  episode_count: number | null;
  status: string | null;
  description: string | null;
  genres: string[];
  score: number | null;
  languages: string[];
  source: string;
}

export function getTrending(): Promise<DiscoveryAnime[]> {
  return animeRequest('/discover/trending');
}

export function getPopular(): Promise<DiscoveryAnime[]> {
  return animeRequest('/discover/popular');
}

export function getSeasonal(): Promise<DiscoveryAnime[]> {
  return animeRequest('/discover/seasonal');
}

export function getUpcoming(): Promise<DiscoveryAnime[]> {
  return animeRequest('/discover/upcoming');
}

export function getRecommended(): Promise<DiscoveryAnime[]> {
  return animeRequest('/discover/recommended');
}
