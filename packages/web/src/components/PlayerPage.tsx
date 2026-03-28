'use client';

import { useEffect, useState, useMemo } from 'react';
import type { MediaResponse } from '@babylon/shared';
import { buildStreamUrl, getSubtitles, getApiBaseUrl } from '@/lib/api';
import Player from './Player';

interface SubtitleTrack {
  url: string;
  language: string;
  label: string;
}

interface Props {
  media: MediaResponse;
  episodeId?: string;
}

export default function PlayerPage({ media, episodeId }: Props) {
  // Stream URL is constructed directly — the API streams the file with Range support
  const streamUrl = useMemo(() => buildStreamUrl(media.id, episodeId), [media.id, episodeId]);

  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [initialPosition, setInitialPosition] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // Fetch available subtitles from the API
        const baseUrl = getApiBaseUrl();
        const subs = await getSubtitles(media.id, episodeId);
        const subTracks: SubtitleTrack[] = subs
          .filter((s) => s.url)
          .map((s) => ({
            // The API returns relative URLs like /api/stream/:id/subtitle-file?path=...
            // Prepend base URL to make them absolute
            url: s.url.startsWith('http') ? s.url : `${baseUrl}${s.url.startsWith('/api') ? s.url.replace(/^\/api/, '') : s.url}`,
            language: s.language,
            label: s.label || s.language.toUpperCase(),
          }));
        setSubtitles(subTracks);

        // Find initial position
        if (episodeId && media.seasons) {
          for (const season of media.seasons) {
            for (const ep of season.episodes) {
              if (ep.id === episodeId && ep.progress && !ep.progress.completed) {
                setInitialPosition(ep.progress.positionSeconds);
              }
            }
          }
        } else if (media.progress && !media.progress.completed) {
          setInitialPosition(media.progress.positionSeconds);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stream');
      }
    }
    load();
  }, [media, episodeId]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => history.back()}
            className="bg-accent text-white px-6 py-2.5 rounded-full text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <Player
      streamUrl={streamUrl}
      media={media}
      episodeId={episodeId}
      subtitles={subtitles}
      initialPosition={initialPosition}
    />
  );
}
