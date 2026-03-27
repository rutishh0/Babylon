'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { MediaResponse } from '@babylon/shared';
import { formatProgress, formatYear } from '@/lib/utils';

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyMCIgaGVpZ2h0PSI3MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzFhMWEyZSIvPjwvc3ZnPg==';

interface Props {
  media: MediaResponse;
}

export default function HeroBanner({ media }: Props) {
  const progress = media.progress;
  const pct = progress
    ? formatProgress(progress.positionSeconds, progress.durationSeconds)
    : 0;

  // Find first episode with progress for the watch link
  let watchHref = `/watch/${media.id}`;
  if (media.seasons) {
    for (const season of media.seasons) {
      for (const ep of season.episodes) {
        if (ep.progress && !ep.progress.completed) {
          watchHref = `/watch/${media.id}?episode=${ep.id}`;
          break;
        }
      }
    }
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(400px, 56vw, 700px)' }}
    >
      {/* Backdrop */}
      {(media.backdropUrl ?? media.posterUrl) && (
        <Image
          src={(media.backdropUrl ?? media.posterUrl)!}
          alt={media.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      )}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/70 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 md:px-12 md:pb-14 max-w-2xl">
        {/* Title */}
        <h1
          className="text-white font-bold mb-3 leading-tight"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}
        >
          {media.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {media.year && (
            <span className="text-[#a0a0a0] text-sm">{formatYear(media.year)}</span>
          )}
          {media.rating != null && (
            <span className="bg-black/50 text-white text-xs font-bold px-2 py-0.5 rounded-full border border-[#2a2a3e]">
              ⭐ {media.rating.toFixed(1)}
            </span>
          )}
          {media.genres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="text-[#a0a0a0] text-xs border border-[#2a2a3e] px-2 py-0.5 rounded-full"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Description */}
        {media.description && (
          <p className="text-[#a0a0a0] text-sm line-clamp-3 mb-4 max-w-xl">
            {media.description}
          </p>
        )}

        {/* Progress bar */}
        {pct > 0 && (
          <div className="w-48 h-1 bg-[#333] rounded mb-3">
            <div
              className="h-full bg-accent rounded transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href={watchHref}
            className="bg-accent hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm"
          >
            {pct > 0 ? '▶ Resume' : '▶ Watch Now'}
          </Link>
          <Link
            href={`/media/${media.id}`}
            className="bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm backdrop-blur"
          >
            More Info
          </Link>
        </div>
      </div>
    </div>
  );
}
