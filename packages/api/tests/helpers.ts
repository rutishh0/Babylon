import { buildApp, type AppOptions } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

export async function createTestApp(overrides?: Partial<AppOptions>): Promise<FastifyInstance> {
  return buildApp({
    dbPath: ':memory:',
    pin: undefined,
    allowedOrigins: ['http://localhost:3000'],
    ...overrides,
  });
}
