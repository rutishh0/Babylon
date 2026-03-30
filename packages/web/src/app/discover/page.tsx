'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [downloading, setDownloading] = useState(false);
  const [downloadJob, setDownloadJob] = useState<DownloadJob | null>(null);
  const [lang, setLang] = useState('sub');
  const [quality, setQuality] = useState('best');

  // Search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Select anime → load episodes
  const selectAnime = async (anime: AnimeResult) => {
    setSelectedAnime(anime);
    setLoadingEps(true);
    setEpisodes([]);
    setSelectedEps(new Set());
    setDownloadJob(null);
    try {
      const res = await fetch(`/api/anime/episodes?id=${encodeURIComponent(anime.id)}&lang=${lang}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEpisodes(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load episodes', 'error');
    } finally {
      setLoadingEps(false);
    }
  };

  // Toggle episode selection
  const toggleEp = (num: number) => {
    setSelectedEps((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  // Select/deselect all
  const toggleAll = () => {
    if (selectedEps.size === episodes.length) {
      setSelectedEps(new Set());
    } else {
      setSelectedEps(new Set(episodes.map((e) => e.number)));
    }
  };

  // Batch download
  const startDownload = async () => {
    if (!selectedAnime || selectedEps.size === 0) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/anime/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anime_id: selectedAnime.id,
          episodes: Array.from(selectedEps).sort((a, b) => a - b),
          lang,
          quality,
          title: selectedAnime.title,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      pollDownload(data.job_id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Download failed', 'error');
      setDownloading(false);
    }
  };

  // Poll download progress
  const pollDownload = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/anime/download/status?job_id=${jobId}`);
      const job: DownloadJob = await res.json();
      setDownloadJob(job);
      if (job.status !== 'complete') {
        setTimeout(() => pollDownload(jobId), 2000);
      } else {
        setDownloading(false);
        toast(`Downloaded ${job.completed.length} episodes!`, 'success');
      }
    } catch {
      setDownloading(false);
    }
  }, [toast]);

  const goBack = () => {
    setSelectedAnime(null);
    setEpisodes([]);
    setSelectedEps(new Set());
    setDownloadJob(null);
    setDownloading(false);
  };

  // ── Episode List + Download View ──
  if (selectedAnime) {
    const pct = downloadJob && downloadJob.total > 0
      ? Math.round((downloadJob.progress / downloadJob.total) * 100) : 0;

    return (
      <div className="max-w-screen-xl mx-auto px-4 py-8">
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
            <h1 className="text-white text-2xl font-bold">{selectedAnime.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-[#a0a0a0] text-sm">
              {selectedAnime.year && <span>{selectedAnime.year}</span>}
              {selectedAnime.episode_count && <span>{selectedAnime.episode_count} episodes</span>}
              {selectedAnime.status && <span>{selectedAnime.status}</span>}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedAnime.languages.map((l) => (
                <span key={l} className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full uppercase">{l}</span>
              ))}
              {selectedAnime.genres.slice(0, 5).map((g) => (
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
            <option value="sub">SUB</option>
            <option value="dub">DUB</option>
          </select>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}
            className="bg-[#1a1a2e] text-white border border-[#2a2a3e] rounded-lg px-3 py-1.5 text-sm">
            <option value="best">Best Quality</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
          </select>
          <button
            onClick={startDownload}
            disabled={selectedEps.size === 0 || downloading}
            className="bg-accent hover:bg-red-700 text-white px-5 py-1.5 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {downloading ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Downloading...
              </>
            ) : (
              `Download ${selectedEps.size > 0 ? selectedEps.size : ''} Episode${selectedEps.size !== 1 ? 's' : ''}`
            )}
          </button>
        </div>

        {/* Download Progress */}
        {downloadJob && (
          <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white">
                {downloadJob.status === 'complete' ? 'Download complete' : `Downloading episode ${downloadJob.current || '...'}`}
              </span>
              <span className="text-[#a0a0a0]">{downloadJob.progress}/{downloadJob.total}</span>
            </div>
            <div className="w-full h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            {downloadJob.completed.length > 0 && (
              <p className="text-green-400 text-xs mt-2">Completed: episodes {downloadJob.completed.join(', ')}</p>
            )}
            {downloadJob.errors.length > 0 && (
              <p className="text-red-400 text-xs mt-2">Errors: {downloadJob.errors.join('; ')}</p>
            )}
          </div>
        )}

        {/* Episode List */}
        <h2 className="text-white font-semibold mb-3">
          Episodes {episodes.length > 0 ? `(${episodes.length})` : ''}
        </h2>

        {loadingEps ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : episodes.length === 0 ? (
          <p className="text-[#a0a0a0] text-sm py-4">No episodes found</p>
        ) : (
          <div className="grid gap-2">
            {episodes.map((ep) => {
              const isSelected = selectedEps.has(ep.number);
              const isCompleted = downloadJob?.completed.includes(ep.number);
              return (
                <div
                  key={ep.number}
                  onClick={() => toggleEp(ep.number)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors border ${
                    isCompleted ? 'bg-green-900/20 border-green-700/40' :
                    isSelected ? 'bg-accent/10 border-accent/40' :
                    'bg-[#1a1a2e] border-[#2a2a3e] hover:border-[#3a3a4e]'
                  }`}
                >
                  <input type="checkbox" checked={isSelected} readOnly className="accent-[#e53935] pointer-events-none" />
                  <span className="text-white font-medium">Episode {ep.number}</span>
                  {isCompleted && <span className="text-green-400 text-xs ml-auto">Downloaded</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Search View ──
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <h1 className="text-white text-2xl font-bold mb-6">Discover Anime</h1>

      <div className="relative mb-8">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a0a0a0]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anime to download..."
          className="w-full bg-[#1a1a2e] text-white placeholder-[#a0a0a0] border border-[#2a2a3e] rounded-full pl-12 pr-4 py-3 text-base focus:outline-none focus:border-accent"
          autoFocus
        />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => selectAnime(item)}
              className="bg-[#1a1a2e] rounded-lg overflow-hidden border border-[#2a2a3e] hover:border-accent cursor-pointer transition-colors flex flex-col"
            >
              {item.cover_url ? (
                <img src={item.cover_url} alt={item.title} className="w-full object-cover" style={{ aspectRatio: '2/3' }} />
              ) : (
                <div className="w-full bg-[#2a2a3e]" style={{ aspectRatio: '2/3' }} />
              )}
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">{item.title}</h3>
                <div className="flex items-center gap-2 text-[#a0a0a0] text-xs mb-2">
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
        <div className="flex flex-col items-center justify-center py-24 text-[#a0a0a0]">
          <p>No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!query && (
        <div className="flex flex-col items-center justify-center py-24 text-[#a0a0a0]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>Search for anime to download</p>
        </div>
      )}
    </div>
  );
}
