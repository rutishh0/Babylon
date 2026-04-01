'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { AnimeCard } from '@/components/AnimeCard';

interface CarouselAnime {
  id: string;
  title: string;
  cover_url?: string | null;
  languages?: string[];
  year?: number | null;
  episode_count?: number | null;
  episode_count_downloaded?: number;
  status?: string | null;
}

interface AnimeCarouselProps {
  title: string;
  anime: CarouselAnime[];
  onItemClick?: (anime: CarouselAnime) => void;
}

export default function AnimeCarousel({ title, anime, onItemClick }: AnimeCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const scrollRight = () => {
    if (scrollRef.current) {
      const cardWidth = 220 + 16; // card width + gap
      const visibleCards = Math.floor(scrollRef.current.clientWidth / cardWidth);
      const scrollAmount = cardWidth * visibleCards;
      scrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (anime.length === 0) return null;

  return (
    <section
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Section Title */}
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4 tracking-tight">
        {title}
      </h2>

      <div className="relative">
        {/* Cards Container - Horizontal Scroll */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {anime.map((item) => (
            <AnimeCard
              key={item.id}
              anime={item}
              variant="carousel"
              onClick={onItemClick ? () => onItemClick(item) : undefined}
            />
          ))}
        </div>

        {/* Right Arrow - Shows on hover when there's more content */}
        {showRightArrow && (
          <button
            onClick={scrollRight}
            className={`absolute right-0 top-0 bottom-8 w-12 md:w-16 flex items-center justify-center bg-gradient-to-l from-black/80 via-black/60 to-transparent transition-opacity duration-300 ${
              isHovering ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </section>
  );
}
