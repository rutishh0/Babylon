import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Library Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  async function createMedia(title: string, type = 'movie', genres: string[] = []) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, type, genres }),
    });
    return res.json();
  }

  async function putProgress(mediaId: string, positionSeconds: number, durationSeconds: number) {
    return app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaId}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ positionSeconds, durationSeconds }),
    });
  }

  it('returns empty home screen when no data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/library/home' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.continueWatching).toEqual([]);
    expect(body.recentlyAdded).toEqual([]);
    expect(body.genreRows).toEqual([]);
  });

  it('includes recently added media', async () => {
    await createMedia('Dune', 'movie', ['Sci-Fi']);
    await createMedia('Inception', 'movie', ['Action']);

    const res = await app.inject({ method: 'GET', url: '/api/library/home' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.recentlyAdded).toHaveLength(2);
    // Most recently added is first
    expect(body.recentlyAdded[0].title).toBe('Inception');
  });

  it('includes continue watching with progress', async () => {
    const mediaItem = await createMedia('The Matrix', 'movie');
    await putProgress(mediaItem.id, 1200, 7200);

    const res = await app.inject({ method: 'GET', url: '/api/library/home' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.continueWatching).toHaveLength(1);
    expect(body.continueWatching[0].id).toBe(mediaItem.id);
    expect(body.continueWatching[0].progress.positionSeconds).toBe(1200);
  });

  it('groups media by genre in genreRows', async () => {
    await createMedia('The Dark Knight', 'movie', ['Action', 'Drama']);
    await createMedia('Mad Max', 'movie', ['Action', 'Sci-Fi']);

    const res = await app.inject({ method: 'GET', url: '/api/library/home' });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    const actionRow = body.genreRows.find((r: { genre: string }) => r.genre === 'Action');
    expect(actionRow).toBeDefined();
    expect(actionRow.media).toHaveLength(2);
    const titles = actionRow.media.map((m: { title: string }) => m.title);
    expect(titles).toContain('The Dark Knight');
    expect(titles).toContain('Mad Max');
  });

  it('returns genre counts sorted by count desc', async () => {
    await createMedia('Film A', 'movie', ['Action', 'Drama']);
    await createMedia('Film B', 'movie', ['Action', 'Comedy']);
    await createMedia('Film C', 'movie', ['Drama']);

    const res = await app.inject({ method: 'GET', url: '/api/library/genres' });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Action: 2, Drama: 2, Comedy: 1 — sorted by count desc
    expect(body[0].count).toBeGreaterThanOrEqual(body[1].count);
    expect(body[1].count).toBeGreaterThanOrEqual(body[2].count);

    const actionEntry = body.find((g: { genre: string }) => g.genre === 'Action');
    expect(actionEntry).toBeDefined();
    expect(actionEntry.count).toBe(2);

    const comedyEntry = body.find((g: { genre: string }) => g.genre === 'Comedy');
    expect(comedyEntry).toBeDefined();
    expect(comedyEntry.count).toBe(1);
  });
});
