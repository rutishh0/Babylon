"""Babylon Phase 1.5 — Anime streaming library.

Architecture:
  - Search/metadata: AniList GraphQL (always available, no auth)
  - Stream resolution: AnimeKai via curl_cffi + enc-dec.app
  - Downloads: yt-dlp
"""

from .providers.anilist import search as anilist_search, get_show, get_episodes as anilist_get_episodes
from .providers.consumet import resolve_episode, health_check as consumet_health_check
from .download import download_episode, download_from_resolved, download_subtitles_from_resolved
from .models import (
    Anime,
    Episode,
    Stream,
    SearchResult,
    LanguageType,
    Quality,
)

# Top-level convenience functions
search = anilist_search
get_episodes = anilist_get_episodes

__all__ = [
    "search",
    "anilist_search",
    "get_show",
    "get_episodes",
    "anilist_get_episodes",
    "resolve_episode",
    "consumet_health_check",
    "download_episode",
    "download_from_resolved",
    "download_subtitles_from_resolved",
    "Anime",
    "Episode",
    "Stream",
    "SearchResult",
    "LanguageType",
    "Quality",
]
