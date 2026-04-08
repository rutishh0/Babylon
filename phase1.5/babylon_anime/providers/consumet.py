"""Consumet API provider — stream URL resolution via self-hosted consumet-api.

Consumet wraps multiple anime providers (Hianime/Zoro, Gogoanime, Animepahe)
under a single REST API. We try providers in order and return the first working source.

Requires: consumet-api running at CONSUMET_URL (default http://localhost:3100)
"""

import logging
import os
import re
from typing import Optional
from urllib.parse import quote

import requests

logger = logging.getLogger(__name__)

CONSUMET_URL = os.environ.get("CONSUMET_URL", "http://localhost:3100")

# Provider fallback chain — try in this order
PROVIDER_CHAIN = ["zoro", "gogoanime", "animepahe"]


def _consumet_get(path: str, params: dict = None, timeout: int = 15) -> Optional[dict]:
    """Make a GET request to the consumet API."""
    url = f"{CONSUMET_URL}{path}"
    try:
        resp = requests.get(url, params=params, timeout=timeout)
        if resp.status_code == 200:
            return resp.json()
        logger.debug("Consumet %s returned %d", path, resp.status_code)
        return None
    except requests.RequestException as e:
        logger.warning("Consumet request failed (%s): %s", path, e)
        return None


def search_provider(query: str, provider: str = "zoro") -> Optional[list]:
    """Search for anime on a specific consumet provider."""
    data = _consumet_get(f"/anime/{provider}/{quote(query)}")
    if data and data.get("results"):
        return data["results"]
    return None


def get_episode_list(anime_id: str, provider: str = "zoro") -> Optional[list]:
    """Get episode list for an anime from a specific provider."""
    data = _consumet_get(f"/anime/{provider}/info?id={quote(anime_id)}")
    if data and data.get("episodes"):
        return data["episodes"]
    return None


def _find_anime_on_provider(title: str, provider: str) -> Optional[str]:
    """Search for an anime on a provider and return its provider-specific ID."""
    results = search_provider(title, provider)
    if not results:
        return None

    # Try exact match first, then fuzzy
    title_lower = title.lower().strip()
    for r in results:
        r_title = (r.get("title") or "").lower().strip()
        if r_title == title_lower:
            return r.get("id")

    # Try prefix match
    for r in results:
        r_title = (r.get("title") or "").lower().strip()
        if r_title.startswith(title_lower) or title_lower.startswith(r_title):
            return r.get("id")

    # Fall back to first result
    if results:
        return results[0].get("id")
    return None


def _find_episode_id(anime_id: str, episode_number: int, provider: str) -> Optional[str]:
    """Find the consumet episode ID for a specific episode number."""
    episodes = get_episode_list(anime_id, provider)
    if not episodes:
        return None

    for ep in episodes:
        ep_num = ep.get("number") or ep.get("episode")
        if ep_num is not None and int(ep_num) == episode_number:
            return ep.get("id")

    # Fallback: try matching by index (episodes are usually in order)
    if 0 < episode_number <= len(episodes):
        return episodes[episode_number - 1].get("id")

    return None


def resolve_episode(
    show_title: str,
    episode_number: int,
    dub: bool = False,
) -> Optional[dict]:
    """Resolve a streaming URL for an episode using the consumet provider chain.

    Tries Hianime (zoro) → Gogoanime → Animepahe in order.
    Returns the first working source with URL, headers, and referer.

    Returns:
        dict with keys: url, headers, referer, provider, quality, format
        or None if all providers fail.
    """
    search_title = show_title
    if dub:
        search_title = f"{show_title} dub"

    for provider in PROVIDER_CHAIN:
        try:
            logger.info("Trying %s for '%s' ep %d", provider, show_title, episode_number)

            # Step 1: Find the anime on this provider
            anime_id = _find_anime_on_provider(search_title, provider)
            if not anime_id:
                logger.debug("Anime not found on %s", provider)
                continue

            # Step 2: Find the episode ID
            episode_id = _find_episode_id(anime_id, episode_number, provider)
            if not episode_id:
                logger.debug("Episode %d not found on %s", episode_number, provider)
                continue

            # Step 3: Get streaming sources
            data = _consumet_get(f"/anime/{provider}/watch?episodeId={quote(episode_id)}")
            if not data or not data.get("sources"):
                logger.debug("No sources from %s", provider)
                continue

            sources = data["sources"]
            headers_info = data.get("headers", {})

            # Pick the best source (prefer higher quality, prefer m3u8)
            best = None
            for src in sources:
                quality = src.get("quality", "default")
                if quality in ("1080p", "default", "auto") or not best:
                    best = src

            if not best:
                continue

            result = {
                "url": best["url"],
                "quality": best.get("quality", "auto"),
                "format": "m3u8" if ".m3u8" in best["url"] else "mp4",
                "referer": headers_info.get("Referer", ""),
                "headers": headers_info,
                "provider": provider,
                "subtitles": data.get("subtitles", []),
            }

            logger.info("Resolved via %s: %s (%s)", provider, result["quality"], result["format"])
            return result

        except Exception as e:
            logger.warning("Provider %s failed for '%s' ep %d: %s", provider, show_title, episode_number, e)
            continue

    logger.error("All providers failed for '%s' episode %d", show_title, episode_number)
    return None


def health_check() -> bool:
    """Check if consumet-api is reachable."""
    try:
        resp = requests.get(f"{CONSUMET_URL}/", timeout=5)
        return resp.status_code == 200
    except Exception:
        return False
