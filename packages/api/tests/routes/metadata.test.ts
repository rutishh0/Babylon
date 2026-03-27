import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Metadata Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp({
      tmdbReadAccessToken: 'test-tmdb-token',
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  // ── GET /api/metadata/search ───────────────────────────────────────────────

  it('searches TMDB for movies', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 27205,
            title: 'Inception',
            overview: 'A thief who steals corporate secrets',
            poster_path: '/poster.jpg',
            backdrop_path: null,
            genre_ids: [28, 878],
            release_date: '2010-07-16',
            vote_average: 8.8,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await app.inject({
      method: 'GET',
      url: '/api/metadata/search?q=inception&type=movie',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Inception');
    expect(body[0].source).toBe('tmdb');
    expect(body[0].externalId).toBe('27205');
    expect(body[0].year).toBe(2010);
    expect(body[0].posterUrl).toContain('/poster.jpg');
  });

  it('searches Jikan for anime', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            mal_id: 16498,
            title: 'Shingeki no Kyojin',
            title_english: 'Attack on Titan',
            synopsis: 'Humanity lives inside cities surrounded by enormous walls',
            images: {
              jpg: {
                image_url: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
                large_image_url: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
              },
            },
            genres: [{ mal_id: 1, name: 'Action' }, { mal_id: 8, name: 'Drama' }],
            episodes: 25,
            score: 8.54,
            year: 2013,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await app.inject({
      method: 'GET',
      url: '/api/metadata/search?q=attack+on+titan&type=anime',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Attack on Titan');
    expect(body[0].source).toBe('jikan');
    expect(body[0].externalId).toBe('16498');
    expect(body[0].year).toBe(2013);
    expect(body[0].genres).toContain('Action');
  });

  it('returns 400 when q parameter is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/metadata/search?type=movie',
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeDefined();
  });

  it('applies Jikan metadata to existing anime entry', async () => {
    // Create an anime entry first
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Placeholder',
        type: 'anime',
        source: 'jikan',
        externalId: '16498',
      }),
    });
    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json();

    // Mock Jikan detail endpoint
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          mal_id: 16498,
          title: 'Shingeki no Kyojin',
          title_english: 'Attack on Titan',
          synopsis: 'Humanity lives inside cities surrounded by enormous walls',
          images: {
            jpg: {
              image_url: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
              large_image_url: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
            },
          },
          genres: [{ mal_id: 1, name: 'Action' }, { mal_id: 8, name: 'Drama' }],
          episodes: 25,
          score: 8.54,
          year: 2013,
          aired: { from: '2013-04-06' },
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await app.inject({
      method: 'POST',
      url: `/api/metadata/apply/${id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe('Attack on Titan');
    expect(body.description).toContain('Humanity');
    expect(body.genres).toContain('Action');
  });

  it('returns 404 for missing media on apply', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/metadata/apply/nonexistent-id',
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error).toBe('Media not found');
  });
});
