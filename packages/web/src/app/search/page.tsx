'use client';

import { useState, useEffect, useRef } from 'react';
import type { MediaType, MediaResponse } from '@babylon/shared';
import { listMedia } from '@/lib/api';
import MediaCard from '@/components/MediaCard';

type FilterType = 'all' | MediaType;

const FILTERS: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'anime', label: 'Anime' },
  { value: 'movie', label: 'Movies' },
  { value: 'series', label: 'TV Shows' },
];

function MediaCardSkeleton() {
  return (
    <div
      className="bg-card rounded-card animate-pulse"
      style={{ aspectRatio: '2/3' }}
    />
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [results, setResults] = useState<MediaResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await listMedia({
          q: query,
          ...(filter !== 'all' ? { type: filter } : {}),
          limit: 100,
        });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filter]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Search input */}
      <div className="mb-6">
        <div className="relative">
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
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library..."
            className="w-full bg-[#1a1a2e] text-white placeholder-[#a0a0a0] border border-[#2a2a3e] rounded-full pl-12 pr-4 py-3 text-base focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${
              filter === value
                ? 'bg-accent text-white'
                : 'bg-[#1a1a2e] text-[#a0a0a0] hover:text-white border border-[#2a2a3e]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      {query.length < 2 && (
        <div className="flex flex-col items-center justify-center py-24 text-[#a0a0a0]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>Search your library</p>
        </div>
      )}

      {query.length >= 2 && loading && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-[#a0a0a0]">
          <p>No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {query.length >= 2 && !loading && results.length > 0 && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
        >
          {results.map((item) => (
            <MediaCard key={item.id} media={item} />
          ))}
        </div>
      )}
    </div>
  );
}
