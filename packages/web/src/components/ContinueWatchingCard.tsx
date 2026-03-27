import Link from 'next/link';
import Image from 'next/image';
import type { MediaResponse } from '@babylon/shared';
import { formatProgress } from '@/lib/utils';

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTJlIi8+PC9zdmc+';

interface Props {
  media: MediaResponse;
}

export default function ContinueWatchingCard({ media }: Props) {
  const progress = media.progress;
  const pct = progress
    ? formatProgress(progress.positionSeconds, progress.durationSeconds)
    : 0;

  // Find episode info if series
  let episodeLabel = '';
  if (media.seasons && progress) {
    for (const season of media.seasons) {
      for (const ep of season.episodes) {
        if (ep.progress) {
          episodeLabel = `S${season.seasonNumber} E${ep.episodeNumber}`;
          break;
        }
      }
      if (episodeLabel) break;
    }
  }

  const imageUrl = media.backdropUrl ?? media.posterUrl;

  return (
    <Link href={`/watch/${media.id}`} className="group block relative">
      <div
        className="relative overflow-hidden rounded-card bg-card"
        style={{ aspectRatio: '16/9' }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={media.title}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 768px) 80vw, (max-width: 1200px) 40vw, 25vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        ) : (
          <div className="w-full h-full bg-card flex items-center justify-center text-[#a0a0a0] text-xs">
            {media.title}
          </div>
        )}

        {/* Gradient bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Title + episode */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center justify-between">
            <span className="text-white text-xs font-medium line-clamp-1">{media.title}</span>
            {episodeLabel && (
              <span className="text-[#a0a0a0] text-xs ml-2 shrink-0">{episodeLabel}</span>
            )}
          </div>
        </div>

        {/* Progress bar at bottom */}
        {pct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#333]">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
