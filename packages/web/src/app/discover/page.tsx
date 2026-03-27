'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { searchIngest, queueIngest } from '@/lib/api';
import type { JikanSearchResult } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function DiscoverPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JikanSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [queued, setQueued] = useState<Set<number>>(new Set());
  const [queueing, setQueueing] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchIngest(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleQueue = async (item: JikanSearchResult) => {
    setQueueing((prev) => new Set(prev).add(item.malId));
    try {
      await queueIngest({ title: item.title, nyaaQuery: item.title });
      setQueued((prev) => new Set(prev).add(item.malId));
      toast(`Queued "${item.title}" for download!`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to queue', 'error');
    } finally {
      setQueueing((prev) => {
        const next = new Set(prev);
        next.delete(item.malId);
        return next;
      });
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <h1 className="text-white text-2xl font-bold mb-6">Discover Anime</h1>

      {/* Search */}
      <div className="relative mb-8">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a0a0a0]"
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anime to add to Babylon..."
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
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        >
          {results.map((item) => (
            <div key={item.malId} className="bg-card rounded-card overflow-hidden border border-[#2a2a3e] flex flex-col">
              {/* Poster */}
              {item.posterUrl && (
                <div className="relative" style={{ aspectRatio: '2/3' }}>
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="220px"
                  />
                </div>
              )}

              <div className="p-3 flex-1 flex flex-col">
                <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">{item.title}</h3>

                <div className="flex items-center gap-2 mb-2 text-[#a0a0a0] text-xs">
                  {item.year && <span>{item.year}</span>}
                  {item.episodes && <span>· {item.episodes} episodes</span>}
                </div>

                {/* Genre tags */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.genres.slice(0, 3).map((g) => (
                    <span key={g} className="text-[#a0a0a0] text-xs border border-[#2a2a3e] px-1.5 py-0.5 rounded-full">
                      {g}
                    </span>
                  ))}
                </div>

                {/* Synopsis */}
                {item.synopsis && (
                  <p className="text-[#a0a0a0] text-xs line-clamp-3 mb-3 flex-1">{item.synopsis}</p>
                )}

                {/* Action */}
                {item.inLibrary ? (
                  <Link
                    href={`/media/${item.libraryId}`}
                    className="block text-center text-xs font-semibold bg-green-700/20 text-green-400 border border-green-700/40 px-3 py-2 rounded-full hover:bg-green-700/30 transition-colors"
                  >
                    Already in Library →
                  </Link>
                ) : (
                  <button
                    onClick={() => handleQueue(item)}
                    disabled={queueing.has(item.malId) || queued.has(item.malId)}
                    className="w-full text-sm font-semibold bg-accent hover:bg-red-700 text-white py-2 rounded-full transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {queueing.has(item.malId) ? (
                      <>
                        <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        Queuing...
                      </>
                    ) : queued.has(item.malId) ? (
                      '✓ Queued!'
                    ) : (
                      'Add to Babylon'
                    )}
                  </button>
                )}
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
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>Search for anime to download via Nyaa</p>
        </div>
      )}
    </div>
  );
}
