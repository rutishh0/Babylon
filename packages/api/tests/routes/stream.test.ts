import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

const testS3Config = {
  accessKeyId: 'test-key',
  secretAccessKey: 'test-secret',
  bucket: 'test-bucket',
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
};

describe('Streaming Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp({ s3Config: testS3Config });
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /api/stream/:id ────────────────────────────────────────────────────

  it('returns presigned stream URL for a movie with a file', async () => {
    // Create media
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Inception', type: 'movie' }),
    });
    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json();

    // Complete upload to record the file
    const s3Key = `movies/${id}/inception.mp4`;
    const completeRes = await app.inject({
      method: 'POST',
      url: '/api/upload/complete',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        s3Key,
        mediaId: id,
        fileSize: 2048000,
        format: 'mp4',
        originalFilename: 'inception.mp4',
      }),
    });
    expect(completeRes.statusCode).toBe(201);

    // Get stream URL
    const res = await app.inject({
      method: 'GET',
      url: `/api/stream/${id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.streamUrl).toBeDefined();
    expect(typeof body.streamUrl).toBe('string');
    expect(body.s3Key).toBe(s3Key);
  });

  it('returns 404 for media with no file', async () => {
    // Create media but don't upload any file
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'No File Movie', type: 'movie' }),
    });
    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json();

    const res = await app.inject({
      method: 'GET',
      url: `/api/stream/${id}`,
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error).toBeDefined();
  });
});
