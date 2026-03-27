import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { createDb, runMigrations, type DB } from './db/index.js';
import healthRoutes from './routes/health.js';
import type Database from 'better-sqlite3';

export interface AppOptions {
  dbPath: string;
  pin?: string;
  allowedOrigins?: string[];
  /** Disable rate limiting (useful for tests) */
  disableRateLimit?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
    sqlite: Database.Database;
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

  return app;
}
