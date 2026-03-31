'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLibrary } from '@/lib/anime-api';
import type { LibraryAnime } from '@/lib/anime-api';
import HeroCarousel from '@/components/HeroCarousel';
import AnimeCarousel from '@/components/AnimeCarousel';

export default function HomePage() {
  const [library, setLibrary] = useState<LibraryAnime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLibrary()
      .then((data) => setLibrary(Array.isArray(data) ? data : []))
      .catch(() => setLibrary([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (library.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-white text-3xl font-bold mb-4">Welcome to Babylon</h1>
        <p className="text-[#a0a0a0] mb-8 max-w-md">
          Your personal anime streaming platform. Start by discovering and downloading anime.
        </p>
        <Link
          href="/discover"
          className="bg-[#F47521] hover:bg-[#e06520] text-white px-8 py-3 rounded-sm font-semibold text-lg transition-colors"
        >
          Discover Anime
        </Link>
      </div>
    );
  }

  const heroAnime = library.slice(0, 5);
  const recentlyDownloaded = library.slice(0, 12);

  // Group by genre
  const genreMap = new Map<string, LibraryAnime[]>();
  for (const anime of library) {
    const genres: string[] =
      typeof anime.genres === 'string'
        ? JSON.parse(anime.genres as unknown as string)
        : anime.genres || [];
    for (const genre of genres.slice(0, 2)) {
      if (!genreMap.has(genre)) genreMap.set(genre, []);
      genreMap.get(genre)!.push(anime);
    }
  }

  return (
    <div className="min-h-screen">
      <HeroCarousel anime={heroAnime} />
      <div className="px-4 md:px-8 lg:px-12 pb-16 space-y-8 -mt-4">
        <AnimeCarousel title="Your Library" anime={recentlyDownloaded} />
        {Array.from(genreMap.entries())
          .slice(0, 4)
          .map(([genre, items]) => (
            <AnimeCarousel key={genre} title={genre} anime={items.slice(0, 12)} />
          ))}
      </div>
    </div>
  );
}
