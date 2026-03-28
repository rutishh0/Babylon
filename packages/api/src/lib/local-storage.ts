import fs from 'node:fs';
import path from 'node:path';

export interface LocalStorageService {
  resolve(relativePath: string): string;
  exists(relativePath: string): boolean;
  getFileSize(relativePath: string): number;
  buildKey(type: 'movie' | 'series' | 'anime', mediaId: string, parts: {
    seasonNumber?: number;
    episodeNumber?: number;
    filename: string;
  }): string;
  buildSubtitleKey(parentId: string, language: string, format: string): string;
}

export function createLocalStorage(basePath: string): LocalStorageService {
  return {
    resolve(relativePath: string): string {
      // Prevent path traversal
      const normalized = path.normalize(relativePath);
      if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
        throw new Error('Invalid path: traversal attempt');
      }
      return path.join(basePath, normalized);
    },

    exists(relativePath: string): boolean {
      return fs.existsSync(this.resolve(relativePath));
    },

    getFileSize(relativePath: string): number {
      return fs.statSync(this.resolve(relativePath)).size;
    },

    buildKey(type, mediaId, parts) {
      const base = type === 'movie' ? 'movies' : type === 'anime' ? 'anime' : 'series';
      if (parts.seasonNumber != null && parts.episodeNumber != null) {
        return `${base}/${mediaId}/s${parts.seasonNumber}/e${parts.episodeNumber}/${parts.filename}`;
      }
      return `${base}/${mediaId}/${parts.filename}`;
    },

    buildSubtitleKey(parentId, language, format) {
      return `subtitles/${parentId}/${language}.${format}`;
    },
  };
}
