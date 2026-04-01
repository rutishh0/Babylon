'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/language-context';
import {
  browseMovies,
  searchMovies,
  getMovieVariants,
  startMovieDownload,
  getMovieDownloadStatus,
  type MovieListing,
  type MovieVariant,
  type MovieDownloadJob,
} from '@/lib/movie-api';

const FORUM_TABS = [
  { key: 'webhd', label: 'Web-HD' },
  { key: 'hdrips', label: 'HD Rips' },
  { key: 'predvd', label: 'PreDVD' },
] as const;

function MovieCard({
  movie,
  onSelect,
}: {
  movie: MovieListing;
  onSelect: (m: MovieListing) => void;
}) {
  return (
    <button
      onClick={() => onSelect(movie)}
      className="bg-[#141519] rounded-lg overflow-hidden text-left hover:ring-2 hover:ring-[#F47521] transition-all group"
    >
      <div className="p-4 space-y-2">
        <h3 className="text-white text-sm font-semibold line-clamp-2 group-hover:text-[#F47521] transition-colors">
          {movie.parsed_title || movie.title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {movie.year && (
            <span className="text-[10px] text-[#a0a0a0] bg-[#23252b] px-1.5 py-0.5 rounded">
              {movie.year}
            </span>
          )}
          {movie.quality_tag && (
            <span className="text-[10px] text-[#F47521] bg-[#F47521]/10 px-1.5 py-0.5 rounded font-medium">
              {movie.quality_tag}
            </span>
          )}
          {movie.has_esub && (
            <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
              ESub
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {movie.resolutions?.map((res) => (
            <span
              key={res}
              className="text-[10px] text-blue-300 bg-blue-300/10 px-1.5 py-0.5 rounded"
            >
              {res}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {movie.languages?.map((lang) => (
            <span
              key={lang}
              className="text-[10px] text-purple-300 bg-purple-300/10 px-1.5 py-0.5 rounded"
            >
              {lang}
            </span>
          ))}
        </div>
        {movie.file_size && (
          <p className="text-[11px] text-[#6b6b6b]">{movie.file_size}</p>
        )}
      </div>
    </button>
  );
}

function VariantModal({
  movie,
  variants,
  loadingVariants,
  onClose,
  onDownload,
  downloadingVariant,
}: {
  movie: MovieListing;
  variants: MovieVariant[];
  loadingVariants: boolean;
  onClose: () => void;
  onDownload: (v: MovieVariant) => void;
  downloadingVariant: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1c22] rounded-lg w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[#2a2c32] flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm line-clamp-1">
            {movie.parsed_title || movie.title}
          </h2>
          <button
            onClick={onClose}
            className="text-[#a0a0a0] hover:text-white text-lg leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {loadingVariants ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : variants.length === 0 ? (
            <p className="text-[#a0a0a0] text-sm text-center py-8">
              No download variants found.
            </p>
          ) : (
            variants.map((v, i) => (
              <div
                key={i}
                className="bg-[#23252b] rounded-md p-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-white text-sm font-medium line-clamp-1">
                    {v.label}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {v.resolution && (
                      <span className="text-[10px] text-blue-300 bg-blue-300/10 px-1.5 py-0.5 rounded">
                        {v.resolution}
                      </span>
                    )}
                    {v.quality_tag && (
                      <span className="text-[10px] text-[#F47521] bg-[#F47521]/10 px-1.5 py-0.5 rounded">
                        {v.quality_tag}
                      </span>
                    )}
                    {v.file_size && (
                      <span className="text-[10px] text-[#6b6b6b]">
                        {v.file_size}
                      </span>
                    )}
                    {v.has_esub && (
                      <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                        ESub
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDownload(v)}
                  disabled={downloadingVariant === v.magnet_url}
                  className="shrink-0 bg-[#F47521] hover:bg-[#e06520] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
                >
                  {downloadingVariant === v.magnet_url ? 'Starting...' : 'Download'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function MoviesPage() {
  const { language } = useLanguage();
  const [forumType, setForumType] = useState<string>('webhd');
  const [movies, setMovies] = useState<MovieListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);

  // Variant modal state
  const [selectedMovie, setSelectedMovie] = useState<MovieListing | null>(null);
  const [variants, setVariants] = useState<MovieVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [downloadingVariant, setDownloadingVariant] = useState<string | null>(null);

  // Download status
  const [downloadJobs, setDownloadJobs] = useState<Record<string, MovieDownloadJob>>({});

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effective language for API calls (default to tamil for movie mode)
  const movieLanguage = language === 'japanese' ? 'tamil' : language;

  // Fetch browse results
  const fetchMovies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await browseMovies(movieLanguage, forumType, page);
      setMovies(Array.isArray(data) ? data : []);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [movieLanguage, forumType, page]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchMovies();
    }
  }, [fetchMovies, searchQuery]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim()) return;

    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchMovies(searchQuery, movieLanguage);
        setMovies(Array.isArray(data) ? data : []);
      } catch {
        setMovies([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, movieLanguage]);

  // Poll download status
  useEffect(() => {
    const poll = async () => {
      try {
        const status = await getMovieDownloadStatus();
        setDownloadJobs(status || {});
      } catch {
        // ignore
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle movie card click -> fetch variants
  const handleSelectMovie = async (movie: MovieListing) => {
    setSelectedMovie(movie);
    setVariants([]);
    setLoadingVariants(true);
    try {
      const data = await getMovieVariants(movie.topic_url);
      setVariants(Array.isArray(data) ? data : []);
    } catch {
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Handle download
  const handleDownload = async (variant: MovieVariant) => {
    if (!selectedMovie) return;
    setDownloadingVariant(variant.magnet_url);
    try {
      await startMovieDownload({
        magnet_url: variant.magnet_url,
        title: selectedMovie.parsed_title || selectedMovie.title,
        year: selectedMovie.year,
        language: movieLanguage,
        resolution: variant.resolution || undefined,
        languages: variant.languages,
        quality_tag: variant.quality_tag || undefined,
        topic_url: selectedMovie.topic_url,
      });
    } catch {
      // TODO: show error toast
    } finally {
      setDownloadingVariant(null);
    }
  };

  const activeDownloads = Object.entries(downloadJobs).filter(
    ([, j]) => j.status !== 'complete'
  );

  return (
    <div className="min-h-screen bg-[#000000] px-4 md:px-8 lg:px-12 py-8">
      {/* Header */}
      <div className="max-w-[1920px] mx-auto">
        <h1 className="text-white text-2xl font-bold mb-6">
          Browse Movies
          <span className="text-[#F47521] ml-2 text-lg font-normal capitalize">
            {movieLanguage}
          </span>
        </h1>

        {/* Search bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search movies..."
            className="w-full max-w-md bg-[#141519] border border-[#2a2c32] rounded-md px-4 py-2.5 text-sm text-white placeholder-[#6b6b6b] focus:outline-none focus:border-[#F47521] transition-colors"
          />
        </div>

        {/* Forum tabs */}
        {!searchQuery.trim() && (
          <div className="flex items-center gap-1 mb-6">
            {FORUM_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setForumType(tab.key);
                  setPage(1);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  forumType === tab.key
                    ? 'bg-[#F47521] text-white'
                    : 'bg-[#141519] text-[#a0a0a0] hover:text-white hover:bg-[#23252b]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading || searching ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[#a0a0a0] text-lg mb-2">No movies found</p>
            <p className="text-[#6b6b6b] text-sm">
              {searchQuery
                ? 'Try a different search term.'
                : 'Check that the backend is running and TamilMV is accessible.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {movies.map((movie, i) => (
                <MovieCard
                  key={`${movie.topic_url}-${i}`}
                  movie={movie}
                  onSelect={handleSelectMovie}
                />
              ))}
            </div>

            {/* Pagination (browse mode only) */}
            {!searchQuery.trim() && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm bg-[#141519] text-white rounded-md disabled:opacity-30 hover:bg-[#23252b] transition-colors"
                >
                  Previous
                </button>
                <span className="text-[#a0a0a0] text-sm">Page {page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={movies.length === 0}
                  className="px-4 py-2 text-sm bg-[#141519] text-white rounded-md disabled:opacity-30 hover:bg-[#23252b] transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Active Downloads Section */}
        {activeDownloads.length > 0 && (
          <div className="mt-12">
            <h2 className="text-white text-lg font-semibold mb-4">
              Active Downloads
            </h2>
            <div className="space-y-2">
              {activeDownloads.map(([id, job]) => (
                <div key={id} className="bg-[#141519] rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-sm font-medium line-clamp-1">
                      {job.title}
                    </p>
                    <span className="text-[10px] text-[#F47521] shrink-0 ml-2">
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#23252b] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F47521] rounded-full transition-all"
                      style={{ width: `${Math.min(100, job.progress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#6b6b6b] mt-1">
                    <span>
                      {job.resolution || ''} {job.language || ''}
                    </span>
                    <span>{Math.round(job.progress)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Variant Modal */}
      {selectedMovie && (
        <VariantModal
          movie={selectedMovie}
          variants={variants}
          loadingVariants={loadingVariants}
          onClose={() => setSelectedMovie(null)}
          onDownload={handleDownload}
          downloadingVariant={downloadingVariant}
        />
      )}
    </div>
  );
}
