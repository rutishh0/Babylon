'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/Toast';

interface AnimeResult {
  id: string;
  title: string;
  provider: string;
  languages: string[];
  year: number | null;
  episode_count: number | null;
  cover_url: string | null;
  description: string | null;
  genres: string[];
  status: string | null;
}

interface EpisodeItem {
  anime_id: string;
  number: number;
  provider: string;
  language: string;
}

interface DownloadJob {
  status: string;
  progress: number;
  total: number;
  current: number | null;
  completed: number[];
  errors: string[];
  title: string;
}

export default function DiscoverPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeResult | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loadingEps, setLoadingEps] = useState(false);
  const [selectedEps, setSelectedEps] = useState<Set<number>>(new Set());
  const [lang, setLang] = useState('sub');
  const [quality, setQuality] = useState('best');

  // Queue: all download jobs tracked by ID
  const [queue, setQueue] = useState<Record<string, DownloadJob>>({});
  const pollTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Select anime
  const selectAnime = async (anime: AnimeResult) => {
    setSelectedAnime(anime);
    setLoadingEps(true);
    setEpisodes([]);
    setSelectedEps(new Set());
    try {
      const res = await fetch(`/api/anime/episodes?id=${encodeURIComponent(anime.id)}&lang=${lang}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEpisodes(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load episodes', 'error');
    } finally { setLoadingEps(false); }
  };

  const toggleEp = (num: number) => {
    setSelectedEps((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEps.size === episodes.length) setSelectedEps(new Set());
    else setSelectedEps(new Set(episodes.map((e) => e.number)));
  };

  // Poll a single job
  const pollJob = useCallback((jobId: string) => {
    const run = async () => {
      try {
        const res = await fetch(`/api/anime/download/status?job_id=${jobId}`);
        const job: DownloadJob = await res.json();
        setQueue((prev) => ({ ...prev, [jobId]: job }));
        if (job.status !== 'complete') {
          pollTimers.current[jobId] = setTimeout(() => pollJob(jobId), 2000);
        } else {
          delete pollTimers.current[jobId];
        }
      } catch { /* silent */ }
    };
    run();
  }, []);

  // Queue a download — doesn't block the UI, goes straight to sidebar
  const queueDownload = async () => {
    if (!selectedAnime || selectedEps.size === 0) return;
    const epList = Array.from(selectedEps).sort((a, b) => a - b);
    try {
      const res = await fetch('/api/anime/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anime_id: selectedAnime.id,
          episodes: epList,
          lang, quality,
          title: selectedAnime.title,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Add to local queue immediately
      setQueue((prev) => ({
        ...prev,
        [data.job_id]: {
          status: 'starting',
          progress: 0,
          total: epList.length,
          current: null,
          completed: [],
          errors: [],
          title: selectedAnime.title,
        },
      }));

      // Start polling
      pollJob(data.job_id);

      toast(`Queued ${epList.length} episodes of "${selectedAnime.title}"`, 'success');
      setSelectedEps(new Set());
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to queue', 'error');
    }
  };

  const goBack = () => {
    setSelectedAnime(null);
    setEpisodes([]);
    setSelectedEps(new Set());
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      Object.values(pollTimers.current).forEach(clearTimeout);
    };
  }, []);

  const queueEntries = Object.entries(queue);
  const activeCount = queueEntries.filter(([, j]) => j.status !== 'complete').length;

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* ── Main content (left) ── */}
      <div className="flex-1 max-w-screen-lg mx-auto px-4 py-8">
        {selectedAnime ? (
          <>
            <button onClick={goBack} className="text-[#a0a0a0] hover:text-white mb-4 text-sm flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to search
            </button>

            {/* Anime Header */}
            <div className="flex gap-4 mb-6">
              {selectedAnime.cover_url && (
                <img src={selectedAnime.cover_url} alt="" className="w-24 h-36 object-cover rounded-lg shrink-0" />
              )}
              <div>
                <h1 className="text-white text-xl font-bold">{selectedAnime.title}</h1>
                <div className="flex items-center gap-2 mt-1 text-[#a0a0a0] text-sm">
                  {selectedAnime.year && <span>{selectedAnime.year}</span>}
                  {selectedAnime.episode_count && <span>{selectedAnime.episode_count} eps</span>}
                  {selectedAnime.status && <span>{selectedAnime.status}</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedAnime.languages.map((l) => (
                    <span key={l} className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full uppercase">{l}</span>
                  ))}
                  {selectedAnime.genres.slice(0, 4).map((g) => (
                    <span key={g} className="text-xs border border-[#2a2a3e] text-[#a0a0a0] px-2 py-0.5 rounded-full">{g}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
                <input type="checkbox" checked={selectedEps.size === episodes.length && episodes.length > 0}
                  onChange={toggleAll} className="accent-[#e53935]" />
                Select All
              </label>
              <select value={lang} onChange={(e) => setLang(e.target.value)}
                className="bg-[#1a1a2e] text-white border border-[#2a2a3e] rounded-lg px-3 py-1.5 text-sm">
                <option value="sub">SUB</option><option value="dub">DUB</option>
              </select>
              <select value={quality} onChange={(e) => setQuality(e.target.value)}
                className="bg-[#1a1a2e] text-white border border-[#2a2a3e] rounded-lg px-3 py-1.5 text-sm">
                <option value="best">Best</option><option value="1080">1080p</option>
                <option value="720">720p</option><option value="480">480p</option>
              </select>
              <button onClick={queueDownload} disabled={selectedEps.size === 0}
                className="bg-accent hover:bg-red-700 text-white px-5 py-1.5 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors">
                Queue {selectedEps.size > 0 ? selectedEps.size : ''} Episode{selectedEps.size !== 1 ? 's' : ''}
              </button>
            </div>

            {/* Episode List */}
            {loadingEps ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid gap-1.5">
                {episodes.map((ep) => {
                  const sel = selectedEps.has(ep.number);
                  return (
                    <div key={ep.number} onClick={() => toggleEp(ep.number)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 cursor-pointer transition-colors border ${
                        sel ? 'bg-accent/10 border-accent/40' : 'bg-[#1a1a2e] border-[#2a2a3e] hover:border-[#3a3a4e]'
                      }`}>
                      <input type="checkbox" checked={sel} readOnly className="accent-[#e53935] pointer-events-none" />
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
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a0a0a0]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anime to download..."
                className="w-full bg-[#1a1a2e] text-white placeholder-[#a0a0a0] border border-[#2a2a3e] rounded-full pl-12 pr-4 py-3 text-base focus:outline-none focus:border-accent"
                autoFocus />
            </div>

            {loading && (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {results.map((item) => (
                  <div key={item.id} onClick={() => selectAnime(item)}
                    className="bg-[#1a1a2e] rounded-lg overflow-hidden border border-[#2a2a3e] hover:border-accent cursor-pointer transition-colors flex flex-col">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt={item.title} className="w-full object-cover" style={{ aspectRatio: '2/3' }} />
                    ) : (
                      <div className="w-full bg-[#2a2a3e]" style={{ aspectRatio: '2/3' }} />
                    )}
                    <div className="p-3 flex-1 flex flex-col">
                      <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">{item.title}</h3>
                      <div className="flex items-center gap-2 text-[#a0a0a0] text-xs mb-1">
                        {item.year && <span>{item.year}</span>}
                        {item.episode_count && <span>{item.episode_count} eps</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.languages.map((l) => (
                          <span key={l} className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full uppercase">{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p>Search for anime to download</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Download Queue Sidebar (right) ── */}
      <div className="w-80 shrink-0 border-l border-[#2a2a3e] bg-[#0d0d1a] overflow-y-auto">
        <div className="px-4 py-4 border-b border-[#2a2a3e] flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">
            Download Queue
            {activeCount > 0 && (
              <span className="ml-2 bg-accent text-white text-xs px-2 py-0.5 rounded-full">{activeCount}</span>
            )}
          </h2>
        </div>

        {queueEntries.length === 0 ? (
          <div className="px-4 py-12 text-center text-[#a0a0a0] text-sm">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-30">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <p>No downloads queued</p>
            <p className="text-xs mt-1 text-[#666]">Search an anime, select episodes, and click Queue</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a2e]">
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
                      <span className="text-accent text-[10px] shrink-0 mt-0.5 animate-pulse">ACTIVE</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${hasErrors ? 'bg-yellow-500' : job.status === 'complete' ? 'bg-green-500' : 'bg-accent'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#a0a0a0]">
                    <span>
                      {isActive && job.current ? `Ep ${job.current}` : ''}
                      {!isActive ? `${job.completed.length} episodes` : ''}
                    </span>
                    <span>{job.progress}/{job.total}</span>
                  </div>

                  {hasErrors && (
                    <p className="text-red-400 text-[10px] mt-1 line-clamp-1">{job.errors[job.errors.length - 1]}</p>
                  )}

                  {job.completed.length > 0 && isActive && (
                    <p className="text-green-400/60 text-[10px] mt-0.5">Done: {job.completed.join(', ')}</p>
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
