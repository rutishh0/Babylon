'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimeCard } from '@/components/AnimeCard';
import { searchAnime } from '@/lib/anime-api';
import type { AnimeSearchResult } from '@/lib/anime-api';

const STORAGE_KEY = 'babylon-recent-searches';
const MAX_RECENT = 8;

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const existing = getRecentSearches();
    const updated = [query, ...existing.filter((s) => s !== query)].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // silent
  }
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setRecentSearches(getRecentSearches());
  }, []);

  // Search with debounce
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAnime(query);
        setResults(data);
        // Save to recent searches
        saveRecentSearch(query);
        setRecentSearches(getRecentSearches());
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const removeSearch = useCallback((search: string) => {
    try {
      const existing = getRecentSearches();
      const updated = existing.filter((s) => s !== search);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {
      // silent
    }
  }, []);

  const clearAllSearches = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentSearches([]);
    } catch {
      // silent
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Search Header - Large centered search */}
      <div className="pt-16 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Search Input */}
          <div className="relative">
            <svg
              className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 text-[#a0a0a0]"
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
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full pl-12 pr-12 py-4 bg-transparent text-white placeholder:text-[#a0a0a0] text-3xl md:text-4xl font-light border-b border-[#3a3c42] focus:outline-none focus:border-[#F47521]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-[#23252b] rounded-full transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#a0a0a0]">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Searches */}
      {query.length === 0 && recentSearches.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white">Recent Searches</h2>
            <button
              onClick={clearAllSearches}
              className="text-sm text-[#F47521] hover:underline"
            >
              CLEAR ALL
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <button
                key={search}
                onClick={() => setQuery(search)}
                className="group flex items-center gap-2 px-4 py-2 bg-[#23252b] hover:bg-[#2a2c32] rounded-full transition-colors"
              >
                <span className="text-sm text-white">{search}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-[#a0a0a0] hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSearch(search);
                  }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Search Results */}
      {!loading && query.length >= 2 && (
        <div className="px-4 md:px-8 lg:px-12 pb-12">
          <p className="text-sm text-[#a0a0a0] mb-6">
            {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          </p>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} variant="grid" />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="mx-auto mb-4 text-[#23252b]"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <h3 className="text-xl font-medium text-white mb-2">No results found</h3>
              <p className="text-[#a0a0a0]">Try searching for something else</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {query.length === 0 && recentSearches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-[#a0a0a0]">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="mb-6 opacity-30"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="text-lg">Search for anime</p>
          <p className="text-sm mt-1 text-[#666]">Find anime from AllAnime to stream or download</p>
        </div>
      )}
    </div>
  );
}
