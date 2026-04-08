"""AniList GraphQL provider — reliable metadata, search, and episode listing.

API: https://graphql.anilist.co (no auth, no rate limit issues)
"""

import logging
import time
from typing import Optional

import requests

from ..models import SearchResult, Episode, LanguageType

logger = logging.getLogger(__name__)

ANILIST_URL = "https://graphql.anilist.co"

# Simple in-memory cache: key -> (timestamp, data)
_cache: dict[str, tuple[float, any]] = {}
CACHE_TTL = 86400  # 24 hours


def _cached_query(key: str, query: str, variables: dict) -> dict:
    """Execute a GraphQL query with caching."""
    now = time.time()
    if key in _cache:
        ts, data = _cache[key]
        if now - ts < CACHE_TTL:
            return data

    resp = requests.post(
        ANILIST_URL,
        json={"query": query, "variables": variables},
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json().get("data", {})
    _cache[key] = (now, data)
    return data


# ---------------------------------------------------------------------------
# GraphQL queries
# ---------------------------------------------------------------------------

SEARCH_QUERY = """
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title { romaji english native }
      coverImage { large extraLarge }
      bannerImage
      description(asHtml: false)
      genres
      averageScore
      seasonYear
      season
      episodes
      status
      format
      nextAiringEpisode { episode }
    }
  }
}
"""

SHOW_QUERY = """
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    coverImage { large extraLarge }
    bannerImage
    description(asHtml: false)
    genres
    averageScore
    seasonYear
    season
    episodes
    status
    format
    duration
    nextAiringEpisode { episode airingAt }
    relations {
      edges {
        relationType
        node { id title { romaji english } type format }
      }
    }
  }
}
"""

EPISODES_QUERY = """
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english }
    episodes
    nextAiringEpisode { episode }
    status
    streamingEpisodes {
      title
      thumbnail
    }
  }
}
"""


def search(query: str) -> list[SearchResult]:
    """Search AniList for anime by title."""
    cache_key = f"search:{query.lower()}"
    data = _cached_query(cache_key, SEARCH_QUERY, {
        "search": query,
        "page": 1,
        "perPage": 20,
    })

    results = []
    for media in data.get("Page", {}).get("media", []):
        title = media.get("title", {})
        english = title.get("english") or title.get("romaji") or ""
        cover = media.get("coverImage", {})

        languages = [LanguageType.SUB]  # AniList doesn't track dub availability

        results.append(SearchResult(
            id=str(media["id"]),
            title=english,
            native_title=title.get("native"),
            provider="anilist",
            languages=languages,
            year=media.get("seasonYear"),
            episode_count=media.get("episodes"),
            cover_url=cover.get("extraLarge") or cover.get("large"),
            description=(media.get("description") or "")[:500],
            genres=media.get("genres", []),
            status=media.get("status"),
        ))

    return results


def get_show(anilist_id: int | str) -> Optional[dict]:
    """Get full show details from AniList."""
    aid = int(anilist_id)
    cache_key = f"show:{aid}"
    data = _cached_query(cache_key, SHOW_QUERY, {"id": aid})

    media = data.get("Media")
    if not media:
        return None

    title = media.get("title", {})
    cover = media.get("coverImage", {})

    return {
        "id": str(media["id"]),
        "title": title.get("english") or title.get("romaji") or "",
        "romaji_title": title.get("romaji"),
        "native_title": title.get("native"),
        "cover_url": cover.get("extraLarge") or cover.get("large"),
        "banner_url": media.get("bannerImage"),
        "description": media.get("description"),
        "genres": media.get("genres", []),
        "score": media.get("averageScore"),
        "year": media.get("seasonYear"),
        "season": media.get("season"),
        "episodes": media.get("episodes"),
        "status": media.get("status"),
        "format": media.get("format"),
        "duration": media.get("duration"),
    }


def get_episodes(anilist_id: int | str, lang: LanguageType = LanguageType.SUB) -> list[Episode]:
    """Get episode list from AniList metadata.

    AniList doesn't have per-episode streaming data, so we generate
    episode numbers from the total count + airing status.
    """
    aid = int(anilist_id)
    cache_key = f"episodes:{aid}"
    data = _cached_query(cache_key, EPISODES_QUERY, {"id": aid})

    media = data.get("Media")
    if not media:
        return []

    total = media.get("episodes")
    next_airing = media.get("nextAiringEpisode")
    status = media.get("status")

    # For airing shows, use nextAiringEpisode - 1 as the latest available
    if status == "RELEASING" and next_airing:
        available = next_airing.get("episode", 1) - 1
    elif total:
        available = total
    else:
        # Unknown episode count — try streaming episodes list
        streaming = media.get("streamingEpisodes", [])
        available = len(streaming) if streaming else 0

    if available <= 0:
        return []

    episodes = []
    for i in range(1, available + 1):
        episodes.append(Episode(
            anime_id=str(aid),
            number=float(i),
            provider="anilist",
            language=lang,
        ))

    return episodes
