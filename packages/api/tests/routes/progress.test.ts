import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Watch Progress Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  async function createMedia(title = 'Test Movie', type = 'movie') {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, type }),
    });
    return res.json();
  }

  it('updates and retrieves watch progress', async () => {
    const mediaItem = await createMedia('Inception', 'movie');

    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaItem.id}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ positionSeconds: 1200, durationSeconds: 7200 }),
    });
    expect(putRes.statusCode).toBe(200);

    const getRes = await app.inject({ method: 'GET', url: '/api/progress' });
    expect(getRes.statusCode).toBe(200);
    const items = getRes.json();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(mediaItem.id);
    expect(items[0].progress.positionSeconds).toBe(1200);
    expect(items[0].progress.durationSeconds).toBe(7200);
  });

  it('overwrites existing progress on second PUT', async () => {
    const mediaItem = await createMedia('Breaking Bad', 'series');

    await app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaItem.id}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ positionSeconds: 500, durationSeconds: 3600 }),
    });

    await app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaItem.id}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ positionSeconds: 1800, durationSeconds: 3600 }),
    });

    const getRes = await app.inject({ method: 'GET', url: '/api/progress' });
    expect(getRes.statusCode).toBe(200);
    const items = getRes.json();
    expect(items).toHaveLength(1);
    expect(items[0].progress.positionSeconds).toBe(1800);
  });

  it('deletes progress on DELETE', async () => {
    const mediaItem = await createMedia('The Matrix', 'movie');

    await app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaItem.id}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ positionSeconds: 600, durationSeconds: 7200 }),
    });

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/progress/${mediaItem.id}`,
    });
    expect(deleteRes.statusCode).toBe(204);

    const getRes = await app.inject({ method: 'GET', url: '/api/progress' });
    expect(getRes.statusCode).toBe(200);
    const items = getRes.json();
    expect(items).toHaveLength(0);
  });

  it('marks completed when position near duration (>95%)', async () => {
    const mediaItem = await createMedia('Spirited Away', 'anime');

    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaItem.id}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ positionSeconds: 7150, durationSeconds: 7200 }),
    });
    expect(putRes.statusCode).toBe(200);
    const body = putRes.json();
    expect(body.completed).toBe(true);

    // Completed items should not appear in Continue Watching
    const getRes = await app.inject({ method: 'GET', url: '/api/progress' });
    const items = getRes.json();
    expect(items).toHaveLength(0);
  });
});
