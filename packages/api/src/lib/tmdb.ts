const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

export interface TMDBDetail {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: Array<{ id: number; name: string }>;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  posterUrl: string | null;
  backdropUrl: string | null;
}

export function createTmdbClient(readAccessToken: string) {
  const headers = {
    Authorization: `Bearer ${readAccessToken}`,
    'Content-Type': 'application/json',
  };

  async function apiFetch<T>(path: string): Promise<T> {
    const response = await fetch(`${TMDB_BASE}${path}`, { headers });
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  return {
    async search(
      query: string,
      type: 'movie' | 'tv'
    ): Promise<TMDBSearchResult[]> {
      const encoded = encodeURIComponent(query);
      const data = await apiFetch<{ results: TMDBSearchResult[] }>(
        `/search/${type}?query=${encoded}&include_adult=false&language=en-US&page=1`
      );
      return data.results;
    },

    async getDetail(id: number, type: 'movie' | 'tv'): Promise<TMDBDetail> {
      const data = await apiFetch<TMDBDetail>(`/${type}/${id}?language=en-US`);
      return {
        ...data,
        posterUrl: data.poster_path ? `${POSTER_BASE}${data.poster_path}` : null,
        backdropUrl: data.backdrop_path ? `${BACKDROP_BASE}${data.backdrop_path}` : null,
      };
    },

    mapGenres(genreIds: number[]): string[] {
      return genreIds.map((id) => GENRE_MAP[id]).filter(Boolean);
    },
  };
}

export type TMDB = ReturnType<typeof createTmdbClient>;
