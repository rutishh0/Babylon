'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { AnimeCard } from '@/components/AnimeCard';
import { useDownloadStore } from '@/stores/download-store';
import {
  searchAnime,
  getEpisodes,
  startDownload,
} from '@/lib/anime-api';
import type { AnimeSearchResult, EpisodeItem } from '@/lib/anime-api';

export default function DiscoverPage() {
  const { toast } = useToast();
  const downloadStore = useDownloadStore();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeSearchResult | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loadingEps, setLoadingEps] = useState(false);
  const [selectedEps, setSelectedEps] = useState<Set<number>>(new Set());
  const [lang, setLang] = useState('sub');
  const [quality, setQuality] = useState('best');

  // Initialize download store on mount
  useEffect(() => {
    downloadStore.initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAnime(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Select anime and load episodes
  const selectAnime = async (anime: AnimeSearchResult) => {
    setSelectedAnime(anime);
    setLoadingEps(true);
    setEpisodes([]);
    setSelectedEps(new Set());
    try {
      const data = await getEpisodes(anime.id, lang);
      setEpisodes(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load episodes', 'error');
    } finally {
      setLoadingEps(false);
    }
  };

  const toggleEp = (num: number) => {
    setSelectedEps((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEps.size === episodes.length) setSelectedEps(new Set());
    else setSelectedEps(new Set(episodes.map((e) => e.number)));
  };

  // Queue a download
  const queueDownload = useCallback(async () => {
    if (!selectedAnime || selectedEps.size === 0) return;
    const epList = Array.from(selectedEps).sort((a, b) => a - b);
    try {
      const data = await startDownload({
        anime_id: selectedAnime.id,
        episodes: epList,
        lang,
        quality,
        title: selectedAnime.title,
        cover_url: selectedAnime.cover_url,
        genres: selectedAnime.genres,
        description: selectedAnime.description,
        year: selectedAnime.year,
        episode_count: selectedAnime.episode_count,
        status: selectedAnime.status,
      });

      // Add to local store immediately
      downloadStore.addJob(data.job_id, {
        status: 'starting',
        progress: 0,
        total: epList.length,
        current: null,
        completed: [],
        errors: [],
        title: selectedAnime.title,
      });

      // Start polling
      downloadStore.pollJob(data.job_id);

      toast(`Queued ${epList.length} episodes of "${selectedAnime.title}"`, 'success');
      setSelectedEps(new Set());
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to queue', 'error');
    }
  }, [selectedAnime, selectedEps, lang, quality, downloadStore, toast]);

  const goBack = () => {
    setSelectedAnime(null);
    setEpisodes([]);
    setSelectedEps(new Set());
  };

  const queueEntries = Object.entries(downloadStore.queue);
  const activeCount = queueEntries.filter(([, j]) => j.status !== 'complete').length;

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Main content (left) */}
      <div className="flex-1 max-w-screen-lg mx-auto px-4 py-8">
        {selectedAnime ? (
          <>
            <button
              onClick={goBack}
              className="text-[#a0a0a0] hover:text-white mb-4 text-sm flex items-center gap-1 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to search
            </button>

            {/* Anime Header */}
            <div className="flex gap-4 mb-6">
              {selectedAnime.cover_url && (
                <img
                  src={selectedAnime.cover_url}
                  alt=""
                  className="w-24 h-36 object-cover rounded-lg shrink-0"
                />
              )}
              <div>
                <h1 className="text-white text-xl font-bold">{selectedAnime.title}</h1>
                <div className="flex items-center gap-2 mt-1 text-[#a0a0a0] text-sm">
                  {selectedAnime.year && <span>{selectedAnime.year}</span>}
                  {selectedAnime.episode_count && <span>{selectedAnime.episode_count} eps</span>}
                  {selectedAnime.status && <span className="capitalize">{selectedAnime.status}</span>}
                </div>
                {selectedAnime.description && (
                  <p className="text-[#a0a0a0] text-xs mt-2 line-clamp-3"
                     dangerouslySetInnerHTML={{
                       __html: selectedAnime.description
                         .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
                         .replace(/<br\s*\/?>/g, ' ')
                         .replace(/<[^>]*>/g, '')
                     }}
                  />
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(selectedAnime.languages || []).map((l) => (
                    <span
                      key={l}
                      className="text-xs bg-[#F47521]/20 text-[#F47521] px-2 py-0.5 rounded-full uppercase"
                    >
                      {l}
                    </span>
                  ))}
                  {(selectedAnime.genres || []).slice(0, 4).map((g) => (
                    <span
                      key={g}
                      className="text-xs border border-[#2a2c32] text-[#a0a0a0] px-2 py-0.5 rounded-full"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
                <input
                  type="checkbox"
                  checked={selectedEps.size === episodes.length && episodes.length > 0}
                  onChange={toggleAll}
                  className="accent-[#F47521]"
                />
                Select All
              </label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-[#141519] text-white border border-[#2a2c32] rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="sub">SUB</option>
                <option value="dub">DUB</option>
              </select>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="bg-[#141519] text-white border border-[#2a2c32] rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="best">Best</option>
                <option value="1080">1080p</option>
                <option value="720">720p</option>
                <option value="480">480p</option>
              </select>
              <button
                onClick={queueDownload}
                disabled={selectedEps.size === 0}
                className="bg-[#F47521] hover:bg-[#e06515] text-white px-5 py-1.5 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                Queue {selectedEps.size > 0 ? selectedEps.size : ''} Episode
                {selectedEps.size !== 1 ? 's' : ''}
              </button>
            </div>

            {/* Episode List */}
            {loadingEps ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid gap-1.5">
                {episodes.map((ep) => {
                  const sel = selectedEps.has(ep.number);
                  return (
                    <div
                      key={ep.number}
                      onClick={() => toggleEp(ep.number)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 cursor-pointer transition-colors border ${
                        sel
                          ? 'bg-[#F47521]/10 border-[#F47521]/40'
                          : 'bg-[#141519] border-[#2a2c32] hover:border-[#3a3c42]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        readOnly
                        className="accent-[#F47521] pointer-events-none"
                      />
                      <span className="text-white text-sm">Episode {ep.number}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-white text-2xl font-bold mb-6">Discover Anime</h1>
            <div className="relative mb-8">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a0a0a0]"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anime to download..."
                className="w-full bg-[#141519] text-white placeholder-[#a0a0a0] border border-[#2a2c32] rounded-full pl-12 pr-4 py-3 text-base focus:outline-none focus:border-[#F47521]"
                autoFocus
              />
            </div>

            {loading && (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && results.length > 0 && (
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
              >
                {results.map((item) => (
                  <AnimeCard
                    key={item.id}
                    anime={item}
                    variant="grid"
                    onClick={() => selectAnime(item)}
                  />
                ))}
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="flex flex-col items-center py-24 text-[#a0a0a0]">
                <p>No results for &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {!query && (
              <div className="flex flex-col items-center py-24 text-[#a0a0a0]">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mb-4 opacity-40"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p>Search for anime to download</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Download Queue Sidebar (right) */}
      <div className="w-80 shrink-0 border-l border-[#2a2c32] bg-[#0a0a0a] overflow-y-auto">
        <div className="px-4 py-4 border-b border-[#2a2c32] flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">
            Download Queue
            {activeCount > 0 && (
              <span className="ml-2 bg-[#F47521] text-white text-xs px-2 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
          </h2>
        </div>

        {queueEntries.length === 0 ? (
          <div className="px-4 py-12 text-center text-[#a0a0a0] text-sm">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto mb-3 opacity-30"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <p>No downloads queued</p>
            <p className="text-xs mt-1 text-[#666]">Search an anime, select episodes, and click Queue</p>
          </div>
        ) : (
          <div className="divide-y divide-[#141519]">
            {queueEntries.map(([jobId, job]) => {
              const pct = job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0;
              const isActive = job.status !== 'complete';
              const hasErrors = job.errors.length > 0;
              return (
                <div key={jobId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-white text-sm font-medium line-clamp-2">{job.title}</p>
                    {job.status === 'complete' ? (
                      <span className="text-green-400 text-[10px] shrink-0 mt-0.5">DONE</span>
                    ) : (
                      <span className="text-[#F47521] text-[10px] shrink-0 mt-0.5 animate-pulse">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#141519] rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        hasErrors
                          ? 'bg-yellow-500'
                          : job.status === 'complete'
                          ? 'bg-green-500'
                          : 'bg-[#F47521]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#a0a0a0]">
                    <span>
                      {isActive && job.current ? `Ep ${job.current}` : ''}
                      {!isActive ? `${job.completed.length} episodes` : ''}
                    </span>
                    <span>
                      {job.progress}/{job.total}
                    </span>
                  </div>

                  {hasErrors && (
                    <p className="text-red-400 text-[10px] mt-1 line-clamp-1">
                      {job.errors[job.errors.length - 1]}
                    </p>
                  )}

                  {job.completed.length > 0 && isActive && (
                    <p className="text-green-400/60 text-[10px] mt-0.5">
                      Done: {job.completed.join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
