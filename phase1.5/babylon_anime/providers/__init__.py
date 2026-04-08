"""Provider registry — anime metadata and stream resolution."""

from .anilist import search as anilist_search, get_show as anilist_get_show, get_episodes as anilist_get_episodes
from .consumet import resolve_episode, health_check as consumet_health_check

# AnimeKai functions (direct access for advanced use)
from .animekai import (
    search as animekai_search,
    get_episodes as animekai_get_episodes,
    get_streams as animekai_get_streams,
    resolve_episode_stream as animekai_resolve,
)

DEFAULT_PROVIDER = "anilist"
