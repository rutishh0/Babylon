'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getLibraryAnime, getEpisodes, buildLocalStreamUrl } from '@/lib/anime-api';
import type { LibraryAnimeDetail, EpisodeItem } from '@/lib/anime-api';

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const animeId = decodeURIComponent(params.id as string);
  const epNum = parseFloat(searchParams.get('ep') || '1');

  const [anime, setAnime] = useState<LibraryAnimeDetail | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [currentEp, setCurrentEp] = useState(epNum);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [detail, eps] = await Promise.all([
          getLibraryAnime(animeId).catch(() => null),
          getEpisodes(animeId).catch(() => []),
        ]);
        setAnime(detail);
        setEpisodes(eps);
        if (!detail) setError('Anime not found in library.');
      } catch {
        setError('Failed to load.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [animeId]);

  // Check if current episode is downloaded
  const downloadedEps = new Set((anime?.episodes || []).map(e => e.episode_number));
  const isDownloaded = downloadedEps.has(currentEp);

  // Stream URL — serve from Flask library endpoint
  const streamUrl = buildLocalStreamUrl(animeId, currentEp);

  // Save to watch history
  useEffect(() => {
    if (!anime || !isDownloaded) return;
    try {
      const key = 'babylon-watch-history';
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      // Remove existing entry for this episode
      const filtered = history.filter((h: any) => !(h.animeId === animeId && h.episodeNumber === currentEp));
      filtered.unshift({
        animeId,
        animeTitle: anime.title,
        episodeNumber: currentEp,
        coverUrl: anime.cover_url,
        watchedAt: new Date().toISOString(),
        progress: 0,
      });
      // Keep last 100 entries
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 100)));
    } catch { /* silent */ }
  }, [animeId, currentEp, anime, isDownloaded]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <p className="text-[#a0a0a0]">{error || 'Not found'}</p>
        <Link href="/anime" className="text-[#F47521] hover:underline">Back to Library</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#141519]">
        <Link href={`/anime/${animeId}`} className="text-white hover:text-[#F47521] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-white text-sm font-medium">{anime.title}</h1>
          <p className="text-[#a0a0a0] text-xs">Episode {currentEp}</p>
        </div>
      </div>

      {/* Video Player */}
      <div className="w-full bg-black" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
        {isDownloaded ? (
          <video
            key={`${animeId}-${currentEp}`}
            src={streamUrl}
            controls
            autoPlay
            className="w-full h-full"
            style={{ backgroundColor: '#000' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#a0a0a0]">
            <p>Episode {currentEp} is not downloaded yet.</p>
          </div>
        )}
      </div>

      {/* Episode Info */}
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h2 className="text-white text-lg font-semibold mb-1">
          Episode {currentEp}
        </h2>
        <p className="text-[#a0a0a0] text-sm mb-4">{anime.title}</p>

        {/* Episode Selector */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {(episodes.length > 0 ? episodes : (anime.episodes || []).map(e => ({ number: e.episode_number } as any))).map((ep: any) => {
            const num = ep.number ?? ep.episode_number;
            const isDl = downloadedEps.has(num);
            return (
              <button
                key={num}
                onClick={() => setCurrentEp(num)}
                className={`shrink-0 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  num === currentEp
                    ? 'bg-[#F47521] text-white'
                    : isDl
                      ? 'bg-[#23252b] text-white hover:bg-[#2a2c32]'
                      : 'bg-[#141519] text-[#a0a0a0] hover:bg-[#23252b]'
                }`}
              >
                Ep {num}
                {isDl && num !== currentEp && <span className="ml-1 text-green-400 text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
