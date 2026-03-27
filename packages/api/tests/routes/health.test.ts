import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Health + Auth', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('health check bypasses PIN auth', async () => {
    const pinApp = await createTestApp({ pin: '1234' });
    const res = await pinApp.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    await pinApp.close();
  });

  it('rejects requests with wrong PIN', async () => {
    const pinApp = await createTestApp({ pin: '1234' });
    const res = await pinApp.inject({
      method: 'GET',
      url: '/api/media',
      headers: { 'x-babylon-pin': 'wrong' },
    });
    expect(res.statusCode).toBe(401);
    await pinApp.close();
  });

  it('accepts requests with correct PIN', async () => {
    const pinApp = await createTestApp({ pin: '1234' });
    const res = await pinApp.inject({
      method: 'GET',
      url: '/api/media',
      headers: { 'x-babylon-pin': '1234' },
    });
    // PIN was accepted — route doesn't exist yet so 404, not 401
    expect(res.statusCode).not.toBe(401);
    await pinApp.close();
  });

  it('allows all requests when no PIN configured', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/media' });
    // No PIN configured — request goes through, route doesn't exist so 404
    expect(res.statusCode).not.toBe(401);
  });
});
