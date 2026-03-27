"""
rss_poller.py — Nyaa/SubsPlease RSS polling and watchlist matching.

SubsPlease RSS URL (1080p, no batches):
  https://nyaa.si/?page=rss&u=subsplease&q=1080p+-batch

Backlog batch search (SubsPlease uploader):
  https://nyaa.si/?page=rss&q={TITLE}+1080p+Batch&u=subsplease

Backlog batch search (no uploader filter, fallback):
  https://nyaa.si/?page=rss&q={TITLE}+1080p+Batch
"""

import time
import logging
from typing import Optional
from dataclasses import dataclass
from urllib.parse import quote_plus

import feedparser

logger = logging.getLogger(__name__)

SUBSPLEASE_RSS = "https://nyaa.si/?page=rss&u=subsplease&q=1080p+-batch"
NYAA_RSS_BASE = "https://nyaa.si/?page=rss"


@dataclass
class RssItem:
    title: str
    episode: Optional[int]   # None for non-episode files
    magnet_link: str
    seeders: int


def poll_subsplease() -> list[RssItem]:
    """
    Fetch the SubsPlease 1080p RSS feed and return a list of RssItems.
    Returns an empty list on network errors (caller should retry next cycle).
    """
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

        # Magnet link is in entry.link or a <nyaa:magnetUri> tag
        magnet = _extract_magnet(entry)
        if not magnet:
            continue

        episode = parse_episode(title)
        seeders = _extract_seeders(entry)
        items.append(RssItem(title=title, episode=episode, magnet_link=magnet, seeders=seeders))

    logger.info("SubsPlease RSS returned %d usable items", len(items))
    return items


def match_watchlist(rss_items: list[RssItem], watchlist: list[dict]) -> list[tuple[RssItem, dict]]:
    """
    Case-insensitive match each RSS item title against watchlist titles + aliases.

    Returns a list of (rss_item, watchlist_entry) pairs where the RSS item title
    contains the watchlist title or one of its aliases as a substring.
    """
    matched: list[tuple[RssItem, dict]] = []
    for item in rss_items:
        title_lower = item.title.lower()
        for entry in watchlist:
            candidates = [entry["title"]] + entry.get("aliases", [])
            for candidate in candidates:
                if candidate.lower() in title_lower:
                    matched.append((item, entry))
                    break  # one watchlist entry match per RSS item is enough
    return matched


def search_nyaa_batch(title: str, aliases: list[str]) -> Optional[RssItem]:
    """
    Search Nyaa for a completed batch for *title*.

    Strategy:
    1. Search SubsPlease uploader: ?q={title}+1080p+Batch&u=subsplease
    2. Try each alias with SubsPlease uploader
    3. Fallback: no uploader filter, pick highest-seeded result

    Returns the best RssItem found, or None if nothing found.
    """
    from filename_parser import is_non_episode

    search_terms = [title] + aliases

    # Pass 1: SubsPlease uploader
    for term in search_terms:
        result = _search_nyaa(term, uploader="subsplease")
        if result:
            logger.info("Found SubsPlease batch for %r (query: %r)", title, term)
            return result

    # Pass 2: any uploader
    for term in search_terms:
        result = _search_nyaa(term, uploader=None)
        if result:
            logger.info("Found general batch for %r (query: %r) — not SubsPlease", title, term)
            return result

    logger.warning("No batch found on Nyaa for %r (tried %d search terms)", title, len(search_terms))
    return None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _search_nyaa(query: str, uploader: Optional[str]) -> Optional[RssItem]:
    """Fetch one Nyaa RSS search page and return the best (most-seeded) result."""
    q = quote_plus(f"{query} 1080p Batch")
    url = f"{NYAA_RSS_BASE}&q={q}"
    if uploader:
        url += f"&u={uploader}"

    try:
        feed = feedparser.parse(url)
    except Exception as exc:
        logger.error("Nyaa search failed (query=%r): %s", query, exc)
        return None

    best: Optional[RssItem] = None
    for entry in feed.entries:
        title = entry.get("title", "")
        magnet = _extract_magnet(entry)
        if not magnet:
            continue
        seeders = _extract_seeders(entry)
        item = RssItem(title=title, episode=None, magnet_link=magnet, seeders=seeders)
        if best is None or item.seeders > best.seeders:
            best = item

    return best


def _extract_magnet(entry) -> Optional[str]:
    """Pull the magnet URI out of a feedparser entry."""
    # feedparser puts custom namespaced tags in entry.tags or entry.<ns>_<tag>
    # nyaa uses <nyaa:magnetUri>
    magnet = getattr(entry, "nyaa_magneturi", None)
    if magnet:
        return magnet

    # Some mirrors put it in entry.link
    link = entry.get("link", "")
    if link.startswith("magnet:"):
        return link

    # Check enclosures
    for enc in entry.get("enclosures", []):
        href = enc.get("href", "")
        if href.startswith("magnet:"):
            return href

    return None


def _extract_seeders(entry) -> int:
    """Pull seeder count from nyaa:seeders tag, defaulting to 0."""
    val = getattr(entry, "nyaa_seeders", None)
    if val is not None:
        try:
            return int(val)
        except (ValueError, TypeError):
            pass
    return 0
