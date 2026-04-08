"""Nyaa.si torrent search for anime batch downloads.

Scrapes Nyaa's HTML search page (no API needed, no Cloudflare).
Prioritizes batch releases from quality uploaders.
"""

import logging
import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

NYAA_URL = "https://nyaa.si/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
}

# Preferred uploaders (smaller encodes first)
PREFERRED_UPLOADERS = ["judas", "ember", "asw", "subsplease", "erai-raws"]


@dataclass
class NyaaResult:
    title: str
    magnet: str
    seeders: int
    size: str
    category: str = ""


def search_nyaa(query: str, batch_only: bool = False) -> list[NyaaResult]:
    """Search Nyaa for anime torrents, sorted by seeders descending.

    Args:
        query: Search string
        batch_only: If True, append 'batch' to query

    Returns:
        List of NyaaResult sorted by seeders
    """
    q = f"{query} batch" if batch_only else query
    url = f"{NYAA_URL}?f=0&c=1_2&q={quote_plus(q)}&s=seeders&o=desc"

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        logger.error("Nyaa search failed (%s): %s", query, e)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    table = soup.select_one("table.torrent-list tbody")
    if not table:
        return []

    results = []
    for row in table.select("tr"):
        cols = row.select("td")
        if len(cols) < 7:
            continue

        name_col = cols[1]
        title_links = name_col.select("a:not(.comments)")
        if not title_links:
            continue
        title = title_links[-1].get_text(strip=True)

        link_col = cols[2]
        magnet = None
        for a in link_col.select("a"):
            href = a.get("href", "")
            if href.startswith("magnet:"):
                magnet = href
                break
        if not magnet:
            continue

        size = cols[3].get_text(strip=True)
        try:
            seeders = int(cols[5].get_text(strip=True))
        except (ValueError, IndexError):
            seeders = 0

        results.append(NyaaResult(
            title=title, magnet=magnet, seeders=seeders, size=size,
        ))

    return results


def find_best_batch(title: str, aliases: list[str] = None) -> Optional[NyaaResult]:
    """Find the best batch torrent for an anime.

    Tries preferred uploaders first (Judas, Ember, etc.), then falls
    back to most-seeded batch, then most-seeded single result.
    """
    search_terms = [title]
    if aliases:
        search_terms.extend(aliases)

    # Strip "Season N" to broaden matches
    stripped = re.sub(r'\s+Season\s+\d+\s*$', '', title, flags=re.IGNORECASE).strip()
    if stripped != title and stripped:
        search_terms.append(stripped)

    # Deduplicate
    seen = set()
    unique_terms = []
    for t in search_terms:
        if t.lower() not in seen:
            seen.add(t.lower())
            unique_terms.append(t)

    # Step 1: Try preferred uploaders with batch keyword
    for uploader in PREFERRED_UPLOADERS:
        for term in unique_terms:
            results = search_nyaa(f"{term} batch {uploader}")
            for r in results:
                if r.seeders > 0:
                    logger.info("Found %s batch for '%s' (seeders: %d)", uploader, title, r.seeders)
                    return r

    # Step 2: General batch search
    for term in unique_terms:
        results = search_nyaa(f"{term} batch")
        for r in results:
            if r.seeders > 0:
                logger.info("Found batch for '%s' (seeders: %d, title: %s)", title, r.seeders, r.title[:60])
                return r

    # Step 3: Any 1080p result
    for term in unique_terms:
        results = search_nyaa(f"{term} 1080p")
        for r in results:
            if r.seeders > 0:
                logger.info("Found 1080p for '%s' (seeders: %d)", title, r.seeders)
                return r

    logger.warning("No Nyaa results for '%s'", title)
    return None
