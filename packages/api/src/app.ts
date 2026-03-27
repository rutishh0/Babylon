import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { createDb, runMigrations, type DB } from './db/index.js';
import healthRoutes from './routes/health.js';
import mediaRoutes from './routes/media.js';
import metadataRoutes from './routes/metadata.js';
import uploadRoutes from './routes/upload.js';
import streamRoutes from './routes/stream.js';
import progressRoutes from './routes/progress.js';
import libraryRoutes from './routes/library.js';
import type Database from 'better-sqlite3';
import { createS3Client, type S3, type S3Config } from './lib/s3.js';
import { createTmdbClient, type TMDB } from './lib/tmdb.js';
import { createJikanClient, type Jikan } from './lib/jikan.js';

export interface AppOptions {
  dbPath: string;
  pin?: string;
  allowedOrigins?: string[];
  /** Disable rate limiting (useful for tests) */
  disableRateLimit?: boolean;
  s3Config?: S3Config;
  tmdbReadAccessToken?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
    sqlite: Database.Database;
    s3: S3;
    tmdb: TMDB;
    jikan: Jikan;
  }
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Database
  const { db, sqlite } = createDb(options.dbPath);
  runMigrations(db);
  app.decorate('db', db);
  app.decorate('sqlite', sqlite);
  app.addHook('onClose', () => sqlite.close());

  // S3 client (optional — skipped when no s3Config provided)
  if (options.s3Config) {
    const s3 = createS3Client(options.s3Config);
    app.decorate('s3', s3);
  }

  // TMDB client (optional — skipped when no token provided)
  if (options.tmdbReadAccessToken) {
    const tmdb = createTmdbClient(options.tmdbReadAccessToken);
    app.decorate('tmdb', tmdb);
  }

  // Jikan client (always created — no auth needed)
  const jikan = createJikanClient();
  app.decorate('jikan', jikan);

  // CORS
  await app.register(cors, {
    origin: options.allowedOrigins || ['http://localhost:3000'],
  });

  // Rate limiting — disabled in test mode or when explicitly turned off
  if (!options.disableRateLimit) {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });
  }

  // PIN authentication
  if (options.pin) {
    app.addHook('onRequest', async (request, reply) => {
      if (request.url === '/api/health') return;
      const pin = request.headers['x-babylon-pin'];
      if (pin !== options.pin) {
        reply.status(401).send({ error: 'Invalid PIN' });
      }
    });
  }

  // Routes
  await app.register(healthRoutes);
  await app.register(mediaRoutes);
  await app.register(metadataRoutes);
  await app.register(uploadRoutes);
  await app.register(streamRoutes);
  await app.register(progressRoutes);
  await app.register(libraryRoutes);

  return app;
}
