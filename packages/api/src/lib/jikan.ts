const JIKAN_BASE = 'https://api.jikan.moe/v4';

// Jikan allows ~3 requests/second; we use a 400ms delay to stay safe
const RATE_LIMIT_MS = 400;

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export interface JikanAnimeResult {
  mal_id: number;
  title: string;
  title_english: string | null;
  synopsis: string | null;
  images: {
    jpg: {
      image_url: string | null;
      large_image_url: string | null;
    };
  };
  genres: Array<{ mal_id: number; name: string }>;
  episodes: number | null;
  score: number | null;
  year: number | null;
  aired: {
    from: string | null;
  };
}

export interface JikanSearchResult {
  mal_id: number;
  title: string;
  title_english: string | null;
  synopsis: string | null;
  images: {
    jpg: {
      image_url: string | null;
      large_image_url: string | null;
    };
  };
  genres: Array<{ mal_id: number; name: string }>;
  episodes: number | null;
  score: number | null;
  year: number | null;
}

export function createJikanClient() {
  async function apiFetch<T>(path: string): Promise<T> {
    await rateLimit();
    const response = await fetch(`${JIKAN_BASE}${path}`);
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  return {
    async search(query: string): Promise<JikanSearchResult[]> {
      const encoded = encodeURIComponent(query);
      const data = await apiFetch<{ data: JikanSearchResult[] }>(
        `/anime?q=${encoded}&sfw=true&limit=10`
      );
      return data.data;
    },

    async getDetail(malId: number): Promise<JikanAnimeResult> {
      const data = await apiFetch<{ data: JikanAnimeResult }>(`/anime/${malId}`);
      return data.data;
    },
  };
}

export type Jikan = ReturnType<typeof createJikanClient>;
