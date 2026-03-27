'use client';

import { useState, useMemo } from 'react';
import type { MediaResponse } from '@babylon/shared';
import MediaCard from './MediaCard';

type SortOption = 'created_at' | 'title' | 'rating' | 'year';

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'created_at', label: 'Recently Added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
];

interface Props {
  title: string;
  items: MediaResponse[];
}

export default function CategoryGrid({ title, items }: Props) {
  const [sort, setSort] = useState<SortOption>('created_at');

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      switch (sort) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'year':
          return (b.year ?? 0) - (a.year ?? 0);
        case 'created_at':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [items, sort]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-white text-2xl font-bold">
          {title} <span className="text-[#a0a0a0] text-lg font-normal">({items.length})</span>
        </h1>

        {/* Sort */}
        <div className="flex gap-2 flex-wrap">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                sort === value
                  ? 'text-white font-semibold border-b-2 border-accent'
                  : 'text-[#a0a0a0] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-[#a0a0a0]">
          <p>Nothing here yet. Upload some content or use Discover.</p>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
        >
          {sorted.map((item) => (
            <MediaCard key={item.id} media={item} />
          ))}
        </div>
      )}
    </div>
  );
}
