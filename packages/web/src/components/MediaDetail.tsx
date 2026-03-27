'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { MediaResponse, SeasonResponse } from '@babylon/shared';
import { formatDuration, formatYear, getRatingColor, formatFileSize } from '@/lib/utils';
import EditMetadataModal from './EditMetadataModal';

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyMCIgaGVpZ2h0PSI3MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzFhMWEyZSIvPjwvc3ZnPg==';
const POSTER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIyNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTJlIi8+PC9zdmc+';

interface Props {
  media: MediaResponse;
}

export default function MediaDetail({ media }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState(
    media.seasons?.[0]?.seasonNumber ?? 1,
  );

  const ratingColor = media.rating != null ? getRatingColor(media.rating) : undefined;

  const currentSeason: SeasonResponse | undefined = media.seasons?.find(
    (s) => s.seasonNumber === activeSeason,
  );

  // Find resume episode
  let watchHref = `/watch/${media.id}`;
  let hasProgress = false;
  if (media.seasons) {
    for (const season of media.seasons) {
      for (const ep of season.episodes) {
        if (ep.progress && !ep.progress.completed && ep.s3Key) {
          watchHref = `/watch/${media.id}?episode=${ep.id}`;
          hasProgress = true;
          break;
        }
      }
      if (hasProgress) break;
    }
  } else if (media.progress && !media.progress.completed) {
    hasProgress = true;
  }

  return (
    <>
      {/* Backdrop */}
      {media.backdropUrl && (
        <div className="relative w-full h-64 md:h-80 overflow-hidden">
          <Image
            src={media.backdropUrl}
            alt={media.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 -mt-16 relative z-10">
          {/* Poster */}
          {media.posterUrl && (
            <div className="relative w-32 h-48 md:w-48 md:h-72 shrink-0 rounded-card overflow-hidden shadow-xl mx-auto md:mx-0">
              <Image
                src={media.posterUrl}
                alt={media.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 128px, 192px"
                placeholder="blur"
                blurDataURL={POSTER_BLUR}
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 pt-0 md:pt-16">
            <h1 className="text-white text-3xl font-bold mb-2">{media.title}</h1>

            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {media.year && (
                <span className="text-[#a0a0a0] text-sm">{formatYear(media.year)}</span>
              )}
              {media.rating != null && (
                <span
                  className="text-sm font-bold px-2 py-0.5 rounded-full border"
                  style={{ color: ratingColor, borderColor: ratingColor }}
                >
                  ★ {media.rating.toFixed(1)}
                </span>
              )}
              <span className="text-[#a0a0a0] text-xs border border-[#2a2a3e] px-2 py-0.5 rounded-full capitalize">
                {media.type}
              </span>
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              {media.genres.map((g) => (
                <span
                  key={g}
                  className="text-[#a0a0a0] text-xs border border-[#2a2a3e] px-2 py-0.5 rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>

            {media.description && (
              <p className="text-[#a0a0a0] text-sm leading-relaxed mb-5 max-w-2xl">
                {media.description}
              </p>
            )}

            {/* Movie file info */}
            {media.type === 'movie' && media.mediaFile && (
              <div className="flex gap-4 mb-5 text-[#a0a0a0] text-xs">
                {media.mediaFile.duration && (
                  <span>{formatDuration(media.mediaFile.duration)}</span>
                )}
                {media.mediaFile.fileSize && (
                  <span>{formatFileSize(media.mediaFile.fileSize)}</span>
                )}
                {media.mediaFile.format && <span>{media.mediaFile.format}</span>}
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href={watchHref}
                className="bg-accent hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm"
              >
                {hasProgress ? '▶ Resume' : '▶ Play'}
              </Link>
              <button
                onClick={() => setEditOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm"
              >
                Edit Metadata
              </button>
            </div>
          </div>
        </div>

        {/* Season tabs */}
        {media.type !== 'movie' && media.seasons && media.seasons.length > 0 && (
          <div className="mt-10">
            <div className="flex gap-1 border-b border-[#2a2a3e] mb-6 overflow-x-auto">
              {media.seasons.map((season) => (
                <button
                  key={season.seasonNumber}
                  onClick={() => setActiveSeason(season.seasonNumber)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    activeSeason === season.seasonNumber
                      ? 'text-white border-accent'
                      : 'text-[#a0a0a0] border-transparent hover:text-white'
                  }`}
                >
                  Season {season.seasonNumber}
                </button>
              ))}
            </div>

            {/* Episode list */}
            {currentSeason && (
              <div className="space-y-3">
                {currentSeason.episodes.map((ep) => {
                  const epPct =
                    ep.progress && ep.progress.durationSeconds > 0
                      ? Math.round(
                          (ep.progress.positionSeconds / ep.progress.durationSeconds) * 100,
                        )
                      : 0;
                  const canWatch = !!ep.s3Key;

                  return (
                    <div
                      key={ep.id}
                      className={`flex gap-4 p-3 rounded-card border border-[#2a2a3e] transition-colors ${
                        canWatch ? 'hover:border-[#3a3a4e] hover:bg-[#1a1a2e]/50' : 'opacity-50'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div
                        className="relative shrink-0 overflow-hidden rounded bg-[#0a0a0a]"
                        style={{ width: 120, height: 68 }}
                      >
                        {ep.thumbnailUrl ? (
                          <Image
                            src={ep.thumbnailUrl}
                            alt={ep.title ?? `Episode ${ep.episodeNumber}`}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#a0a0a0] text-xs">
                            {ep.episodeNumber}
                          </div>
                        )}
                        {ep.progress?.completed && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[#a0a0a0] text-xs mr-2">
                              E{ep.episodeNumber}
                            </span>
                            <span className="text-white text-sm font-medium">
                              {ep.title ?? `Episode ${ep.episodeNumber}`}
                            </span>
                          </div>
                          {ep.duration && (
                            <span className="text-[#a0a0a0] text-xs shrink-0">
                              {formatDuration(ep.duration)}
                            </span>
                          )}
                        </div>

                        {!canWatch && (
                          <span className="text-[#a0a0a0] text-xs">Not uploaded yet</span>
                        )}

                        {/* Progress bar */}
                        {epPct > 0 && !ep.progress?.completed && (
                          <div className="mt-2 h-1 bg-[#333] rounded">
                            <div
                              className="h-full bg-accent rounded"
                              style={{ width: `${epPct}%` }}
                            />
                          </div>
                        )}

                        {canWatch && (
                          <Link
                            href={`/watch/${media.id}?episode=${ep.id}`}
                            className="absolute inset-0"
                            aria-label={`Watch episode ${ep.episodeNumber}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {editOpen && <EditMetadataModal media={media} onClose={() => setEditOpen(false)} />}
    </>
  );
}
