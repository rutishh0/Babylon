'use client';

import { useState, useEffect } from 'react';
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

interface StreamData {
  url: string;
  quality: string | null;
  format: string;
  referer: string | null;
  provider_name: string;
  subtitles: Array<{ url: string; language: string }>;
}

export default function DiscoverPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeResult | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loadingEps, setLoadingEps] = useState(false);
  const [streamingEp, setStreamingEp] = useState<number | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [playerEp, setPlayerEp] = useState<number | null>(null);

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

  const selectAnime = async (anime: AnimeResult) => {
    setSelectedAnime(anime);
    setLoadingEps(true);
    setEpisodes([]);
    setPlayerUrl(null);
    setPlayerEp(null);
    try {
      const res = await fetch(`/api/anime/episodes?id=${encodeURIComponent(anime.id)}&lang=sub`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEpisodes(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load episodes', 'error');
    } finally {
      setLoadingEps(false);
    }
  };

  const watchEpisode = async (ep: EpisodeItem) => {
    setStreamingEp(ep.number);
    try {
      const res = await fetch(
        `/api/anime/stream?anime_id=${encodeURIComponent(ep.anime_id)}&ep=${ep.number}&lang=sub&quality=best`
      );
      const data: StreamData = await res.json();
      if (data.url) {
        setPlayerUrl(data.url);
        setPlayerEp(ep.number);
      } else {
        toast('No stream found for this episode', 'error');
      }
    } catch {
      toast('Failed to get stream', 'error');
    } finally {
      setStreamingEp(null);
    }
  };

  const goBack = () => {
    setSelectedAnime(null);
    setEpisodes([]);
    setPlayerUrl(null);
    setPlayerEp(null);
  };

  // ── Episode + Player View ──
  if (selectedAnime) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <button onClick={goBack} className="text-[#a0a0a0] hover:text-white mb-4 text-sm flex items-center gap-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to search
        </button>

        {/* Anime Header */}
        <div className="flex gap-4 mb-6">
          {selectedAnime.cover_url && (
            <img src={selectedAnime.cover_url} alt="" className="w-24 h-36 object-cover rounded-lg" />
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
            {selectedAnime.description && (
              <p className="text-[#a0a0a0] text-sm mt-3 line-clamp-3">{selectedAnime.description}</p>
            )}
          </div>
        </div>

        {/* Embedded Player */}
        {playerUrl && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-semibold">Now Playing: Episode {playerEp}</h2>
              <button onClick={() => { setPlayerUrl(null); setPlayerEp(null); }} className="text-[#a0a0a0] hover:text-white text-sm">Close Player</button>
            </div>
            <video
              key={playerUrl}
              src={playerUrl}
              controls
              autoPlay
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '70vh' }}
            />
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
            {episodes.map((ep) => (
              <div key={ep.number} className="flex items-center gap-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3">
                <span className="text-white font-medium w-24">Ep {ep.number}</span>
                <div className="flex-1" />
                <button
                  onClick={() => watchEpisode(ep)}
                  disabled={streamingEp === ep.number}
                  className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
                    playerEp === ep.number
                      ? 'bg-green-700/20 text-green-400 border border-green-700/40'
                      : 'bg-accent hover:bg-red-700 text-white'
                  } disabled:opacity-50`}
                >
                  {streamingEp === ep.number ? (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : playerEp === ep.number ? (
                    'Playing'
                  ) : (
                    'Watch'
                  )}
                </button>
              </div>
            ))}
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
          placeholder="Search anime..."
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
          <p>Search for anime to stream</p>
        </div>
      )}
    </div>
  );
}
