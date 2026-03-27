# Babylon Backend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Fastify API and shared types package that serve as the foundation for all Babylon clients (web, Android, CLI) and the ingest pipeline.

**Architecture:** TypeScript monorepo (pnpm + Turborepo) with a shared Zod validation package consumed by the Fastify API. SQLite via Drizzle ORM for persistence. Scaleway S3 via presigned URLs for media storage. PIN auth + rate limiting for security.

**Tech Stack:** TypeScript 5, Fastify 5, Drizzle ORM, better-sqlite3, @aws-sdk/client-s3 v3, Zod, Vitest, pnpm, Turborepo

---

## Scope

This plan covers **Phase 1** of Babylon: `packages/shared` (types + validation) and `packages/api` (Fastify HTTP server with all endpoints).

**Subsequent plans** (written after this one is executed):
- **Plan 2:** Ingest Pipeline + VPS Deployment
- **Plan 3:** Web Frontend (Next.js)
- **Plan 4:** CLI Tool
- **Plan 5:** Android App + GitHub Actions CI

## File Structure

```
babylon/
├── package.json                          # pnpm workspace root
├── pnpm-workspace.yaml                   # workspace config
├── turbo.json                            # Turborepo pipeline
├── tsconfig.base.json                    # shared TS config
├── .gitignore
├── .env.example
│
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                  # re-exports
│   │   │   └── types.ts                  # Zod schemas + TS types
│   │   └── tests/
│   │       └── types.test.ts             # schema validation tests
│   │
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       ├── drizzle.config.ts
│       ├── src/
│       │   ├── index.ts                  # entry point: load env, start server
│       │   ├── app.ts                    # buildApp factory
│       │   ├── db/
│       │   │   ├── schema.ts             # Drizzle table definitions
│       │   │   └── index.ts              # createDb + migrate helper
│       │   ├── lib/
│       │   │   ├── s3.ts                 # Scaleway S3 presigned URL helpers
│       │   │   ├── tmdb.ts               # TMDB API client
│       │   │   ├── jikan.ts              # Jikan (MAL) API client
│       │   │   └── watchlist.ts          # watchlist.json read/write
│       │   └── routes/
│       │       ├── health.ts             # GET /api/health
│       │       ├── media.ts              # CRUD /api/media
│       │       ├── metadata.ts           # /api/metadata/search, /apply
│       │       ├── upload.ts             # /api/upload/initiate, /complete, /bulk
│       │       ├── stream.ts             # /api/stream/:id
│       │       ├── progress.ts           # /api/progress
│       │       ├── library.ts            # /api/library/home, /genres
│       │       └── ingest.ts             # /api/ingest/*
│       ├── tests/
│       │   ├── helpers.ts                # createTestApp factory
│       │   └── routes/
│       │       ├── health.test.ts
│       │       ├── media.test.ts
│       │       ├── metadata.test.ts
│       │       ├── upload.test.ts
│       │       ├── stream.test.ts
│       │       ├── progress.test.ts
│       │       ├── library.test.ts
│       │       └── ingest.test.ts
│       └── drizzle/                      # generated migrations (gitignored pattern: keep)
```

---

## Task 1: Monorepo Scaffolding + Git Init

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`

- [ ] **Step 1: Initialize git repository**

```bash
cd "C:/Users/Rutishkrishna/Desktop/Sefl Projects/Babylon"
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "babylon",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.8.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 4: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 5: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.env
*.db
*.db-journal
*.db-wal
.turbo/
.DS_Store
```

- [ ] **Step 7: Create .env.example**

```bash
# Scaleway Object Storage
SCALEWAY_ACCESS_KEY=
SCALEWAY_SECRET_KEY=
SCALEWAY_BUCKET=Babylon
SCALEWAY_REGION=it-mil
SCALEWAY_ENDPOINT=https://s3.it-mil.scw.cloud

# TMDB Metadata
TMDB_API_KEY=
TMDB_READ_ACCESS_TOKEN=

# App Config
BABYLON_PIN=
DATABASE_URL=file:./babylon.db
ALLOWED_ORIGINS=http://localhost:3000
PORT=3000

# Ingest State
INGEST_STATE_DIR=./data/ingest
```

- [ ] **Step 8: Install root dependencies and verify**

Run: `pnpm install`

Expected: lockfile created, `turbo` and `typescript` installed.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore .env.example pnpm-lock.yaml
git commit -m "chore: initialize monorepo with pnpm + Turborepo"
```

---

## Task 2: Shared Types + Validation Package

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/types.ts`, `packages/shared/src/index.ts`, `packages/shared/tests/types.test.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@babylon/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["tests", "dist"]
}
```

- [ ] **Step 3: Write the failing test — packages/shared/tests/types.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import {
  CreateMediaSchema,
  UpdateMediaSchema,
  ListMediaQuerySchema,
  UpdateProgressSchema,
  InitiateUploadSchema,
  CompleteUploadSchema,
  AddToWatchlistSchema,
  QueueIngestSchema,
  MediaType,
} from '../src/types';

describe('MediaType', () => {
  it('accepts valid types', () => {
    expect(MediaType.parse('movie')).toBe('movie');
    expect(MediaType.parse('series')).toBe('series');
    expect(MediaType.parse('anime')).toBe('anime');
  });

  it('rejects invalid types', () => {
    expect(() => MediaType.parse('podcast')).toThrow();
  });
});

describe('CreateMediaSchema', () => {
  it('validates a complete media entry', () => {
    const input = {
      title: 'Attack on Titan',
      type: 'anime',
      description: 'Giants attack humanity',
      genres: ['Action', 'Drama'],
      rating: 9.0,
      year: 2013,
      source: 'jikan',
      externalId: '16498',
    };
    const result = CreateMediaSchema.parse(input);
    expect(result.title).toBe('Attack on Titan');
    expect(result.type).toBe('anime');
  });

  it('requires title and type', () => {
    expect(() => CreateMediaSchema.parse({})).toThrow();
    expect(() => CreateMediaSchema.parse({ title: 'Test' })).toThrow();
  });

  it('rejects empty title', () => {
    expect(() => CreateMediaSchema.parse({ title: '', type: 'movie' })).toThrow();
  });

  it('accepts minimal input', () => {
    const result = CreateMediaSchema.parse({ title: 'Inception', type: 'movie' });
    expect(result.title).toBe('Inception');
    expect(result.description).toBeUndefined();
  });
});

describe('UpdateMediaSchema', () => {
  it('allows partial updates', () => {
    const result = UpdateMediaSchema.parse({ title: 'New Title' });
    expect(result.title).toBe('New Title');
    expect(result.type).toBeUndefined();
  });

  it('accepts empty object', () => {
    const result = UpdateMediaSchema.parse({});
    expect(result).toEqual({});
  });
});

describe('ListMediaQuerySchema', () => {
  it('applies defaults', () => {
    const result = ListMediaQuerySchema.parse({});
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('coerces string numbers', () => {
    const result = ListMediaQuerySchema.parse({ limit: '20', offset: '10' });
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(10);
  });

  it('clamps limit to 100', () => {
    expect(() => ListMediaQuerySchema.parse({ limit: 200 })).toThrow();
  });
});

describe('UpdateProgressSchema', () => {
  it('validates progress update', () => {
    const result = UpdateProgressSchema.parse({
      positionSeconds: 120.5,
      durationSeconds: 1440,
    });
    expect(result.positionSeconds).toBe(120.5);
    expect(result.episodeId).toBeUndefined();
  });

  it('rejects negative position', () => {
    expect(() =>
      UpdateProgressSchema.parse({ positionSeconds: -1, durationSeconds: 100 })
    ).toThrow();
  });
});

describe('InitiateUploadSchema', () => {
  it('validates upload initiation', () => {
    const result = InitiateUploadSchema.parse({
      filename: 'movie.mp4',
      contentType: 'video/mp4',
      mediaId: '01HXYZ',
      type: 'movie',
    });
    expect(result.filename).toBe('movie.mp4');
  });

  it('requires all mandatory fields', () => {
    expect(() => InitiateUploadSchema.parse({ filename: 'test.mp4' })).toThrow();
  });
});

describe('CompleteUploadSchema', () => {
  it('validates upload completion', () => {
    const result = CompleteUploadSchema.parse({
      s3Key: 'movies/01HXYZ/movie.mp4',
      mediaId: '01HXYZ',
    });
    expect(result.s3Key).toBe('movies/01HXYZ/movie.mp4');
  });
});

describe('AddToWatchlistSchema', () => {
  it('validates with defaults', () => {
    const result = AddToWatchlistSchema.parse({ title: 'Attack on Titan' });
    expect(result.aliases).toEqual([]);
    expect(result.season).toBe(1);
  });

  it('accepts aliases', () => {
    const result = AddToWatchlistSchema.parse({
      title: 'Quanzhi Fashi',
      aliases: ['Full-Time Magister', 'Quan Zhi Fa Shi'],
      season: 3,
    });
    expect(result.aliases).toHaveLength(2);
  });
});

describe('QueueIngestSchema', () => {
  it('validates queue request', () => {
    const result = QueueIngestSchema.parse({ title: 'Solo Leveling' });
    expect(result.title).toBe('Solo Leveling');
    expect(result.nyaaQuery).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd packages/shared && pnpm install && pnpm test`

Expected: FAIL — cannot find module `../src/types`

- [ ] **Step 5: Write packages/shared/src/types.ts**

```typescript
import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────

export const MediaType = z.enum(['movie', 'series', 'anime']);
export type MediaType = z.infer<typeof MediaType>;

export const MetadataSource = z.enum(['tmdb', 'jikan', 'manual', 'ingest']);
export type MetadataSource = z.infer<typeof MetadataSource>;

export const SubtitleFormat = z.enum(['srt', 'vtt', 'ass']);
export type SubtitleFormat = z.infer<typeof SubtitleFormat>;

// ── Request Schemas ────────────────────────────────────

export const CreateMediaSchema = z.object({
  title: z.string().min(1),
  type: MediaType,
  description: z.string().optional(),
  posterUrl: z.string().optional(),
  backdropUrl: z.string().optional(),
  genres: z.array(z.string()).optional(),
  rating: z.number().min(0).max(10).optional(),
  year: z.number().int().optional(),
  source: MetadataSource.optional(),
  externalId: z.string().optional(),
});
export type CreateMediaInput = z.infer<typeof CreateMediaSchema>;

export const UpdateMediaSchema = CreateMediaSchema.partial();
export type UpdateMediaInput = z.infer<typeof UpdateMediaSchema>;

export const ListMediaQuerySchema = z.object({
  type: MediaType.optional(),
  genre: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['title', 'year', 'rating', 'created_at']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListMediaQuery = z.infer<typeof ListMediaQuerySchema>;

export const UpdateProgressSchema = z.object({
  episodeId: z.string().optional(),
  positionSeconds: z.number().min(0),
  durationSeconds: z.number().min(0),
});
export type UpdateProgressInput = z.infer<typeof UpdateProgressSchema>;

export const InitiateUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  mediaId: z.string().min(1),
  type: MediaType,
  seasonNumber: z.number().int().optional(),
  episodeNumber: z.number().int().optional(),
});
export type InitiateUploadInput = z.infer<typeof InitiateUploadSchema>;

export const CompleteUploadSchema = z.object({
  s3Key: z.string().min(1),
  mediaId: z.string().min(1),
  fileSize: z.number().int().optional(),
  duration: z.number().int().optional(),
  format: z.string().optional(),
  originalFilename: z.string().optional(),
  episodeId: z.string().optional(),
});
export type CompleteUploadInput = z.infer<typeof CompleteUploadSchema>;

export const AddToWatchlistSchema = z.object({
  title: z.string().min(1),
  aliases: z.array(z.string()).optional().default([]),
  season: z.number().int().optional().default(1),
});
export type AddToWatchlistInput = z.infer<typeof AddToWatchlistSchema>;

export const QueueIngestSchema = z.object({
  title: z.string().min(1),
  nyaaQuery: z.string().optional(),
});
export type QueueIngestInput = z.infer<typeof QueueIngestSchema>;

// ── Response Types ─────────────────────────────────────

export interface MediaResponse {
  id: string;
  title: string;
  type: MediaType;
  description: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  rating: number | null;
  year: number | null;
  source: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
  seasons?: SeasonResponse[];
  mediaFile?: MediaFileResponse | null;
  progress?: ProgressResponse | null;
}

export interface SeasonResponse {
  id: string;
  seasonNumber: number;
  title: string | null;
  episodes: EpisodeResponse[];
}

export interface EpisodeResponse {
  id: string;
  episodeNumber: number;
  title: string | null;
  duration: number | null;
  thumbnailUrl: string | null;
  s3Key: string | null;
  fileSize: number | null;
  format: string | null;
  progress?: ProgressResponse | null;
}

export interface MediaFileResponse {
  id: string;
  s3Key: string;
  fileSize: number | null;
  duration: number | null;
  format: string | null;
}

export interface ProgressResponse {
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface SubtitleResponse {
  id: string;
  language: string;
  label: string;
  format: string;
}

export interface WatchlistEntry {
  title: string;
  aliases: string[];
  mode: 'rss' | 'backlog';
  season: number;
  addedAt: string;
}

export interface IngestStatus {
  running: boolean;
  lastPollAt: string | null;
  currentTask: {
    title: string;
    state: 'searching' | 'downloading' | 'transcoding' | 'uploading' | 'done';
    progress: number;
  } | null;
  queue: Array<{
    title: string;
    state: 'pending' | 'searching' | 'downloading' | 'transcoding' | 'uploading' | 'done' | 'failed';
    progress: number;
  }>;
}

export interface HomeScreenResponse {
  continueWatching: MediaResponse[];
  recentlyAdded: MediaResponse[];
  genreRows: Array<{
    genre: string;
    media: MediaResponse[];
  }>;
}
```

- [ ] **Step 6: Write packages/shared/src/index.ts**

```typescript
export * from './types.js';
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd packages/shared && pnpm test`

Expected: All 12+ tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types + Zod validation schemas"
```

---

## Task 3: API Project Setup + Database Schema

**Files:**
- Create: `packages/api/package.json`, `packages/api/tsconfig.json`, `packages/api/drizzle.config.ts`, `packages/api/src/db/schema.ts`, `packages/api/src/db/index.ts`

- [ ] **Step 1: Create packages/api/package.json**

```json
{
  "name": "@babylon/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@babylon/shared": "workspace:*",
    "@aws-sdk/client-s3": "^3.750.0",
    "@aws-sdk/s3-request-presigner": "^3.750.0",
    "@fastify/cors": "^11.0.0",
    "@fastify/rate-limit": "^10.2.0",
    "better-sqlite3": "^11.8.0",
    "dotenv": "^16.5.0",
    "drizzle-orm": "^0.39.0",
    "fastify": "^5.2.0",
    "ulid": "^2.3.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Create packages/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["tests", "dist", "drizzle"]
}
```

- [ ] **Step 3: Create packages/api/drizzle.config.ts**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./babylon.db',
  },
});
```

- [ ] **Step 4: Write packages/api/src/db/schema.ts**

```typescript
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type', { enum: ['movie', 'series', 'anime'] }).notNull(),
  description: text('description'),
  posterUrl: text('poster_url'),
  backdropUrl: text('backdrop_url'),
  genres: text('genres'), // JSON array string
  rating: real('rating'),
  year: integer('year'),
  source: text('source', { enum: ['tmdb', 'jikan', 'manual', 'ingest'] }),
  externalId: text('external_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const season = sqliteTable('season', {
  id: text('id').primaryKey(),
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  seasonNumber: integer('season_number').notNull(),
  title: text('title'),
});

export const episode = sqliteTable('episode', {
  id: text('id').primaryKey(),
  seasonId: text('season_id').notNull().references(() => season.id, { onDelete: 'cascade' }),
  episodeNumber: integer('episode_number').notNull(),
  title: text('title'),
  duration: integer('duration'),
  thumbnailUrl: text('thumbnail_url'),
  s3Key: text('s3_key'),
  fileSize: integer('file_size'),
  format: text('format'),
  originalFilename: text('original_filename'),
});

export const mediaFile = sqliteTable('media_file', {
  id: text('id').primaryKey(),
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  s3Key: text('s3_key').notNull(),
  fileSize: integer('file_size'),
  duration: integer('duration'),
  format: text('format'),
  originalFilename: text('original_filename'),
});

export const subtitle = sqliteTable('subtitle', {
  id: text('id').primaryKey(),
  mediaFileId: text('media_file_id').references(() => mediaFile.id, { onDelete: 'cascade' }),
  episodeId: text('episode_id').references(() => episode.id, { onDelete: 'cascade' }),
  language: text('language').notNull(),
  label: text('label').notNull(),
  s3Key: text('s3_key').notNull(),
  format: text('format', { enum: ['srt', 'vtt', 'ass'] }).notNull(),
});

export const watchProgress = sqliteTable('watch_progress', {
  id: text('id').primaryKey(),
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  episodeId: text('episode_id').references(() => episode.id, { onDelete: 'cascade' }),
  positionSeconds: real('position_seconds').notNull(),
  durationSeconds: real('duration_seconds').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  lastWatchedAt: text('last_watched_at').notNull(),
});

export const ingestSeen = sqliteTable(
  'ingest_seen',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    episode: text('episode').notNull(),
    torrentHash: text('torrent_hash'),
    processedAt: text('processed_at').notNull(),
  },
  (table) => [index('idx_ingest_seen_title_episode').on(table.title, table.episode)]
);

export const ingestFailed = sqliteTable('ingest_failed', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  reason: text('reason'),
  failedAt: text('failed_at').notNull(),
});
```

- [ ] **Step 5: Write packages/api/src/db/index.ts**

```typescript
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type DB = BetterSQLite3Database<typeof schema>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createDb(dbPath: string): { db: DB; sqlite: Database.Database } {
  const sqlite = new Database(dbPath === ':memory:' ? ':memory:' : dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export function runMigrations(db: DB, migrationsFolder?: string) {
  const folder = migrationsFolder || path.resolve(__dirname, '../../drizzle');
  migrate(db, { migrationsFolder: folder });
}
```

- [ ] **Step 6: Install dependencies and generate initial migration**

```bash
cd packages/api && pnpm install
pnpm db:generate
```

Expected: `drizzle/` folder created with SQL migration files for all 8 tables.

- [ ] **Step 7: Commit**

```bash
git add packages/api/package.json packages/api/tsconfig.json packages/api/drizzle.config.ts packages/api/src/db/ packages/api/drizzle/ pnpm-lock.yaml
git commit -m "feat: add API project with Drizzle SQLite schema (8 tables)"
```

---

## Task 4: Fastify Server Bootstrap + Auth + Health

**Files:**
- Create: `packages/api/src/app.ts`, `packages/api/src/index.ts`, `packages/api/src/routes/health.ts`, `packages/api/tests/helpers.ts`, `packages/api/tests/routes/health.test.ts`

- [ ] **Step 1: Write failing test — packages/api/tests/routes/health.test.ts**

```typescript
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
    expect(res.statusCode).toBe(200);
    await pinApp.close();
  });

  it('allows all requests when no PIN configured', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/media' });
    expect(res.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Write test helper — packages/api/tests/helpers.ts**

```typescript
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/api && pnpm test`

Expected: FAIL — cannot find module `../src/app.js`

- [ ] **Step 4: Write packages/api/src/routes/health.ts**

```typescript
import type { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/health', async () => {
    return { status: 'ok' };
  });
};

export default healthRoutes;
```

- [ ] **Step 5: Write packages/api/src/app.ts**

```typescript
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

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // PIN authentication
  if (options.pin) {
    app.addHook('onRequest', async (request, reply) => {
      // Health check bypasses auth
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
```

- [ ] **Step 6: Write packages/api/src/index.ts**

```typescript
import 'dotenv/config';
import { buildApp } from './app.js';

const app = await buildApp({
  dbPath: process.env.DATABASE_URL?.replace('file:', '') || './babylon.db',
  pin: process.env.BABYLON_PIN,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(','),
});

const port = parseInt(process.env.PORT || '3000', 10);

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Babylon API running on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd packages/api && pnpm test`

Expected: All 5 tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/app.ts packages/api/src/index.ts packages/api/src/routes/health.ts packages/api/tests/
git commit -m "feat: Fastify server with PIN auth, CORS, rate limiting, health check"
```

---

## Task 5: S3 Client Library

**Files:**
- Create: `packages/api/src/lib/s3.ts`

- [ ] **Step 1: Write packages/api/src/lib/s3.ts**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  endpoint: string;
}

export function createS3Client(config: S3Config) {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return {
    async getStreamUrl(key: string, expiresIn = 14400): Promise<string> {
      const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
      return getSignedUrl(client, command, { expiresIn });
    },

    async getUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: contentType,
      });
      return getSignedUrl(client, command, { expiresIn });
    },

    async deleteObject(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },

    async listObjects(prefix: string): Promise<string[]> {
      const result = await client.send(
        new ListObjectsV2Command({ Bucket: config.bucket, Prefix: prefix })
      );
      return (result.Contents || []).map((obj) => obj.Key!).filter(Boolean);
    },

    buildKey(type: 'movie' | 'series' | 'anime', mediaId: string, parts: {
      seasonNumber?: number;
      episodeNumber?: number;
      filename: string;
    }): string {
      const base = type === 'movie' ? 'movies' : type === 'anime' ? 'anime' : 'series';
      if (parts.seasonNumber != null && parts.episodeNumber != null) {
        return `${base}/${mediaId}/s${parts.seasonNumber}/e${parts.episodeNumber}/${parts.filename}`;
      }
      return `${base}/${mediaId}/${parts.filename}`;
    },

    buildSubtitleKey(parentId: string, language: string, format: string): string {
      return `subtitles/${parentId}/${language}.${format}`;
    },
  };
}

export type S3 = ReturnType<typeof createS3Client>;
```

- [ ] **Step 2: Wire S3 into app.ts — add to buildApp**

Add to `packages/api/src/app.ts`:

After the `import` block, add:
```typescript
import { createS3Client, type S3 } from './lib/s3.js';
```

In the `FastifyInstance` declaration, add `s3: S3;`:
```typescript
declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
    sqlite: Database.Database;
    s3: S3;
  }
}
```

Add `s3Config` to `AppOptions`:
```typescript
export interface AppOptions {
  dbPath: string;
  pin?: string;
  allowedOrigins?: string[];
  s3Config?: {
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    region: string;
    endpoint: string;
  };
}
```

Inside `buildApp`, after the database section:
```typescript
  // S3 (skip in test mode when no config provided)
  if (options.s3Config) {
    const s3 = createS3Client(options.s3Config);
    app.decorate('s3', s3);
  }
```

Update `src/index.ts` to pass S3 config:
```typescript
const app = await buildApp({
  dbPath: process.env.DATABASE_URL?.replace('file:', '') || './babylon.db',
  pin: process.env.BABYLON_PIN,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(','),
  s3Config: {
    accessKeyId: process.env.SCALEWAY_ACCESS_KEY!,
    secretAccessKey: process.env.SCALEWAY_SECRET_KEY!,
    bucket: process.env.SCALEWAY_BUCKET || 'Babylon',
    region: process.env.SCALEWAY_REGION || 'it-mil',
    endpoint: process.env.SCALEWAY_ENDPOINT || 'https://s3.it-mil.scw.cloud',
  },
});
```

- [ ] **Step 3: Run existing tests to verify nothing broke**

Run: `cd packages/api && pnpm test`

Expected: All existing tests still PASS (tests don't provide s3Config, so S3 decorator is skipped)

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/lib/s3.ts packages/api/src/app.ts packages/api/src/index.ts
git commit -m "feat: add S3 client with presigned URL helpers for Scaleway"
```

---

## Task 6: TMDB + Jikan Client Libraries

**Files:**
- Create: `packages/api/src/lib/tmdb.ts`, `packages/api/src/lib/jikan.ts`

- [ ] **Step 1: Write packages/api/src/lib/tmdb.ts**

```typescript
export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
}

export interface TMDBDetail {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  rating: number;
  year: number | null;
}

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

export function createTMDBClient(readAccessToken: string) {
  const headers = {
    Authorization: `Bearer ${readAccessToken}`,
    'Content-Type': 'application/json',
  };

  return {
    async search(query: string, type: 'movie' | 'tv'): Promise<TMDBSearchResult[]> {
      const endpoint = type === 'movie' ? '/search/movie' : '/search/tv';
      const res = await fetch(
        `${TMDB_BASE}${endpoint}?query=${encodeURIComponent(query)}&language=en-US&page=1`,
        { headers }
      );
      if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
      const data = await res.json();
      return data.results || [];
    },

    async getDetail(id: number, type: 'movie' | 'tv'): Promise<TMDBDetail> {
      const res = await fetch(`${TMDB_BASE}/${type}/${id}?language=en-US`, { headers });
      if (!res.ok) throw new Error(`TMDB detail failed: ${res.status}`);
      const data = await res.json();
      const title = data.title || data.name;
      const releaseDate = data.release_date || data.first_air_date;
      return {
        id: data.id,
        title,
        overview: data.overview,
        posterUrl: data.poster_path ? `${TMDB_IMG}/w500${data.poster_path}` : null,
        backdropUrl: data.backdrop_path ? `${TMDB_IMG}/w1280${data.backdrop_path}` : null,
        genres: (data.genres || []).map((g: { name: string }) => g.name),
        rating: data.vote_average || 0,
        year: releaseDate ? parseInt(releaseDate.slice(0, 4), 10) : null,
      };
    },

    mapGenres(genreIds: number[]): string[] {
      return genreIds.map((id) => GENRE_MAP[id]).filter(Boolean);
    },
  };
}

export type TMDB = ReturnType<typeof createTMDBClient>;
```

- [ ] **Step 2: Write packages/api/src/lib/jikan.ts**

```typescript
export interface JikanAnimeResult {
  mal_id: number;
  title: string;
  title_english: string | null;
  synopsis: string | null;
  images: { jpg: { large_image_url: string | null } };
  score: number | null;
  year: number | null;
  episodes: number | null;
  genres: Array<{ name: string }>;
  status: string;
}

export interface JikanDetail {
  id: number;
  title: string;
  overview: string | null;
  posterUrl: string | null;
  genres: string[];
  rating: number | null;
  year: number | null;
  episodeCount: number | null;
}

const JIKAN_BASE = 'https://api.jikan.moe/v4';

// Jikan allows 3 req/s. Space requests 400ms apart.
let lastRequest = 0;
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, 400 - (now - lastRequest));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  return fetch(url);
}

export function createJikanClient() {
  return {
    async search(query: string): Promise<JikanAnimeResult[]> {
      const res = await rateLimitedFetch(
        `${JIKAN_BASE}/anime?q=${encodeURIComponent(query)}&limit=10&sfw=true`
      );
      if (!res.ok) throw new Error(`Jikan search failed: ${res.status}`);
      const data = await res.json();
      return data.data || [];
    },

    async getDetail(malId: number): Promise<JikanDetail> {
      const res = await rateLimitedFetch(`${JIKAN_BASE}/anime/${malId}`);
      if (!res.ok) throw new Error(`Jikan detail failed: ${res.status}`);
      const data = (await res.json()).data;
      return {
        id: data.mal_id,
        title: data.title_english || data.title,
        overview: data.synopsis,
        posterUrl: data.images?.jpg?.large_image_url || null,
        genres: (data.genres || []).map((g: { name: string }) => g.name),
        rating: data.score,
        year: data.year,
        episodeCount: data.episodes,
      };
    },
  };
}

export type Jikan = ReturnType<typeof createJikanClient>;
```

- [ ] **Step 3: Wire TMDB + Jikan into app.ts**

Add imports to `packages/api/src/app.ts`:
```typescript
import { createTMDBClient, type TMDB } from './lib/tmdb.js';
import { createJikanClient, type Jikan } from './lib/jikan.js';
```

Extend the FastifyInstance declaration:
```typescript
declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
    sqlite: Database.Database;
    s3: S3;
    tmdb: TMDB;
    jikan: Jikan;
  }
}
```

Add `tmdbReadAccessToken` to AppOptions:
```typescript
export interface AppOptions {
  dbPath: string;
  pin?: string;
  allowedOrigins?: string[];
  s3Config?: { /* ... */ };
  tmdbReadAccessToken?: string;
}
```

Inside `buildApp`, after S3 section:
```typescript
  // Metadata clients
  if (options.tmdbReadAccessToken) {
    app.decorate('tmdb', createTMDBClient(options.tmdbReadAccessToken));
  }
  app.decorate('jikan', createJikanClient());
```

Update `src/index.ts`:
```typescript
  tmdbReadAccessToken: process.env.TMDB_READ_ACCESS_TOKEN,
```

- [ ] **Step 4: Run existing tests**

Run: `cd packages/api && pnpm test`

Expected: All existing tests still PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/tmdb.ts packages/api/src/lib/jikan.ts packages/api/src/app.ts packages/api/src/index.ts
git commit -m "feat: add TMDB + Jikan API clients with rate limiting"
```

---

## Task 7: Media CRUD Routes

**Files:**
- Create: `packages/api/src/routes/media.ts`, `packages/api/tests/routes/media.test.ts`

- [ ] **Step 1: Write failing test — packages/api/tests/routes/media.test.ts**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Media CRUD', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/media', () => {
    it('creates a new media entry', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Inception', type: 'movie' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.title).toBe('Inception');
      expect(body.type).toBe('movie');
      expect(body.createdAt).toBeDefined();
    });

    it('rejects invalid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: '' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('accepts full metadata', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: {
          title: 'Attack on Titan',
          type: 'anime',
          description: 'Giants vs humans',
          genres: ['Action', 'Drama'],
          rating: 9.0,
          year: 2013,
          source: 'jikan',
          externalId: '16498',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.genres).toEqual(['Action', 'Drama']);
      expect(body.rating).toBe(9.0);
    });
  });

  describe('GET /api/media', () => {
    it('returns empty list initially', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/media' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });

    it('returns created media', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Inception', type: 'movie' },
      });
      const res = await app.inject({ method: 'GET', url: '/api/media' });
      expect(res.json()).toHaveLength(1);
      expect(res.json()[0].title).toBe('Inception');
    });

    it('filters by type', async () => {
      await app.inject({ method: 'POST', url: '/api/media', payload: { title: 'A', type: 'movie' } });
      await app.inject({ method: 'POST', url: '/api/media', payload: { title: 'B', type: 'anime' } });
      const res = await app.inject({ method: 'GET', url: '/api/media?type=anime' });
      expect(res.json()).toHaveLength(1);
      expect(res.json()[0].title).toBe('B');
    });

    it('searches by title', async () => {
      await app.inject({ method: 'POST', url: '/api/media', payload: { title: 'Attack on Titan', type: 'anime' } });
      await app.inject({ method: 'POST', url: '/api/media', payload: { title: 'Inception', type: 'movie' } });
      const res = await app.inject({ method: 'GET', url: '/api/media?q=titan' });
      expect(res.json()).toHaveLength(1);
      expect(res.json()[0].title).toBe('Attack on Titan');
    });

    it('paginates with limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        await app.inject({ method: 'POST', url: '/api/media', payload: { title: `Media ${i}`, type: 'movie' } });
      }
      const res = await app.inject({ method: 'GET', url: '/api/media?limit=2&offset=2' });
      expect(res.json()).toHaveLength(2);
    });
  });

  describe('GET /api/media/:id', () => {
    it('returns full media detail', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Inception', type: 'movie' },
      });
      const id = create.json().id;
      const res = await app.inject({ method: 'GET', url: `/api/media/${id}` });
      expect(res.statusCode).toBe(200);
      expect(res.json().title).toBe('Inception');
    });

    it('returns 404 for missing id', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/media/nonexistent' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/media/:id', () => {
    it('updates media fields', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Inception', type: 'movie' },
      });
      const id = create.json().id;
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/media/${id}`,
        payload: { title: 'Inception (2010)', rating: 8.8 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().title).toBe('Inception (2010)');
      expect(res.json().rating).toBe(8.8);
    });
  });

  describe('DELETE /api/media/:id', () => {
    it('deletes media', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Inception', type: 'movie' },
      });
      const id = create.json().id;
      const del = await app.inject({ method: 'DELETE', url: `/api/media/${id}` });
      expect(del.statusCode).toBe(204);
      const get = await app.inject({ method: 'GET', url: `/api/media/${id}` });
      expect(get.statusCode).toBe(404);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && pnpm test -- tests/routes/media.test.ts`

Expected: FAIL — route not found (404 on POST /api/media)

- [ ] **Step 3: Write packages/api/src/routes/media.ts**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { eq, like, and, desc, asc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { CreateMediaSchema, UpdateMediaSchema, ListMediaQuerySchema } from '@babylon/shared';
import { media, season, episode, mediaFile, watchProgress } from '../db/schema.js';

const mediaRoutes: FastifyPluginAsync = async (app) => {
  // List / Search
  app.get('/api/media', async (request) => {
    const query = ListMediaQuerySchema.parse(request.query);
    const conditions = [];

    if (query.type) conditions.push(eq(media.type, query.type));
    if (query.genre) conditions.push(like(media.genres, `%${query.genre}%`));
    if (query.q) conditions.push(like(media.title, `%${query.q}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn = query.sort === 'year' ? media.year
      : query.sort === 'rating' ? media.rating
      : query.sort === 'title' ? media.title
      : media.createdAt;

    const results = app.db
      .select()
      .from(media)
      .where(where)
      .orderBy(query.sort === 'title' ? asc(sortColumn) : desc(sortColumn))
      .limit(query.limit)
      .offset(query.offset)
      .all();

    return results.map(formatMedia);
  });

  // Get by ID (with seasons, episodes, progress)
  app.get<{ Params: { id: string } }>('/api/media/:id', async (request, reply) => {
    const { id } = request.params;
    const [item] = app.db.select().from(media).where(eq(media.id, id)).all();
    if (!item) return reply.status(404).send({ error: 'Not found' });

    const result: Record<string, unknown> = formatMedia(item);

    if (item.type === 'movie') {
      const [file] = app.db.select().from(mediaFile).where(eq(mediaFile.mediaId, id)).all();
      result.mediaFile = file || null;
    } else {
      const seasons = app.db.select().from(season).where(eq(season.mediaId, id)).all();
      result.seasons = seasons.map((s) => {
        const episodes = app.db
          .select()
          .from(episode)
          .where(eq(episode.seasonId, s.id))
          .orderBy(asc(episode.episodeNumber))
          .all();
        return {
          id: s.id,
          seasonNumber: s.seasonNumber,
          title: s.title,
          episodes: episodes.map((ep) => {
            const [prog] = app.db
              .select()
              .from(watchProgress)
              .where(eq(watchProgress.episodeId, ep.id))
              .all();
            return {
              ...ep,
              progress: prog ? {
                positionSeconds: prog.positionSeconds,
                durationSeconds: prog.durationSeconds,
                completed: prog.completed,
                lastWatchedAt: prog.lastWatchedAt,
              } : null,
            };
          }),
        };
      });
    }

    // Movie-level progress
    const [prog] = app.db
      .select()
      .from(watchProgress)
      .where(and(eq(watchProgress.mediaId, id), eq(watchProgress.episodeId, '')))
      .all();
    if (!prog) {
      const [anyProg] = app.db
        .select()
        .from(watchProgress)
        .where(eq(watchProgress.mediaId, id))
        .limit(1)
        .all();
      result.progress = anyProg ? {
        positionSeconds: anyProg.positionSeconds,
        durationSeconds: anyProg.durationSeconds,
        completed: anyProg.completed,
        lastWatchedAt: anyProg.lastWatchedAt,
      } : null;
    }

    return result;
  });

  // Create
  app.post('/api/media', async (request, reply) => {
    const parseResult = CreateMediaSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.flatten() });
    }
    const input = parseResult.data;
    const now = new Date().toISOString();
    const id = ulid();

    app.db.insert(media).values({
      id,
      title: input.title,
      type: input.type,
      description: input.description || null,
      posterUrl: input.posterUrl || null,
      backdropUrl: input.backdropUrl || null,
      genres: input.genres ? JSON.stringify(input.genres) : null,
      rating: input.rating || null,
      year: input.year || null,
      source: input.source || null,
      externalId: input.externalId || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    const [created] = app.db.select().from(media).where(eq(media.id, id)).all();
    return reply.status(201).send(formatMedia(created));
  });

  // Update
  app.patch<{ Params: { id: string } }>('/api/media/:id', async (request, reply) => {
    const { id } = request.params;
    const [existing] = app.db.select().from(media).where(eq(media.id, id)).all();
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    const parseResult = UpdateMediaSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.flatten() });
    }
    const input = parseResult.data;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (input.title !== undefined) updates.title = input.title;
    if (input.type !== undefined) updates.type = input.type;
    if (input.description !== undefined) updates.description = input.description;
    if (input.posterUrl !== undefined) updates.posterUrl = input.posterUrl;
    if (input.backdropUrl !== undefined) updates.backdropUrl = input.backdropUrl;
    if (input.genres !== undefined) updates.genres = JSON.stringify(input.genres);
    if (input.rating !== undefined) updates.rating = input.rating;
    if (input.year !== undefined) updates.year = input.year;
    if (input.source !== undefined) updates.source = input.source;
    if (input.externalId !== undefined) updates.externalId = input.externalId;

    app.db.update(media).set(updates).where(eq(media.id, id)).run();

    const [updated] = app.db.select().from(media).where(eq(media.id, id)).all();
    return formatMedia(updated);
  });

  // Delete
  app.delete<{ Params: { id: string } }>('/api/media/:id', async (request, reply) => {
    const { id } = request.params;
    const [existing] = app.db.select().from(media).where(eq(media.id, id)).all();
    if (!existing) return reply.status(404).send({ error: 'Not found' });
    app.db.delete(media).where(eq(media.id, id)).run();
    return reply.status(204).send();
  });
};

function formatMedia(row: typeof media.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    description: row.description,
    posterUrl: row.posterUrl,
    backdropUrl: row.backdropUrl,
    genres: row.genres ? JSON.parse(row.genres) : [],
    rating: row.rating,
    year: row.year,
    source: row.source,
    externalId: row.externalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export default mediaRoutes;
```

- [ ] **Step 4: Register media routes in app.ts**

Add import:
```typescript
import mediaRoutes from './routes/media.js';
```

Add registration after health routes:
```typescript
  await app.register(mediaRoutes);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/api && pnpm test -- tests/routes/media.test.ts`

Expected: All 10 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/media.ts packages/api/tests/routes/media.test.ts packages/api/src/app.ts
git commit -m "feat: add media CRUD routes with search/filter/pagination"
```

---

## Task 8: Metadata Routes

**Files:**
- Create: `packages/api/src/routes/metadata.ts`, `packages/api/tests/routes/metadata.test.ts`

- [ ] **Step 1: Write failing test — packages/api/tests/routes/metadata.test.ts**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

// Mock fetch for TMDB/Jikan calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Metadata Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp({ tmdbReadAccessToken: 'test-token' });
    mockFetch.mockReset();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/metadata/search', () => {
    it('searches TMDB for movies', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 27205, title: 'Inception', overview: 'Dream heist', poster_path: '/poster.jpg', backdrop_path: '/back.jpg', genre_ids: [28, 878], vote_average: 8.4, release_date: '2010-07-16' }],
        }),
      });

      const res = await app.inject({ method: 'GET', url: '/api/metadata/search?q=inception&type=movie' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe('Inception');
    });

    it('searches Jikan for anime', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ mal_id: 16498, title: 'Shingeki no Kyojin', title_english: 'Attack on Titan', synopsis: 'Giants', images: { jpg: { large_image_url: '/aot.jpg' } }, score: 8.5, year: 2013, episodes: 25, genres: [{ name: 'Action' }], status: 'Finished' }],
        }),
      });

      const res = await app.inject({ method: 'GET', url: '/api/metadata/search?q=attack+on+titan&type=anime' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe('Attack on Titan');
    });

    it('requires q parameter', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/metadata/search' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/metadata/apply/:id', () => {
    it('applies Jikan metadata to existing anime', async () => {
      // Create media first
      const create = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'AoT', type: 'anime', externalId: '16498', source: 'jikan' },
      });
      const id = create.json().id;

      // Mock Jikan detail
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { mal_id: 16498, title: 'Shingeki no Kyojin', title_english: 'Attack on Titan', synopsis: 'Giants attack', images: { jpg: { large_image_url: '/aot.jpg' } }, score: 8.5, year: 2013, episodes: 25, genres: [{ name: 'Action' }, { name: 'Drama' }], status: 'Finished' },
        }),
      });

      const res = await app.inject({ method: 'POST', url: `/api/metadata/apply/${id}` });
      expect(res.statusCode).toBe(200);
      expect(res.json().title).toBe('Attack on Titan');
      expect(res.json().description).toBe('Giants attack');
      expect(res.json().genres).toContain('Action');
    });

    it('returns 404 for missing media', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/metadata/apply/nonexistent' });
      expect(res.statusCode).toBe(404);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && pnpm test -- tests/routes/metadata.test.ts`

Expected: FAIL — route not found

- [ ] **Step 3: Write packages/api/src/routes/metadata.ts**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { media } from '../db/schema.js';

const metadataRoutes: FastifyPluginAsync = async (app) => {
  // Search TMDB or Jikan
  app.get<{ Querystring: { q?: string; type?: string } }>('/api/metadata/search', async (request, reply) => {
    const { q, type } = request.query;
    if (!q) return reply.status(400).send({ error: 'Missing q parameter' });

    if (type === 'anime') {
      const results = await app.jikan.search(q);
      return results.map((r) => ({
        externalId: String(r.mal_id),
        title: r.title_english || r.title,
        overview: r.synopsis,
        posterUrl: r.images?.jpg?.large_image_url || null,
        genres: r.genres.map((g) => g.name),
        rating: r.score,
        year: r.year,
        episodeCount: r.episodes,
        source: 'jikan',
      }));
    }

    // Movie or TV via TMDB
    const tmdbType = type === 'series' ? 'tv' : 'movie';
    const results = await app.tmdb.search(q, tmdbType as 'movie' | 'tv');
    return results.map((r) => ({
      externalId: String(r.id),
      title: r.title || r.name,
      overview: r.overview,
      posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      genres: app.tmdb.mapGenres(r.genre_ids),
      rating: r.vote_average,
      year: (r.release_date || r.first_air_date)?.slice(0, 4) ? parseInt((r.release_date || r.first_air_date)!.slice(0, 4)) : null,
      source: 'tmdb',
    }));
  });

  // Apply external metadata to an existing media entry
  app.post<{ Params: { id: string } }>('/api/metadata/apply/:id', async (request, reply) => {
    const { id } = request.params;
    const [item] = app.db.select().from(media).where(eq(media.id, id)).all();
    if (!item) return reply.status(404).send({ error: 'Not found' });

    if (!item.externalId || !item.source) {
      return reply.status(400).send({ error: 'No external source configured for this media' });
    }

    let detail: { title: string; overview: string | null; posterUrl: string | null; backdropUrl?: string | null; genres: string[]; rating: number | null; year: number | null };

    if (item.source === 'jikan' || item.type === 'anime') {
      const jikanDetail = await app.jikan.getDetail(parseInt(item.externalId));
      detail = { ...jikanDetail, overview: jikanDetail.overview, backdropUrl: null };
    } else {
      const tmdbType = item.type === 'movie' ? 'movie' : 'tv';
      const tmdbDetail = await app.tmdb.getDetail(parseInt(item.externalId), tmdbType as 'movie' | 'tv');
      detail = { title: tmdbDetail.title, overview: tmdbDetail.overview, posterUrl: tmdbDetail.posterUrl, backdropUrl: tmdbDetail.backdropUrl, genres: tmdbDetail.genres, rating: tmdbDetail.rating, year: tmdbDetail.year };
    }

    app.db.update(media).set({
      title: detail.title,
      description: detail.overview,
      posterUrl: detail.posterUrl,
      backdropUrl: detail.backdropUrl || null,
      genres: JSON.stringify(detail.genres),
      rating: detail.rating,
      year: detail.year,
      updatedAt: new Date().toISOString(),
    }).where(eq(media.id, id)).run();

    const [updated] = app.db.select().from(media).where(eq(media.id, id)).all();
    return {
      ...updated,
      genres: updated.genres ? JSON.parse(updated.genres) : [],
    };
  });
};

export default metadataRoutes;
```

- [ ] **Step 4: Register in app.ts**

```typescript
import metadataRoutes from './routes/metadata.js';
// ...
await app.register(metadataRoutes);
```

- [ ] **Step 5: Run tests**

Run: `cd packages/api && pnpm test -- tests/routes/metadata.test.ts`

Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/metadata.ts packages/api/tests/routes/metadata.test.ts packages/api/src/app.ts
git commit -m "feat: add metadata search + apply routes (TMDB + Jikan)"
```

---

## Task 9: Upload Routes

**Files:**
- Create: `packages/api/src/routes/upload.ts`, `packages/api/tests/routes/upload.test.ts`

- [ ] **Step 1: Write failing test — packages/api/tests/routes/upload.test.ts**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Upload Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    // Provide a mock S3 config so app.s3 is available
    app = await createTestApp({
      s3Config: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
        bucket: 'test',
        region: 'test',
        endpoint: 'http://localhost:9000',
      },
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/upload/initiate', () => {
    it('returns presigned upload URL', async () => {
      // Create media first
      const create = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Test Movie', type: 'movie' },
      });
      const mediaId = create.json().id;

      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/initiate',
        payload: {
          filename: 'movie.mp4',
          contentType: 'video/mp4',
          mediaId,
          type: 'movie',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.uploadUrl).toBeDefined();
      expect(body.s3Key).toContain(mediaId);
    });

    it('rejects invalid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/initiate',
        payload: { filename: 'test.mp4' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/upload/complete', () => {
    it('records uploaded file in database', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Test Movie', type: 'movie' },
      });
      const mediaId = create.json().id;

      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/complete',
        payload: {
          s3Key: `movies/${mediaId}/movie.mp4`,
          mediaId,
          fileSize: 1073741824,
          duration: 7200,
          format: 'mp4',
          originalFilename: 'movie.mp4',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().s3Key).toContain(mediaId);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && pnpm test -- tests/routes/upload.test.ts`

Expected: FAIL — route not found

- [ ] **Step 3: Write packages/api/src/routes/upload.ts**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { InitiateUploadSchema, CompleteUploadSchema } from '@babylon/shared';
import { media, mediaFile, episode, season } from '../db/schema.js';

const uploadRoutes: FastifyPluginAsync = async (app) => {
  // Initiate upload — returns presigned S3 PUT URL
  app.post('/api/upload/initiate', async (request, reply) => {
    const parseResult = InitiateUploadSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.flatten() });
    }
    const input = parseResult.data;

    const s3Key = app.s3.buildKey(input.type, input.mediaId, {
      seasonNumber: input.seasonNumber,
      episodeNumber: input.episodeNumber,
      filename: input.filename,
    });

    const uploadUrl = await app.s3.getUploadUrl(s3Key, input.contentType);

    return { uploadUrl, s3Key };
  });

  // Complete upload — record file in database
  app.post('/api/upload/complete', async (request, reply) => {
    const parseResult = CompleteUploadSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.flatten() });
    }
    const input = parseResult.data;

    // Verify media exists
    const [mediaItem] = app.db.select().from(media).where(eq(media.id, input.mediaId)).all();
    if (!mediaItem) return reply.status(404).send({ error: 'Media not found' });

    if (input.episodeId) {
      // Update existing episode with s3 key
      app.db.update(episode).set({
        s3Key: input.s3Key,
        fileSize: input.fileSize || null,
        duration: input.duration || null,
        format: input.format || null,
        originalFilename: input.originalFilename || null,
      }).where(eq(episode.id, input.episodeId)).run();

      const [updated] = app.db.select().from(episode).where(eq(episode.id, input.episodeId)).all();
      return updated;
    }

    // Movie — create media_file record
    const fileId = ulid();
    app.db.insert(mediaFile).values({
      id: fileId,
      mediaId: input.mediaId,
      s3Key: input.s3Key,
      fileSize: input.fileSize || null,
      duration: input.duration || null,
      format: input.format || null,
      originalFilename: input.originalFilename || null,
    }).run();

    const [created] = app.db.select().from(mediaFile).where(eq(mediaFile.id, fileId)).all();
    return created;
  });

  // Bulk upload orchestration (for CLI)
  app.post('/api/upload/bulk', async (request, reply) => {
    const files = request.body as Array<{
      filename: string;
      contentType: string;
      mediaId: string;
      type: 'movie' | 'series' | 'anime';
      seasonNumber?: number;
      episodeNumber?: number;
    }>;

    if (!Array.isArray(files) || files.length === 0) {
      return reply.status(400).send({ error: 'Expected array of files' });
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const s3Key = app.s3.buildKey(file.type, file.mediaId, {
          seasonNumber: file.seasonNumber,
          episodeNumber: file.episodeNumber,
          filename: file.filename,
        });
        const uploadUrl = await app.s3.getUploadUrl(s3Key, file.contentType);
        return { filename: file.filename, uploadUrl, s3Key };
      })
    );

    return results;
  });
};

export default uploadRoutes;
```

- [ ] **Step 4: Register in app.ts**

```typescript
import uploadRoutes from './routes/upload.js';
// ...
await app.register(uploadRoutes);
```

- [ ] **Step 5: Run tests**

Run: `cd packages/api && pnpm test -- tests/routes/upload.test.ts`

Expected: All 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/upload.ts packages/api/tests/routes/upload.test.ts packages/api/src/app.ts
git commit -m "feat: add upload routes (presigned URL initiation + completion)"
```

---

## Task 10: Streaming Routes

**Files:**
- Create: `packages/api/src/routes/stream.ts`, `packages/api/tests/routes/stream.test.ts`

- [ ] **Step 1: Write failing test — packages/api/tests/routes/stream.test.ts**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';
import { ulid } from 'ulid';

describe('Stream Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp({
      s3Config: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
        bucket: 'test',
        region: 'test',
        endpoint: 'http://localhost:9000',
      },
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns presigned stream URL for movie', async () => {
    // Create media + file
    const create = await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { title: 'Test Movie', type: 'movie' },
    });
    const mediaId = create.json().id;

    await app.inject({
      method: 'POST',
      url: '/api/upload/complete',
      payload: { s3Key: `movies/${mediaId}/movie.mp4`, mediaId },
    });

    const res = await app.inject({ method: 'GET', url: `/api/stream/${mediaId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().streamUrl).toBeDefined();
  });

  it('returns 404 for media with no file', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { title: 'Empty Movie', type: 'movie' },
    });
    const res = await app.inject({ method: 'GET', url: `/api/stream/${create.json().id}` });
    expect(res.statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Write packages/api/src/routes/stream.ts**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { media, mediaFile, episode, subtitle } from '../db/schema.js';

const streamRoutes: FastifyPluginAsync = async (app) => {
  // Get presigned stream URL
  app.get<{ Params: { id: string }; Querystring: { episode_id?: string } }>(
    '/api/stream/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { episode_id } = request.query;

      const [item] = app.db.select().from(media).where(eq(media.id, id)).all();
      if (!item) return reply.status(404).send({ error: 'Media not found' });

      let s3Key: string | null = null;

      if (episode_id) {
        const [ep] = app.db.select().from(episode).where(eq(episode.id, episode_id)).all();
        s3Key = ep?.s3Key || null;
      } else {
        const [file] = app.db.select().from(mediaFile).where(eq(mediaFile.mediaId, id)).all();
        s3Key = file?.s3Key || null;
      }

      if (!s3Key) return reply.status(404).send({ error: 'No file found' });

      const streamUrl = await app.s3.getStreamUrl(s3Key);
      return { streamUrl, s3Key };
    }
  );

  // Get subtitle URL
  app.get<{ Params: { id: string }; Querystring: { episode_id?: string; language?: string } }>(
    '/api/stream/:id/subtitle',
    async (request, reply) => {
      const { id } = request.params;
      const { episode_id, language } = request.query;

      const conditions = [];
      if (episode_id) {
        conditions.push(eq(subtitle.episodeId, episode_id));
      } else {
        // Find media file for this media
        const [file] = app.db.select().from(mediaFile).where(eq(mediaFile.mediaId, id)).all();
        if (file) conditions.push(eq(subtitle.mediaFileId, file.id));
        else return reply.status(404).send({ error: 'No file found' });
      }
      if (language) conditions.push(eq(subtitle.language, language));

      const subs = app.db.select().from(subtitle).where(and(...conditions)).all();
      if (subs.length === 0) return reply.status(404).send({ error: 'No subtitles found' });

      const results = await Promise.all(
        subs.map(async (sub) => ({
          id: sub.id,
          language: sub.language,
          label: sub.label,
          format: sub.format,
          url: await app.s3.getStreamUrl(sub.s3Key),
        }))
      );
      return results;
    }
  );
};

export default streamRoutes;
```

- [ ] **Step 3: Register in app.ts, run tests, commit**

Add import + registration in app.ts. Run: `cd packages/api && pnpm test -- tests/routes/stream.test.ts`

Expected: All 2 tests PASS

```bash
git add packages/api/src/routes/stream.ts packages/api/tests/routes/stream.test.ts packages/api/src/app.ts
git commit -m "feat: add streaming routes (presigned video + subtitle URLs)"
```

---

## Task 11: Watch Progress Routes

**Files:**
- Create: `packages/api/src/routes/progress.ts`, `packages/api/tests/routes/progress.test.ts`

- [ ] **Step 1: Write failing test — packages/api/tests/routes/progress.test.ts**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Progress Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('updates and retrieves watch progress', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { title: 'Test', type: 'movie' },
    });
    const mediaId = create.json().id;

    // Update progress
    const update = await app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaId}`,
      payload: { positionSeconds: 120.5, durationSeconds: 7200 },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().positionSeconds).toBe(120.5);

    // Get continue watching
    const list = await app.inject({ method: 'GET', url: '/api/progress' });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].id).toBe(mediaId);
    expect(list.json()[0].progress.positionSeconds).toBe(120.5);
  });

  it('overwrites existing progress', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { title: 'Test', type: 'movie' },
    });
    const mediaId = create.json().id;

    await app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaId}`,
      payload: { positionSeconds: 100, durationSeconds: 7200 },
    });
    await app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaId}`,
      payload: { positionSeconds: 500, durationSeconds: 7200 },
    });

    const list = await app.inject({ method: 'GET', url: '/api/progress' });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].progress.positionSeconds).toBe(500);
  });

  it('deletes progress', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { title: 'Test', type: 'movie' },
    });
    const mediaId = create.json().id;

    await app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaId}`,
      payload: { positionSeconds: 100, durationSeconds: 7200 },
    });

    const del = await app.inject({ method: 'DELETE', url: `/api/progress/${mediaId}` });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/progress' });
    expect(list.json()).toHaveLength(0);
  });

  it('marks completed when position near duration', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { title: 'Test', type: 'movie' },
    });
    const mediaId = create.json().id;

    const res = await app.inject({
      method: 'PUT',
      url: `/api/progress/${mediaId}`,
      payload: { positionSeconds: 7150, durationSeconds: 7200 },
    });
    expect(res.json().completed).toBe(true);
  });
});
```

- [ ] **Step 2: Write packages/api/src/routes/progress.ts**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { UpdateProgressSchema } from '@babylon/shared';
import { watchProgress, media } from '../db/schema.js';

const progressRoutes: FastifyPluginAsync = async (app) => {
  // Continue Watching list
  app.get('/api/progress', async () => {
    const progressItems = app.db
      .select()
      .from(watchProgress)
      .where(eq(watchProgress.completed, false))
      .orderBy(desc(watchProgress.lastWatchedAt))
      .all();

    const result = [];
    for (const prog of progressItems) {
      const [mediaItem] = app.db.select().from(media).where(eq(media.id, prog.mediaId)).all();
      if (!mediaItem) continue;
      result.push({
        ...mediaItem,
        genres: mediaItem.genres ? JSON.parse(mediaItem.genres) : [],
        progress: {
          positionSeconds: prog.positionSeconds,
          durationSeconds: prog.durationSeconds,
          completed: prog.completed,
          lastWatchedAt: prog.lastWatchedAt,
          episodeId: prog.episodeId,
        },
      });
    }
    return result;
  });

  // Update progress
  app.put<{ Params: { mediaId: string } }>('/api/progress/:mediaId', async (request, reply) => {
    const { mediaId } = request.params;
    const parseResult = UpdateProgressSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed' });
    }
    const input = parseResult.data;

    const [mediaItem] = app.db.select().from(media).where(eq(media.id, mediaId)).all();
    if (!mediaItem) return reply.status(404).send({ error: 'Media not found' });

    const episodeId = input.episodeId || null;
    const completed = input.durationSeconds > 0 && (input.positionSeconds / input.durationSeconds) > 0.95;
    const now = new Date().toISOString();

    // Upsert: delete existing + insert
    const conditions = [eq(watchProgress.mediaId, mediaId)];
    if (episodeId) {
      conditions.push(eq(watchProgress.episodeId, episodeId));
    }
    app.db.delete(watchProgress).where(and(...conditions)).run();

    const id = ulid();
    app.db.insert(watchProgress).values({
      id,
      mediaId,
      episodeId,
      positionSeconds: input.positionSeconds,
      durationSeconds: input.durationSeconds,
      completed,
      lastWatchedAt: now,
    }).run();

    return {
      positionSeconds: input.positionSeconds,
      durationSeconds: input.durationSeconds,
      completed,
      lastWatchedAt: now,
    };
  });

  // Clear progress
  app.delete<{ Params: { mediaId: string } }>('/api/progress/:mediaId', async (request, reply) => {
    const { mediaId } = request.params;
    app.db.delete(watchProgress).where(eq(watchProgress.mediaId, mediaId)).run();
    return reply.status(204).send();
  });
};

export default progressRoutes;
```

- [ ] **Step 3: Register in app.ts, run tests, commit**

Add import + registration. Run: `cd packages/api && pnpm test -- tests/routes/progress.test.ts`

Expected: All 4 tests PASS

```bash
git add packages/api/src/routes/progress.ts packages/api/tests/routes/progress.test.ts packages/api/src/app.ts
git commit -m "feat: add watch progress routes (continue watching, upsert, delete)"
```

---

## Task 12: Library Home + Genres Routes

**Files:**
- Create: `packages/api/src/routes/library.ts`, `packages/api/tests/routes/library.test.ts`

- [ ] **Step 1: Write failing test — packages/api/tests/routes/library.test.ts**

```typescript
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

  describe('GET /api/library/home', () => {
    it('returns empty home screen', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/library/home' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.continueWatching).toEqual([]);
      expect(body.recentlyAdded).toEqual([]);
      expect(body.genreRows).toEqual([]);
    });

    it('includes recently added media', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Movie A', type: 'movie', genres: ['Action'] },
      });
      const res = await app.inject({ method: 'GET', url: '/api/library/home' });
      expect(res.json().recentlyAdded).toHaveLength(1);
    });

    it('includes continue watching with progress', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Movie A', type: 'movie' },
      });
      await app.inject({
        method: 'PUT',
        url: `/api/progress/${create.json().id}`,
        payload: { positionSeconds: 100, durationSeconds: 7200 },
      });
      const res = await app.inject({ method: 'GET', url: '/api/library/home' });
      expect(res.json().continueWatching).toHaveLength(1);
    });

    it('groups media by genre', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'A', type: 'anime', genres: ['Action'] },
      });
      await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'B', type: 'movie', genres: ['Action', 'Drama'] },
      });
      const res = await app.inject({ method: 'GET', url: '/api/library/home' });
      const actionRow = res.json().genreRows.find((r: { genre: string }) => r.genre === 'Action');
      expect(actionRow).toBeDefined();
      expect(actionRow.media).toHaveLength(2);
    });
  });

  describe('GET /api/library/genres', () => {
    it('returns genre counts', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'A', type: 'movie', genres: ['Action', 'Drama'] },
      });
      await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'B', type: 'anime', genres: ['Action'] },
      });
      const res = await app.inject({ method: 'GET', url: '/api/library/genres' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.find((g: { genre: string }) => g.genre === 'Action').count).toBe(2);
      expect(body.find((g: { genre: string }) => g.genre === 'Drama').count).toBe(1);
    });
  });
});
```

- [ ] **Step 2: Write packages/api/src/routes/library.ts**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { media, watchProgress } from '../db/schema.js';

const libraryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/library/home', async () => {
    // Continue Watching (incomplete progress, sorted by last watched)
    const progressItems = app.db
      .select()
      .from(watchProgress)
      .where(eq(watchProgress.completed, false))
      .orderBy(desc(watchProgress.lastWatchedAt))
      .limit(20)
      .all();

    const continueWatching = [];
    for (const prog of progressItems) {
      const [item] = app.db.select().from(media).where(eq(media.id, prog.mediaId)).all();
      if (!item) continue;
      continueWatching.push({
        ...formatMedia(item),
        progress: {
          positionSeconds: prog.positionSeconds,
          durationSeconds: prog.durationSeconds,
          completed: prog.completed,
          lastWatchedAt: prog.lastWatchedAt,
          episodeId: prog.episodeId,
        },
      });
    }

    // Recently Added (last 20)
    const recentlyAdded = app.db
      .select()
      .from(media)
      .orderBy(desc(media.createdAt))
      .limit(20)
      .all()
      .map(formatMedia);

    // Genre rows
    const allMedia = app.db.select().from(media).all().map(formatMedia);
    const genreMap = new Map<string, typeof allMedia>();
    for (const item of allMedia) {
      for (const genre of item.genres) {
        if (!genreMap.has(genre)) genreMap.set(genre, []);
        genreMap.get(genre)!.push(item);
      }
    }
    const genreRows = Array.from(genreMap.entries())
      .map(([genre, items]) => ({ genre, media: items.slice(0, 20) }))
      .sort((a, b) => b.media.length - a.media.length);

    return { continueWatching, recentlyAdded, genreRows };
  });

  app.get('/api/library/genres', async () => {
    const allMedia = app.db.select().from(media).all();
    const counts = new Map<string, number>();
    for (const item of allMedia) {
      const genres: string[] = item.genres ? JSON.parse(item.genres) : [];
      for (const genre of genres) {
        counts.set(genre, (counts.get(genre) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);
  });
};

function formatMedia(row: typeof media.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    description: row.description,
    posterUrl: row.posterUrl,
    backdropUrl: row.backdropUrl,
    genres: row.genres ? JSON.parse(row.genres) : [],
    rating: row.rating,
    year: row.year,
    source: row.source,
    externalId: row.externalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export default libraryRoutes;
```

- [ ] **Step 3: Register in app.ts, run tests, commit**

Add import + registration. Run: `cd packages/api && pnpm test -- tests/routes/library.test.ts`

Expected: All 5 tests PASS

```bash
git add packages/api/src/routes/library.ts packages/api/tests/routes/library.test.ts packages/api/src/app.ts
git commit -m "feat: add library routes (home screen aggregation + genre counts)"
```

---

## Task 13: Ingest Management Routes

**Files:**
- Create: `packages/api/src/lib/watchlist.ts`, `packages/api/src/routes/ingest.ts`, `packages/api/tests/routes/ingest.test.ts`

- [ ] **Step 1: Write packages/api/src/lib/watchlist.ts**

```typescript
import fs from 'node:fs';
import path from 'node:path';
import type { WatchlistEntry } from '@babylon/shared';

export function createWatchlistManager(stateDir: string) {
  const watchlistPath = path.join(stateDir, 'watchlist.json');
  const statusPath = path.join(stateDir, 'status.json');
  const triggerPath = path.join(stateDir, 'trigger');

  // Ensure state directory exists
  fs.mkdirSync(stateDir, { recursive: true });

  return {
    read(): WatchlistEntry[] {
      if (!fs.existsSync(watchlistPath)) return [];
      return JSON.parse(fs.readFileSync(watchlistPath, 'utf-8'));
    },

    write(entries: WatchlistEntry[]): void {
      fs.writeFileSync(watchlistPath, JSON.stringify(entries, null, 2));
    },

    add(entry: { title: string; aliases?: string[]; season?: number }): WatchlistEntry {
      const entries = this.read();
      const existing = entries.find((e) => e.title.toLowerCase() === entry.title.toLowerCase());
      if (existing) throw new Error(`"${entry.title}" already in watchlist`);

      const newEntry: WatchlistEntry = {
        title: entry.title,
        aliases: entry.aliases || [],
        mode: 'backlog',
        season: entry.season || 1,
        addedAt: new Date().toISOString(),
      };
      entries.push(newEntry);
      this.write(entries);
      return newEntry;
    },

    remove(title: string): boolean {
      const entries = this.read();
      const filtered = entries.filter((e) => e.title.toLowerCase() !== title.toLowerCase());
      if (filtered.length === entries.length) return false;
      this.write(filtered);
      return true;
    },

    readStatus(): Record<string, unknown> {
      if (!fs.existsSync(statusPath)) {
        return { running: false, lastPollAt: null, currentTask: null, queue: [] };
      }
      return JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
    },

    trigger(): void {
      // Write a trigger file that the Python daemon watches
      fs.writeFileSync(triggerPath, new Date().toISOString());
    },
  };
}

export type WatchlistManager = ReturnType<typeof createWatchlistManager>;
```

- [ ] **Step 2: Write failing test — packages/api/tests/routes/ingest.test.ts**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../helpers.js';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('Ingest Routes', () => {
  let app: FastifyInstance;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'babylon-test-'));
    app = await createTestApp({ ingestStateDir: tmpDir });
  });

  afterEach(async () => {
    await app.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('GET /api/ingest/watchlist', () => {
    it('returns empty watchlist initially', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/ingest/watchlist' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  describe('POST /api/ingest/watchlist', () => {
    it('adds show to watchlist', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ingest/watchlist',
        payload: { title: 'Attack on Titan', aliases: ['Shingeki no Kyojin'], season: 1 },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().title).toBe('Attack on Titan');

      const list = await app.inject({ method: 'GET', url: '/api/ingest/watchlist' });
      expect(list.json()).toHaveLength(1);
    });

    it('rejects duplicate titles', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/ingest/watchlist',
        payload: { title: 'Attack on Titan' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/ingest/watchlist',
        payload: { title: 'Attack on Titan' },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('DELETE /api/ingest/watchlist/:title', () => {
    it('removes show from watchlist', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/ingest/watchlist',
        payload: { title: 'AoT' },
      });
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/ingest/watchlist/AoT',
      });
      expect(res.statusCode).toBe(204);

      const list = await app.inject({ method: 'GET', url: '/api/ingest/watchlist' });
      expect(list.json()).toHaveLength(0);
    });

    it('returns 404 for missing title', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/ingest/watchlist/Nope' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/ingest/status', () => {
    it('returns default status when no daemon running', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/ingest/status' });
      expect(res.statusCode).toBe(200);
      expect(res.json().running).toBe(false);
    });
  });

  describe('POST /api/ingest/trigger', () => {
    it('creates trigger file', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/ingest/trigger' });
      expect(res.statusCode).toBe(200);
      expect(fs.existsSync(path.join(tmpDir, 'trigger'))).toBe(true);
    });
  });

  describe('GET /api/ingest/search', () => {
    it('requires q parameter', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/ingest/search' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/ingest/queue', () => {
    it('adds to watchlist and triggers', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ingest/queue',
        payload: { title: 'Solo Leveling' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().queued).toBe(true);

      const list = await app.inject({ method: 'GET', url: '/api/ingest/watchlist' });
      expect(list.json()).toHaveLength(1);
      expect(fs.existsSync(path.join(tmpDir, 'trigger'))).toBe(true);
    });

    it('returns already-in-library if title matches exactly (case-insensitive)', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Solo Leveling', type: 'anime' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/ingest/queue',
        payload: { title: 'Solo Leveling' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().alreadyInLibrary).toBe(true);
    });

    it('does NOT match partial titles (Solo ≠ Solo Leveling)', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { title: 'Solo Leveling', type: 'anime' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/ingest/queue',
        payload: { title: 'Solo' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().queued).toBe(true);
      expect(res.json().alreadyInLibrary).toBeUndefined();
    });
  });
});
```

- [ ] **Step 3: Write packages/api/src/routes/ingest.ts**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';
import { AddToWatchlistSchema, QueueIngestSchema } from '@babylon/shared';
import { media } from '../db/schema.js';

const ingestRoutes: FastifyPluginAsync = async (app) => {
  // Get watchlist
  app.get('/api/ingest/watchlist', async () => {
    return app.watchlist.read();
  });

  // Add to watchlist
  app.post('/api/ingest/watchlist', async (request, reply) => {
    const parseResult = AddToWatchlistSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed' });
    }
    try {
      const entry = app.watchlist.add(parseResult.data);
      return reply.status(201).send(entry);
    } catch (err: any) {
      return reply.status(409).send({ error: err.message });
    }
  });

  // Remove from watchlist
  app.delete<{ Params: { title: string } }>('/api/ingest/watchlist/:title', async (request, reply) => {
    const { title } = request.params;
    const removed = app.watchlist.remove(decodeURIComponent(title));
    if (!removed) return reply.status(404).send({ error: 'Not in watchlist' });
    return reply.status(204).send();
  });

  // Daemon status
  app.get('/api/ingest/status', async () => {
    return app.watchlist.readStatus();
  });

  // Force poll trigger
  app.post('/api/ingest/trigger', async () => {
    app.watchlist.trigger();
    return { triggered: true };
  });

  // Search anime (Jikan only — Nyaa check happens at queue time)
  app.get<{ Querystring: { q?: string } }>('/api/ingest/search', async (request, reply) => {
    const { q } = request.query;
    if (!q) return reply.status(400).send({ error: 'Missing q parameter' });

    const results = await app.jikan.search(q);
    const mapped = results.map((r) => {
      // Check if already in library
      // Exact case-insensitive match — NOT partial LIKE (avoids "Solo" matching "Solo Leveling")
      const searchTitle = r.title_english || r.title;
      const [existing] = app.db
        .select()
        .from(media)
        .where(sql`LOWER(${media.title}) = LOWER(${searchTitle})`)
        .limit(1)
        .all();

      return {
        malId: r.mal_id,
        title: r.title_english || r.title,
        synopsis: r.synopsis,
        posterUrl: r.images?.jpg?.large_image_url || null,
        genres: r.genres.map((g) => g.name),
        rating: r.score,
        year: r.year,
        episodeCount: r.episodes,
        status: r.status,
        inLibrary: !!existing,
        libraryId: existing?.id || null,
      };
    });

    return mapped;
  });

  // Queue anime for download
  app.post('/api/ingest/queue', async (request, reply) => {
    const parseResult = QueueIngestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed' });
    }
    const { title } = parseResult.data;

    // Check if already in library
    // Exact case-insensitive match — NOT partial LIKE (avoids false positives)
    const [existing] = app.db
      .select()
      .from(media)
      .where(sql`LOWER(${media.title}) = LOWER(${title})`)
      .limit(1)
      .all();

    if (existing) {
      return { alreadyInLibrary: true, mediaId: existing.id, queued: false };
    }

    // Add to watchlist (ignore if already there)
    try {
      app.watchlist.add({ title });
    } catch {
      // Already in watchlist — that's fine
    }

    // Trigger immediate poll
    app.watchlist.trigger();

    return { queued: true, title };
  });
};

export default ingestRoutes;
```

- [ ] **Step 4: Wire watchlist manager into app.ts**

Add imports:
```typescript
import { createWatchlistManager, type WatchlistManager } from './lib/watchlist.js';
```

Extend FastifyInstance:
```typescript
declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
    sqlite: Database.Database;
    s3: S3;
    tmdb: TMDB;
    jikan: Jikan;
    watchlist: WatchlistManager;
  }
}
```

Add `ingestStateDir` to AppOptions:
```typescript
export interface AppOptions {
  dbPath: string;
  pin?: string;
  allowedOrigins?: string[];
  s3Config?: { /* ... */ };
  tmdbReadAccessToken?: string;
  ingestStateDir?: string;
}
```

Inside buildApp:
```typescript
  // Watchlist manager
  const stateDir = options.ingestStateDir || './data/ingest';
  app.decorate('watchlist', createWatchlistManager(stateDir));
```

Register routes:
```typescript
import ingestRoutes from './routes/ingest.js';
// ...
await app.register(ingestRoutes);
```

Update `src/index.ts`:
```typescript
  ingestStateDir: process.env.INGEST_STATE_DIR || './data/ingest',
```

- [ ] **Step 5: Run tests**

Run: `cd packages/api && pnpm test -- tests/routes/ingest.test.ts`

Expected: All 9 tests PASS

- [ ] **Step 6: Run full test suite**

Run: `cd packages/api && pnpm test`

Expected: All tests across all route files PASS

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/lib/watchlist.ts packages/api/src/routes/ingest.ts packages/api/tests/routes/ingest.test.ts packages/api/src/app.ts packages/api/src/index.ts
git commit -m "feat: add ingest management routes (watchlist, status, search, queue)"
```

---

## Final Verification

After all tasks are complete, run the full test suite from the monorepo root:

```bash
pnpm test
```

Expected: All tests pass across `packages/shared` and `packages/api`.

Then verify the dev server starts:

```bash
cp .env.example packages/api/.env
# Fill in real credentials in packages/api/.env
cd packages/api && pnpm dev
```

Expected: Server starts on port 3000, `GET http://localhost:3000/api/health` returns `{"status":"ok"}`.
