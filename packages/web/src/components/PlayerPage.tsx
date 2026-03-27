'use client';

import { useEffect, useState } from 'react';
import type { MediaResponse } from '@babylon/shared';
import { getStreamUrl, getSubtitleUrl } from '@/lib/api';
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
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [initialPosition, setInitialPosition] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { url } = await getStreamUrl(media.id, episodeId);
        setStreamUrl(url);

        // Find available subtitle languages from episode
        const availableSubs: string[] = [];
        if (media.seasons && episodeId) {
          for (const season of media.seasons) {
            for (const ep of season.episodes) {
              if (ep.id === episodeId) {
                // API doesn't directly expose subtitle list on episode; common approach:
                // try fetching known languages
                break;
              }
            }
          }
        }

        // Attempt to load subtitle tracks
        const subTracks: SubtitleTrack[] = [];
        for (const lang of availableSubs) {
          try {
            const { url: subUrl } = await getSubtitleUrl(media.id, episodeId!, lang);
            subTracks.push({ url: subUrl, language: lang, label: lang.toUpperCase() });
          } catch {
            // skip
          }
        }
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

  if (!streamUrl) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
