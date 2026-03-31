'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Play, Download, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EpisodeGrid from '@/components/EpisodeGrid';
import { useToast } from '@/components/Toast';
import { useDownloadStore } from '@/stores/download-store';
import {
  getLibraryAnime,
  getEpisodes,
  startDownload,
  buildLocalStreamUrl,
} from '@/lib/anime-api';
import type { LibraryAnimeDetail, EpisodeItem } from '@/lib/anime-api';

export default function AnimeDetailPage() {
  const params = useParams();
  const animeId = decodeURIComponent(params.id as string);
  const { toast } = useToast();
  const downloadStore = useDownloadStore();

  const [animeDetail, setAnimeDetail] = useState<LibraryAnimeDetail | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<EpisodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEps, setLoadingEps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize download store
  useEffect(() => {
    downloadStore.initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch library detail + available episodes
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const detail = await getLibraryAnime(animeId);
        if (!cancelled) setAnimeDetail(detail);
      } catch {
        if (!cancelled) setError('This anime is not in your library yet.');
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Also try to load all available episodes from the provider
      setLoadingEps(true);
      try {
        const eps = await getEpisodes(animeId, 'sub');
        if (!cancelled) setAllEpisodes(eps);
      } catch {
        // Available episodes not found is fine
      } finally {
        if (!cancelled) setLoadingEps(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [animeId]);

  const downloadedEpSet = new Set(
    animeDetail?.episodes?.map((ep) => ep.episode_number) || []
  );

  // First downloaded episode for "Start Watching"
  const firstDownloaded = animeDetail?.episodes?.length
    ? animeDetail.episodes.reduce((min, ep) =>
        ep.episode_number < min.episode_number ? ep : min
      )
    : null;

  const handleDownloadEpisodes = useCallback(
    async (episodeNumbers: number[]) => {
      try {
        const data = await startDownload({
          anime_id: animeId,
          episodes: episodeNumbers,
          lang: 'sub',
          quality: 'best',
          title: animeDetail?.title || animeId,
          cover_url: animeDetail?.cover_url,
          genres: animeDetail?.genres,
          description: animeDetail?.description,
          year: animeDetail?.year,
          episode_count: animeDetail?.episode_count,
          status: animeDetail?.status,
        });

        downloadStore.addJob(data.job_id, {
          status: 'starting',
          progress: 0,
          total: episodeNumbers.length,
          current: null,
          completed: [],
          errors: [],
          title: animeDetail?.title || animeId,
        });
        downloadStore.pollJob(data.job_id);

        toast(
          `Queued ${episodeNumbers.length} episode${episodeNumbers.length !== 1 ? 's' : ''} for download`,
          'success'
        );
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to queue download', 'error');
      }
    },
    [animeId, animeDetail, downloadStore, toast]
  );

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Parse genres
  const genres: string[] = animeDetail
    ? typeof animeDetail.genres === 'string'
      ? JSON.parse(animeDetail.genres as unknown as string)
      : animeDetail.genres || []
    : [];

  const languages = animeDetail?.languages || [];

  // Build episode list for the grid (combine available + downloaded info)
  const episodeGridData = allEpisodes.length > 0
    ? allEpisodes.map((ep) => ({
        anime_id: ep.anime_id,
        number: ep.number,
        provider: ep.provider,
        language: ep.language,
        is_downloaded: downloadedEpSet.has(ep.number),
      }))
    : (animeDetail?.episodes || []).map((ep) => ({
        anime_id: animeId,
        number: ep.episode_number,
        provider: '',
        language: ep.language || 'sub',
        is_downloaded: true,
      }));

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Hero Section with cover background */}
      <div className="relative h-[450px] md:h-[500px]">
        {animeDetail?.cover_url ? (
          <img
            src={animeDetail.cover_url}
            alt={animeDetail.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[#141519]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="px-4 md:px-8 lg:px-12 pb-6 w-full">
            <div className="flex gap-6 md:gap-8">
              {/* Poster */}
              {animeDetail?.cover_url && (
                <div className="hidden md:block w-44 lg:w-52 flex-shrink-0 -mb-20 relative z-10">
                  <div className="aspect-[2/3] rounded overflow-hidden shadow-2xl">
                    <img
                      src={animeDetail.cover_url}
                      alt={animeDetail.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 pb-2">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 text-balance">
                  {animeDetail?.title || error || 'Unknown Anime'}
                </h1>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-white mb-4">
                  {languages.some((l) => l.toLowerCase() === 'sub') && (
                    <span className="px-2 py-0.5 border border-white/50 text-white text-xs font-normal">
                      Sub
                    </span>
                  )}
                  {languages.some((l) => l.toLowerCase() === 'dub') && (
                    <span className="px-2 py-0.5 bg-[#F47521] text-white text-xs font-normal">
                      Dub
                    </span>
                  )}
                  {animeDetail?.episode_count != null && animeDetail.episode_count > 0 && (
                    <span>{animeDetail.episode_count} Episodes</span>
                  )}
                  {animeDetail?.episode_count_downloaded != null &&
                    animeDetail.episode_count_downloaded > 0 && (
                      <>
                        <span className="text-white/40">|</span>
                        <span className="text-[#F47521]">
                          {animeDetail.episode_count_downloaded} Downloaded
                        </span>
                      </>
                    )}
                  {animeDetail?.year && (
                    <>
                      <span className="text-white/40">|</span>
                      <span>{animeDetail.year}</span>
                    </>
                  )}
                  {animeDetail?.status && (
                    <>
                      <span className="text-white/40">|</span>
                      <span className="capitalize">{animeDetail.status}</span>
                    </>
                  )}
                </div>

                {/* Genres */}
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {genres.slice(0, 6).map((genre) => (
                      <span
                        key={genre}
                        className="px-2.5 py-1 bg-white/10 text-white text-xs rounded-sm font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {firstDownloaded && (
                    <Link
                      href={`/watch/${encodeURIComponent(animeId)}?ep=${firstDownloaded.episode_number}`}
                    >
                      <Button className="bg-[#F47521] hover:bg-[#e06515] text-white h-11 px-6 rounded-sm font-medium cursor-pointer">
                        <Play className="w-5 h-5 mr-2 fill-white" />
                        START WATCHING E{firstDownloaded.episode_number}
                      </Button>
                    </Link>
                  )}
                  {!firstDownloaded && allEpisodes.length > 0 && (
                    <Button
                      onClick={() => handleDownloadEpisodes([allEpisodes[0].number])}
                      className="bg-[#F47521] hover:bg-[#e06515] text-white h-11 px-6 rounded-sm font-medium cursor-pointer"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      DOWNLOAD E1
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="border-white/50 text-white hover:bg-white/10 h-11 px-4 rounded-sm bg-transparent cursor-pointer"
                  >
                    <Bookmark className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-4 md:px-8 lg:px-12 pt-6 md:pt-28 pb-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Mobile Poster */}
          {animeDetail?.cover_url && (
            <div className="md:hidden w-32 mx-auto -mt-20 relative z-10">
              <div className="aspect-[2/3] rounded overflow-hidden shadow-2xl">
                <img
                  src={animeDetail.cover_url}
                  alt={animeDetail.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Sidebar spacer for desktop poster overlap */}
          {animeDetail?.cover_url && (
            <div className="hidden md:block w-44 lg:w-52 flex-shrink-0" />
          )}

          {/* Main Content */}
          <div className="flex-1">
            {/* Synopsis */}
            {animeDetail?.description && (
              <div className="mb-8">
                <p
                  className="text-[#a0a0a0] leading-relaxed text-sm"
                  dangerouslySetInnerHTML={{
                    __html: animeDetail.description
                      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                      .replace(/<br\s*\/?>/g, ' ')
                      .replace(/<[^>]*>/g, '')
                  }}
                />
              </div>
            )}

            {/* Error state (not in library) */}
            {error && !animeDetail && (
              <div className="mb-8 text-center py-12">
                <p className="text-[#a0a0a0] mb-4">{error}</p>
                <Link
                  href="/discover"
                  className="bg-[#F47521] hover:bg-[#e06515] text-white px-6 py-2 rounded-sm font-medium transition-colors inline-block"
                >
                  Search on Discover
                </Link>
              </div>
            )}

            {/* Episodes Section */}
            {episodeGridData.length > 0 && (
              <EpisodeGrid
                episodes={episodeGridData}
                animeId={animeId}
                animeTitle={animeDetail?.title || animeId}
                downloadedEpisodes={downloadedEpSet}
                showDownloadControls={allEpisodes.length > 0}
                onDownloadSelected={handleDownloadEpisodes}
              />
            )}

            {loadingEps && episodeGridData.length === 0 && (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loadingEps && episodeGridData.length === 0 && !error && (
              <div className="text-center py-12 text-[#a0a0a0]">
                <p>No episodes found for this anime.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
