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
