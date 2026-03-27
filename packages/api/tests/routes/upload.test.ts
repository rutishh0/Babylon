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

describe('Upload Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp({ s3Config: testS3Config });
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /api/upload/initiate ──────────────────────────────────────────────

  it('returns presigned upload URL for a movie', async () => {
    // Create media first
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Inception', type: 'movie' }),
    });
    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json();

    // Initiate upload
    const res = await app.inject({
      method: 'POST',
      url: '/api/upload/initiate',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'inception.mp4',
        contentType: 'video/mp4',
        mediaId: id,
        type: 'movie',
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.uploadUrl).toBeDefined();
    expect(typeof body.uploadUrl).toBe('string');
    expect(body.s3Key).toBeDefined();
    expect(body.s3Key).toContain(id);
    expect(body.s3Key).toContain('inception.mp4');
  });

  it('rejects invalid payload with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/upload/initiate',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        // missing required fields: filename, contentType, mediaId, type
        filename: '',
      }),
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeDefined();
  });

  // ── POST /api/upload/complete ──────────────────────────────────────────────

  it('records uploaded file in database (creates mediaFile for movie)', async () => {
    // Create media
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/media',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Dune', type: 'movie' }),
    });
    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json();

    // Complete upload
    const s3Key = `movies/${id}/dune.mp4`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/upload/complete',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        s3Key,
        mediaId: id,
        fileSize: 1024000,
        duration: 9000,
        format: 'mp4',
        originalFilename: 'dune.mp4',
      }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.mediaFileId).toBeDefined();

    // Verify the file appears in media detail
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/media/${id}`,
    });
    expect(detailRes.statusCode).toBe(200);
    const detail = detailRes.json();
    expect(detail.mediaFile).not.toBeNull();
    expect(detail.mediaFile.s3Key).toBe(s3Key);
    expect(detail.mediaFile.fileSize).toBe(1024000);
  });
});
