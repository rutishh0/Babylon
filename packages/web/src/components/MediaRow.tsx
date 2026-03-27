'use client';

import { useRef } from 'react';
import type { MediaResponse } from '@babylon/shared';
import MediaCard from './MediaCard';
import ContinueWatchingCard from './ContinueWatchingCard';

interface Props {
  title: string;
  items: MediaResponse[];
  showProgress?: boolean;
}

export default function MediaRow({ title, items, showProgress }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <section className="mb-8 group/row">
      <h2 className="text-white font-semibold text-lg px-4 mb-3">{title}</h2>
      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-r opacity-0 group-hover/row:opacity-100 transition-opacity hidden md:flex items-center"
          aria-label="Scroll left"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 pb-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {items.map((item) =>
            showProgress ? (
              <div key={item.id} className="shrink-0 w-56 md:w-64">
                <ContinueWatchingCard media={item} />
              </div>
            ) : (
              <div key={item.id} className="shrink-0 w-32 md:w-40">
                <MediaCard media={item} />
              </div>
            ),
          )}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-l opacity-0 group-hover/row:opacity-100 transition-opacity hidden md:flex items-center"
          aria-label="Scroll right"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
