'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLibrary } from '@/lib/anime-api';
import type { LibraryAnime } from '@/lib/anime-api';
import { AnimeCard } from '@/components/AnimeCard';

export default function AnimePage() {
  const [library, setLibrary] = useState<LibraryAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sub' | 'dub'>('all');

  useEffect(() => {
    getLibrary()
      .then(setLibrary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = library.filter((anime) => {
    if (filter === 'all') return true;
    const langs = anime.languages || [];
    return langs.some((l) => l.toLowerCase() === filter);
  });

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      <div className="px-4 md:px-8 lg:px-12 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Anime Library</h1>
          <span className="text-[#a0a0a0] text-sm">{library.length} titles</span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-8">
          {(['all', 'sub', 'dub'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-[#F47521] text-white'
                  : 'bg-[#23252b] text-[#a0a0a0] hover:text-white border border-[#2a2c32]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'sub' ? 'Subtitled' : 'Dubbed'}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} variant="grid" />
            ))}
          </div>
        ) : library.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-[#23252b] mb-6"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <h2 className="text-xl font-medium text-white mb-2">Your library is empty</h2>
            <p className="text-[#a0a0a0] mb-6">Start downloading anime to build your collection.</p>
            <Link
              href="/discover"
              className="bg-[#F47521] hover:bg-[#e06515] text-white px-6 py-2.5 rounded-sm font-medium transition-colors"
            >
              Discover Anime
            </Link>
          </div>
        ) : (
          <div className="text-center py-16 text-[#a0a0a0]">
            <p>No anime match the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
