export interface ParsedFilename {
  title?: string;
  season?: number;
  episode?: number;
  year?: number;
  /** 'movie' inferred when only year is detected and no episode info */
  type?: 'movie' | 'series' | 'anime';
  /** Detected quality string e.g. "1080p" */
  quality?: string;
}

// Noise tokens to strip before title extraction
const NOISE_RE =
  /\b(bluray|blu-ray|webrip|web-dl|hdtv|dvdrip|bdrip|remux|hevc|x264|x265|avc|aac|ac3|dts|hdr|sdr|10bit|proper|repack|extended|theatrical|directors\.cut)\b/gi;

const QUALITY_RE = /\b(2160p|1080p|720p|480p|360p)\b/i;

/**
 * Extract structured metadata from a media filename.
 *
 * Handles common patterns:
 *  - SxxExx  →  Show.Name.S01E03.1080p.mkv
 *  - [Group] Show - NN [quality]  →  [SubsPlease] Dungeon Meshi - 12 [1080p].mkv
 *  - Show - NN  →  Naruto Shippuden - 467.mkv
 *  - Movie.Year  →  Everything.Everywhere.2022.1080p.mkv
 *  - Bare episode  →  03.mkv
 */
export function parseFilename(filename: string): ParsedFilename {
  // Strip extension
  const base = filename.replace(/\.[a-z0-9]{2,5}$/i, '');

  const result: ParsedFilename = {};

  // Quality detection (non-destructive)
  const qualityMatch = QUALITY_RE.exec(base);
  if (qualityMatch) result.quality = qualityMatch[1].toLowerCase();

  // Working copy — strip brackets content that looks like quality/hash tags
  // but preserve group tags at the start for sub-group detection
  let working = base;

  // 1. SxxExx pattern  →  S01E03, s01e03
  const sxxexxRe = /[Ss](\d{1,2})[Ee](\d{1,4})/;
  const sxxexxMatch = sxxexxRe.exec(working);
  if (sxxexxMatch) {
    result.season = parseInt(sxxexxMatch[1], 10);
    result.episode = parseInt(sxxexxMatch[2], 10);
    result.type = 'series';
    // Title is everything before the SxxExx token, cleaned up
    const titlePart = working.slice(0, sxxexxMatch.index);
    result.title = cleanTitle(titlePart);
    return result;
  }

  // 2. [SubGroup] Show - NN [quality] pattern (anime)
  //    Example: [SubsPlease] Dungeon Meshi - 12 [1080p].mkv
  const animeGroupRe = /^\[([^\]]+)\]\s*(.+?)\s*-\s*(\d{1,3})(?:\s*[\[\(]|$)/;
  const animeGroupMatch = animeGroupRe.exec(working);
  if (animeGroupMatch) {
    result.episode = parseInt(animeGroupMatch[3], 10);
    result.title = cleanTitle(animeGroupMatch[2]);
    result.type = 'anime';
    return result;
  }

  // 3. Show Name - NN  (bare dash-episode, no brackets)
  //    Example: Naruto Shippuden - 467.mkv
  const dashEpRe = /^(.+?)\s+-\s+(\d{1,3})(?:\s+|$)/;
  const dashEpMatch = dashEpRe.exec(working);
  if (dashEpMatch) {
    result.title = cleanTitle(dashEpMatch[1]);
    result.episode = parseInt(dashEpMatch[2], 10);
    result.type = 'series';
    return result;
  }

  // 4. Year detection for movies: Title.2024.1080p.mkv
  //    Year must be 4 digits between 1900–2099
  const yearRe = /^(.+?)[.\s_]+((?:19|20)\d{2})[.\s_]/;
  const yearMatch = yearRe.exec(working);
  if (yearMatch) {
    result.title = cleanTitle(yearMatch[1]);
    result.year = parseInt(yearMatch[2], 10);
    result.type = 'movie';
    return result;
  }

  // 5. ENN or Episode NN standalone pattern
  //    Example: Show E12 [1080p].mkv  or  Episode 01.mkv
  const epPrefixRe = /(?:Episode\s*|E)(\d{1,3})\b/i;
  const epPrefixMatch = epPrefixRe.exec(working);
  if (epPrefixMatch) {
    result.episode = parseInt(epPrefixMatch[1], 10);
    const titlePart = working.slice(0, epPrefixMatch.index);
    result.title = cleanTitle(titlePart) || undefined;
    result.type = 'series';
    return result;
  }

  // 6. Bare NN — file is just a number (e.g. 03.mkv)
  const bareNumberRe = /^(\d{1,3})$/;
  const bareNumberMatch = bareNumberRe.exec(working.trim());
  if (bareNumberMatch) {
    result.episode = parseInt(bareNumberMatch[1], 10);
    return result;
  }

  // 7. Fallback — use cleaned filename as title
  result.title = cleanTitle(working) || undefined;
  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip common noise, normalize separators, trim.
 */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\[[^\]]*\]/g, '')    // strip [bracketed] tokens
    .replace(/\([^)]*\)/g, '')     // strip (parenthesised) tokens
    .replace(NOISE_RE, '')         // strip noise keywords
    .replace(/[._]+/g, ' ')        // dots/underscores → spaces
    .replace(/\s{2,}/g, ' ')       // collapse spaces
    .trim();
}
