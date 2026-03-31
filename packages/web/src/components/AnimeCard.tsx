'use client';

import Link from 'next/link';

interface AnimeCardAnime {
  id: string;
  title: string;
  cover_url?: string | null;
  languages?: string[];
  year?: number | null;
  episode_count?: number | null;
  episode_count_downloaded?: number;
  status?: string | null;
}

interface AnimeCardProps {
  anime: AnimeCardAnime;
  variant?: 'carousel' | 'grid';
  onClick?: () => void;
}

export function AnimeCard({ anime, variant = 'carousel', onClick }: AnimeCardProps) {
  const getSubDubText = () => {
    const langs = anime.languages || [];
    if (langs.length === 0) return '';
    const hasSub = langs.some((l) => l.toLowerCase() === 'sub');
    const hasDub = langs.some((l) => l.toLowerCase() === 'dub');
    if (hasSub && hasDub) return 'Sub | Dub';
    if (hasSub) return 'Subtitled';
    if (hasDub) return 'Dubbed';
    return langs.join(', ');
  };

  const widthClass =
    variant === 'carousel'
      ? 'w-[180px] md:w-[200px] lg:w-[220px]'
      : 'w-full';

  const content = (
    <div className={`flex-shrink-0 ${widthClass} group cursor-pointer`}>
      {/* Thumbnail */}
      <div className="relative aspect-[2/3] rounded overflow-hidden bg-[#23252b] mb-2">
        {anime.cover_url ? (
          <img
            src={anime.cover_url}
            alt={anime.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#3a3c42]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

        {/* Downloaded badge */}
        {anime.episode_count_downloaded != null && anime.episode_count_downloaded > 0 && (
          <div className="absolute bottom-2 left-2 bg-[#F47521]/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {anime.episode_count_downloaded} EP{anime.episode_count_downloaded !== 1 ? 'S' : ''}
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-sm md:text-base leading-tight line-clamp-2 mb-1 group-hover:text-[#F47521] transition-colors">
        {anime.title}
      </h3>

      {/* Sub/Dub text */}
      <p className="text-[#a0a0a0] text-xs md:text-sm">{getSubDubText()}</p>
    </div>
  );

  if (onClick) {
    return <div onClick={onClick}>{content}</div>;
  }

  return (
    <Link href={`/anime/${encodeURIComponent(anime.id)}`}>
      {content}
    </Link>
  );
}

// Keep default export for backwards compat
export default AnimeCard;
