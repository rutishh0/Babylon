import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Media CRUD Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /api/media ──────────────────────────────────────────────────────────

  it('POST /api/media — creates media entry (201 with id, title, type, createdAt)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Attack on Titan', type: 'anime' }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe('Attack on Titan');
    expect(body.type).toBe('anime');
    expect(body.createdAt).toBeDefined();
  });

  it('POST /api/media — rejects invalid payload (empty title → 400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '', type: 'anime' }),
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/media — accepts full metadata (genres array, rating, year, source, externalId)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Inception',
        type: 'movie',
        genres: ['Action', 'Sci-Fi'],
        rating: 8.8,
        year: 2010,
        source: 'tmdb',
        externalId: '27205',
        description: 'A thief who steals corporate secrets',
      }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.genres).toEqual(['Action', 'Sci-Fi']);
    expect(body.rating).toBe(8.8);
    expect(body.year).toBe(2010);
    expect(body.source).toBe('tmdb');
    expect(body.externalId).toBe('27205');
  });

  // ── GET /api/media ───────────────────────────────────────────────────────────

  it('GET /api/media — returns empty list initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/media' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual([]);
  });

  it('GET /api/media — returns created media', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Breaking Bad', type: 'series' }),
    });

    const res = await app.inject({ method: 'GET', url: '/api/media' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Breaking Bad');
  });

  it('GET /api/media?type=anime — filters by type', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Naruto', type: 'anime' }),
    });
    await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'The Matrix', type: 'movie' }),
    });

    const res = await app.inject({ method: 'GET', url: '/api/media?type=anime' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Naruto');
  });

  it('GET /api/media?q=titan — searches by title (partial match, case-insensitive)', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Attack on Titan', type: 'anime' }),
    });
    await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Naruto', type: 'anime' }),
    });

    const res = await app.inject({ method: 'GET', url: '/api/media?q=titan' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Attack on Titan');
  });

  it('GET /api/media?limit=2&offset=2 — paginates', async () => {
    for (const title of ['A', 'B', 'C', 'D', 'E']) {
      await app.inject({
        method: 'POST',
        url: '/api/media',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, type: 'movie' }),
      });
    }

    const res = await app.inject({ method: 'GET', url: '/api/media?limit=2&offset=2' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
  });

  // ── GET /api/media/:id ───────────────────────────────────────────────────────

  it('GET /api/media/:id — returns full detail', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Dune',
        type: 'movie',
        genres: ['Sci-Fi'],
        year: 2021,
      }),
    });
    const { id } = created.json();

    const res = await app.inject({ method: 'GET', url: `/api/media/${id}` });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(id);
    expect(body.title).toBe('Dune');
    expect(body.genres).toEqual(['Sci-Fi']);
    expect(body.year).toBe(2021);
  });

  it('GET /api/media/:id — returns 404 for missing id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/media/nonexistent-id' });

    expect(res.statusCode).toBe(404);
  });

  // ── PATCH /api/media/:id ─────────────────────────────────────────────────────

  it('PATCH /api/media/:id — updates media fields', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Old Title', type: 'movie' }),
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/media/${id}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'New Title', rating: 9.0 }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe('New Title');
    expect(body.rating).toBe(9.0);
  });

  // ── DELETE /api/media/:id ────────────────────────────────────────────────────

  it('DELETE /api/media/:id — deletes media (returns 204)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'To Delete', type: 'movie' }),
    });
    const { id } = created.json();

    const deleteRes = await app.inject({ method: 'DELETE', url: `/api/media/${id}` });
    expect(deleteRes.statusCode).toBe(204);

    const getRes = await app.inject({ method: 'GET', url: `/api/media/${id}` });
    expect(getRes.statusCode).toBe(404);
  });
});
