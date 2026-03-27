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
