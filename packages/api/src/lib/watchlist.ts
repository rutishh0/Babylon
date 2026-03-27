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
