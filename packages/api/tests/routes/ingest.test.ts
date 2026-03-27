import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Ingest Routes', () => {
  let app: FastifyInstance;
  let stateDir: string;

  beforeEach(async () => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'babylon-ingest-test-'));
    app = await createTestApp({ ingestStateDir: stateDir });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
    // Clean up temp dir
    fs.rmSync(stateDir, { recursive: true, force: true });
  });

  // 1. GET /api/ingest/watchlist — returns empty array initially
  it('returns empty watchlist initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ingest/watchlist' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  // 2. POST /api/ingest/watchlist — adds show, verify it appears in GET
  it('adds a show to the watchlist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ingest/watchlist',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Attack on Titan' }),
    });
    expect(res.statusCode).toBe(201);
    const entry = res.json();
    expect(entry.title).toBe('Attack on Titan');
    expect(entry.mode).toBe('backlog');
    expect(entry.season).toBe(1);

    // Verify it appears in GET
    const listRes = await app.inject({ method: 'GET', url: '/api/ingest/watchlist' });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Attack on Titan');
  });

  // 3. POST /api/ingest/watchlist — rejects duplicate (409)
  it('rejects duplicate watchlist entry with 409', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/ingest/watchlist',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Demon Slayer' }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/ingest/watchlist',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Demon Slayer' }),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBeDefined();
  });

  // 4. DELETE /api/ingest/watchlist/:title — removes show (204)
  it('removes a show from the watchlist with 204', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/ingest/watchlist',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'One Piece' }),
    });

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/ingest/watchlist/${encodeURIComponent('One Piece')}`,
    });
    expect(delRes.statusCode).toBe(204);

    // Verify it's gone
    const listRes = await app.inject({ method: 'GET', url: '/api/ingest/watchlist' });
    expect(listRes.json()).toEqual([]);
  });

  // 5. DELETE /api/ingest/watchlist/:title — returns 404 for missing
  it('returns 404 when deleting a non-existent show', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/ingest/watchlist/${encodeURIComponent('Nonexistent Show')}`,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBeDefined();
  });

  // 6. GET /api/ingest/status — returns default status when no daemon running
  it('returns default status when no daemon is running', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ingest/status' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.running).toBe(false);
    expect(body.lastPollAt).toBeNull();
    expect(body.currentTask).toBeNull();
    expect(body.queue).toEqual([]);
  });

  // 7. POST /api/ingest/trigger — creates trigger file on disk
  it('creates a trigger file on disk when triggered', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/ingest/trigger' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ triggered: true });

    const triggerPath = path.join(stateDir, 'trigger');
    expect(fs.existsSync(triggerPath)).toBe(true);
    const content = fs.readFileSync(triggerPath, 'utf-8');
    expect(content).toBeTruthy();
  });

  // 8. GET /api/ingest/search — requires q parameter (400)
  it('returns 400 when search query is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ingest/search' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBeDefined();
  });

  // 9. POST /api/ingest/queue — adds to watchlist and triggers
  it('queues a title and triggers the daemon', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await app.inject({
      method: 'POST',
      url: '/api/ingest/queue',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Fullmetal Alchemist' }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.queued).toBe(true);
    expect(body.title).toBe('Fullmetal Alchemist');

    // Verify watchlist updated
    const listRes = await app.inject({ method: 'GET', url: '/api/ingest/watchlist' });
    const list = listRes.json();
    expect(list.some((e: { title: string }) => e.title === 'Fullmetal Alchemist')).toBe(true);

    // Verify trigger file written
    const triggerPath = path.join(stateDir, 'trigger');
    expect(fs.existsSync(triggerPath)).toBe(true);
  });

  // 10. POST /api/ingest/queue — returns alreadyInLibrary if title matches EXACTLY (case-insensitive)
  it('returns alreadyInLibrary when title exists in DB (case-insensitive exact match)', async () => {
    // Add media to library first
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Solo Leveling', type: 'anime' }),
    });
    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json();

    // Queue with different casing — should match
    const res = await app.inject({
      method: 'POST',
      url: '/api/ingest/queue',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'solo leveling' }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.alreadyInLibrary).toBe(true);
    expect(body.mediaId).toBe(id);
  });

  // 11. POST /api/ingest/queue — does NOT match partial titles
  it('does NOT match partial titles (Solo should NOT match Solo Leveling)', async () => {
    // Add "Solo Leveling" to library
    await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Solo Leveling', type: 'anime' }),
    });

    // Queue "Solo" — should NOT find "Solo Leveling"
    const res = await app.inject({
      method: 'POST',
      url: '/api/ingest/queue',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Solo' }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.alreadyInLibrary).toBeUndefined();
    expect(body.queued).toBe(true);
  });
});
