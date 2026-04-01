'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLibrary } from '@/lib/anime-api';
import type { LibraryAnime } from '@/lib/anime-api';
import HeroCarousel from '@/components/HeroCarousel';
import AnimeCarousel from '@/components/AnimeCarousel';
import { useLanguage } from '@/lib/language-context';
import { browseMovies, type MovieListing } from '@/lib/movie-api';

// ── Movie Home (shown when language is tamil/telugu/kannada) ──

function MovieHome({ language }: { language: string }) {
  const [movies, setMovies] = useState<MovieListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    browseMovies(language, 'webhd', 1)
      .then((data) => setMovies(Array.isArray(data) ? data : []))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [language]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-white text-3xl font-bold mb-4">Welcome to Babylon</h1>
        <p className="text-[#a0a0a0] mb-8 max-w-md">
          Your personal streaming platform. Browse and download movies in{' '}
          <span className="capitalize text-[#F47521]">{language}</span>.
        </p>
        <Link
          href="/movies"
          className="bg-[#F47521] hover:bg-[#e06520] text-white px-8 py-3 rounded-sm font-semibold text-lg transition-colors"
        >
          Browse Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-12 py-8">
      <h2 className="text-white text-xl font-bold mb-6">
        Latest{' '}
        <span className="text-[#F47521] capitalize">{language}</span>{' '}
        Movies
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {movies.slice(0, 20).map((movie, i) => (
          <Link
            key={`${movie.topic_url}-${i}`}
            href="/movies"
            className="bg-[#141519] rounded-lg overflow-hidden hover:ring-2 hover:ring-[#F47521] transition-all group"
          >
            <div className="p-4 space-y-2">
              <h3 className="text-white text-sm font-semibold line-clamp-2 group-hover:text-[#F47521] transition-colors">
                {movie.parsed_title || movie.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {movie.year && (
                  <span className="text-[10px] text-[#a0a0a0] bg-[#23252b] px-1.5 py-0.5 rounded">
                    {movie.year}
                  </span>
                )}
                {movie.quality_tag && (
                  <span className="text-[10px] text-[#F47521] bg-[#F47521]/10 px-1.5 py-0.5 rounded font-medium">
                    {movie.quality_tag}
                  </span>
                )}
                {movie.has_esub && (
                  <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                    ESub
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {movie.resolutions?.map((res) => (
                  <span
                    key={res}
                    className="text-[10px] text-blue-300 bg-blue-300/10 px-1.5 py-0.5 rounded"
                  >
                    {res}
                  </span>
                ))}
              </div>
              {movie.file_size && (
                <p className="text-[11px] text-[#6b6b6b]">{movie.file_size}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/movies"
          className="text-[#F47521] hover:underline text-sm font-medium"
        >
          Browse all movies &rarr;
        </Link>
      </div>
    </div>
  );
}

// ── Anime Home (existing, unchanged logic) ──

function AnimeHome() {
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

// ── Main Home Page ──

export default function HomePage() {
  const { language, isAnime } = useLanguage();

  if (isAnime) {
    return <AnimeHome />;
  }

  return (
    <div className="min-h-screen">
      <MovieHome language={language} />
    </div>
  );
}
