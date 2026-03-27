import { describe, it, expect } from 'vitest';
import { parseFilename } from './filename-parser.js';

describe('parseFilename', () => {
  describe('SxxExx pattern', () => {
    it('parses standard SxxExx', () => {
      const r = parseFilename('Show.Name.S01E03.1080p.mkv');
      expect(r.season).toBe(1);
      expect(r.episode).toBe(3);
      expect(r.title).toBe('Show Name');
      expect(r.type).toBe('series');
    });

    it('handles lowercase sxxexx', () => {
      const r = parseFilename('Breaking.Bad.s03e07.720p.mkv');
      expect(r.season).toBe(3);
      expect(r.episode).toBe(7);
      expect(r.title).toBe('Breaking Bad');
    });

    it('handles two-digit season and three-digit episode', () => {
      const r = parseFilename('One.Piece.S01E1023.mkv');
      expect(r.season).toBe(1);
      expect(r.episode).toBe(1023);
    });
  });

  describe('anime [SubGroup] Show - NN pattern', () => {
    it('parses SubsPlease pattern', () => {
      const r = parseFilename('[SubsPlease] Dungeon Meshi - 12 [1080p].mkv');
      expect(r.episode).toBe(12);
      expect(r.title).toBe('Dungeon Meshi');
      expect(r.type).toBe('anime');
    });

    it('parses SubsPlease with brackets at end', () => {
      const r = parseFilename('[SubsPlease] Frieren - 24 [720p].mkv');
      expect(r.episode).toBe(24);
      expect(r.title).toBe('Frieren');
    });

    it('handles three-digit episodes', () => {
      const r = parseFilename('[SubsPlease] Naruto - 220 [1080p].mkv');
      expect(r.episode).toBe(220);
      expect(r.title).toBe('Naruto');
    });
  });

  describe('dash episode pattern', () => {
    it('parses Show Name - NN', () => {
      const r = parseFilename('Naruto Shippuden - 467.mkv');
      expect(r.title).toBe('Naruto Shippuden');
      expect(r.episode).toBe(467);
      expect(r.type).toBe('series');
    });

    it('parses two-digit episode', () => {
      const r = parseFilename('Attack on Titan - 03.mkv');
      expect(r.episode).toBe(3);
      expect(r.title).toBe('Attack on Titan');
    });
  });

  describe('movie year pattern', () => {
    it('parses Movie.Year.1080p', () => {
      const r = parseFilename('Everything.Everywhere.All.At.Once.2022.1080p.mkv');
      expect(r.year).toBe(2022);
      expect(r.title).toBe('Everything Everywhere All At Once');
      expect(r.type).toBe('movie');
    });

    it('parses year with spaces', () => {
      const r = parseFilename('Dune Part Two 2024 BluRay.mkv');
      expect(r.year).toBe(2024);
      expect(r.title).toBe('Dune Part Two');
    });
  });

  describe('ENN / Episode NN pattern', () => {
    it('parses Episode NN prefix', () => {
      const r = parseFilename('Episode 01.mkv');
      expect(r.episode).toBe(1);
    });

    it('parses bare E-number', () => {
      const r = parseFilename('Show E12 [1080p].mkv');
      expect(r.episode).toBe(12);
    });
  });

  describe('bare number', () => {
    it('parses bare episode number', () => {
      const r = parseFilename('03.mkv');
      expect(r.episode).toBe(3);
    });

    it('parses two-digit', () => {
      const r = parseFilename('12.mp4');
      expect(r.episode).toBe(12);
    });
  });

  describe('quality detection', () => {
    it('extracts quality alongside other data', () => {
      const r = parseFilename('[SubsPlease] Bleach - 05 [1080p].mkv');
      expect(r.quality).toBe('1080p');
      expect(r.episode).toBe(5);
    });

    it('extracts 720p quality', () => {
      const r = parseFilename('Show.Name.S02E04.720p.mkv');
      expect(r.quality).toBe('720p');
    });
  });

  describe('edge cases', () => {
    it('returns empty result for unrecognised pattern', () => {
      const r = parseFilename('random-string.mkv');
      // should at least not throw
      expect(r).toBeDefined();
    });

    it('strips noise keywords', () => {
      const r = parseFilename('Inception.2010.BluRay.x264.1080p.mkv');
      expect(r.title).toBe('Inception');
      expect(r.year).toBe(2010);
    });
  });
});
