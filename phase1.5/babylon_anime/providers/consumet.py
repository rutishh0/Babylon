"""Stream resolution layer — resolves anime episodes to playable URLs.

Uses AnimeKai (via curl_cffi + enc-dec.app) as the primary stream source.
Falls back gracefully if AnimeKai is unavailable.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


def resolve_episode(
    show_title: str,
    episode_number: int,
    dub: bool = False,
) -> Optional[dict]:
    """Resolve a streaming URL for an episode.

    Tries AnimeKai first (with Cloudflare bypass via curl_cffi).

    Returns:
        dict with keys: url, headers, referer, provider, quality, format, subtitles
        or None if resolution fails.
    """
    # Try AnimeKai
    try:
        from .animekai import resolve_episode_stream
        result = resolve_episode_stream(show_title, episode_number, dub=dub)
        if result:
            logger.info("Resolved '%s' ep %d via AnimeKai (%s)",
                        show_title, episode_number, result.get("provider", ""))
            return result
    except Exception as e:
        logger.warning("AnimeKai resolution failed for '%s' ep %d: %s",
                       show_title, episode_number, e)

    logger.error("All stream providers failed for '%s' episode %d", show_title, episode_number)
    return None


def health_check() -> bool:
    """Check if stream resolution is available."""
    try:
        from curl_cffi import requests as curl_requests
        session = curl_requests.Session(impersonate="chrome124")
        resp = session.get("https://anikai.to/", timeout=10)
        return resp.status_code == 200
    except Exception:
        return False
