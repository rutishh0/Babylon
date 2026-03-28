"""
rss_poller.py — Nyaa RSS polling (for weekly episodes) and HTML scraping (for backlog batches).

Weekly RSS URL (SubsPlease, 1080p, no batches):
  https://nyaa.si/?page=rss&u=subsplease&q=1080p+-batch

Backlog batch search uses HTML scraping against Nyaa's search page:
  https://nyaa.si/?f=0&c=1_2&q={TITLE}+batch&s=seeders&o=desc

Uploader priority for batches (smaller encodes preferred):
  1. Judas  2. Ember  3. ASW  4. SubsPlease  5. Any (most-seeded)
"""

import re
import logging
from typing import Optional
from dataclasses import dataclass
from urllib.parse import quote_plus

import requests
import feedparser
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

SUBSPLEASE_RSS = "https://nyaa.si/?page=rss&u=subsplease&q=1080p+-batch"
NYAA_SEARCH_URL = "https://nyaa.si/"

# Preferred uploaders in order (small encodes first)
PREFERRED_UPLOADERS = ["judas", "ember", "asw", "subsplease"]

# Request headers to mimic a browser
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}


@dataclass
class RssItem:
    title: str
    episode: Optional[int]
    magnet_link: str
    seeders: int
    size: str = ""


# ---------------------------------------------------------------------------
# Weekly RSS polling (unchanged)
# ---------------------------------------------------------------------------

def poll_subsplease() -> list[RssItem]:
    """Fetch the SubsPlease 1080p RSS feed and return a list of RssItems."""
    try:
        feed = feedparser.parse(SUBSPLEASE_RSS)
    except Exception as exc:
        logger.error("Failed to fetch SubsPlease RSS: %s", exc)
        return []

    from filename_parser import parse_episode, is_non_episode

    items: list[RssItem] = []
    for entry in feed.entries:
        title = entry.get("title", "")
        if is_non_episode(title):
            continue
        magnet = _extract_rss_magnet(entry)
        if not magnet:
            continue
        episode = parse_episode(title)
        seeders = _extract_rss_seeders(entry)
        items.append(RssItem(title=title, episode=episode, magnet_link=magnet, seeders=seeders))

    logger.info("SubsPlease RSS returned %d usable items", len(items))
    return items


def match_watchlist(rss_items: list[RssItem], watchlist: list[dict]) -> list[tuple[RssItem, dict]]:
    """Case-insensitive match each RSS item title against watchlist titles + aliases."""
    matched: list[tuple[RssItem, dict]] = []
    for item in rss_items:
        title_lower = item.title.lower()
        for entry in watchlist:
            candidates = [entry["title"]] + entry.get("aliases", [])
            for candidate in candidates:
                if candidate.lower() in title_lower:
                    matched.append((item, entry))
                    break
    return matched


# ---------------------------------------------------------------------------
# Backlog batch search (HTML scraping)
# ---------------------------------------------------------------------------

def _build_search_terms(title: str, aliases: list[str]) -> list[str]:
    """Build search terms, stripping 'Season N' suffixes to broaden matches."""
    terms = []
    seen = set()

    for raw in [title] + aliases:
        t = raw.strip()
        if t and t.lower() not in seen:
            terms.append(t)
            seen.add(t.lower())

        # Strip "Season N" suffix
        stripped = re.sub(r'\s+Season\s+\d+\s*$', '', t, flags=re.IGNORECASE).strip()
        if stripped and stripped.lower() not in seen:
            terms.append(stripped)
            seen.add(stripped.lower())

    return terms


def _scrape_nyaa(query: str) -> list[RssItem]:
    """
    Scrape Nyaa HTML search page for results.
    URL: https://nyaa.si/?f=0&c=1_2&q={query}&s=seeders&o=desc
    Returns list of RssItem sorted by seeders descending.
    """
    url = f"{NYAA_SEARCH_URL}?f=0&c=1_2&q={quote_plus(query)}&s=seeders&o=desc"

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as exc:
        logger.error("Nyaa scrape failed (query=%r): %s", query, exc)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    table = soup.select_one("table.torrent-list tbody")
    if not table:
        return []

    items: list[RssItem] = []
    for row in table.select("tr"):
        cols = row.select("td")
        if len(cols) < 7:
            continue

        # Column layout: category | name | links | size | date | seeders | leechers | downloads
        # Name column has <a> links — last <a> without class is the title link
        name_col = cols[1]
        title_links = name_col.select("a:not(.comments)")
        if not title_links:
            continue
        entry_title = title_links[-1].get_text(strip=True)

        # Magnet link
        link_col = cols[2]
        magnet = None
        for a in link_col.select("a"):
            href = a.get("href", "")
            if href.startswith("magnet:"):
                magnet = href
                break
        if not magnet:
            continue

        # Size
        size = cols[3].get_text(strip=True)

        # Seeders
        try:
            seeders = int(cols[5].get_text(strip=True))
        except (ValueError, IndexError):
            seeders = 0

        items.append(RssItem(
            title=entry_title,
            episode=None,
            magnet_link=magnet,
            seeders=seeders,
            size=size,
        ))

    return items


def search_nyaa_batch(title: str, aliases: list[str]) -> Optional[RssItem]:
    """
    Search Nyaa for a completed batch using HTML scraping.

    Strategy for each search term:
    1. Try preferred uploaders in order: Judas → Ember → ASW → SubsPlease
       Query: "{term} batch {uploader}"
    2. Fallback: general search "{term} batch", pick most-seeded
    3. Last resort: "{term} 1080p" without "batch" keyword

    Returns the best RssItem found, or None.
    """
    search_terms = _build_search_terms(title, aliases)

    # Step 1: Try each preferred uploader
    for uploader in PREFERRED_UPLOADERS:
        for term in search_terms:
            query = f"{term} batch {uploader}"
            results = _scrape_nyaa(query)
            for r in results:
                if r.seeders > 0:
                    logger.info("Found %s batch for %r (query: %r, seeders: %d)",
                                uploader, title, query, r.seeders)
                    return r

    # Step 2: General batch search (any uploader)
    for term in search_terms:
        query = f"{term} batch"
        results = _scrape_nyaa(query)
        for r in results:
            if r.seeders > 0:
                logger.info("Found general batch for %r (query: %r, seeders: %d, title: %s)",
                            title, query, r.seeders, r.title)
                return r

    # Step 3: Last resort — just "1080p" (many batches don't say "batch")
    for term in search_terms:
        query = f"{term} 1080p"
        results = _scrape_nyaa(query)
        for r in results:
            if r.seeders > 0:
                logger.info("Found 1080p release for %r (query: %r, seeders: %d, title: %s)",
                            title, query, r.seeders, r.title)
                return r

    logger.warning("No results on Nyaa for %r (tried %d search terms)", title, len(search_terms))
    return None


# ---------------------------------------------------------------------------
# RSS helpers (for weekly polling only)
# ---------------------------------------------------------------------------

def _extract_rss_magnet(entry) -> Optional[str]:
    """Pull the magnet URI out of a feedparser entry."""
    magnet = getattr(entry, "nyaa_magneturi", None)
    if magnet:
        return magnet
    link = entry.get("link", "")
    if link.startswith("magnet:"):
        return link
    for enc in entry.get("enclosures", []):
        href = enc.get("href", "")
        if href.startswith("magnet:"):
            return href
    return None


def _extract_rss_seeders(entry) -> int:
    """Pull seeder count from nyaa:seeders tag, defaulting to 0."""
    val = getattr(entry, "nyaa_seeders", None)
    if val is not None:
        try:
            return int(val)
        except (ValueError, TypeError):
            pass
    return 0
