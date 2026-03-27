import Link from 'next/link';
import Image from 'next/image';
import type { MediaResponse } from '@babylon/shared';
import { isRecentlyAdded } from '@/lib/utils';

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIyNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTJlIi8+PC9zdmc+';

interface Props {
  media: MediaResponse;
}

export default function MediaCard({ media }: Props) {
  const isNew = isRecentlyAdded(media.createdAt);

  return (
    <Link href={`/media/${media.id}`} className="group block relative">
      <div
        className="relative overflow-hidden rounded-card bg-card"
        style={{ aspectRatio: '2/3' }}
      >
        {media.posterUrl ? (
          <Image
            src={media.posterUrl}
            alt={media.title}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 14vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        ) : (
          <div className="w-full h-full bg-card flex items-center justify-center text-[#a0a0a0] text-xs text-center p-2">
            {media.title}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
          <span className="text-white text-xs font-medium line-clamp-2">{media.title}</span>
        </div>

        {/* Rating badge */}
        {media.rating != null && (
          <div className="absolute top-1.5 right-1.5 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            {media.rating.toFixed(1)}
          </div>
        )}

        {/* NEW badge */}
        {isNew && (
          <div className="absolute top-1.5 left-1.5 bg-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            NEW
          </div>
        )}
      </div>
    </Link>
  );
}
