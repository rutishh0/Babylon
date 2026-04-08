"""Provider registry — all anime source providers."""

from .base import BaseProvider
from .anilist import search as anilist_search, get_show as anilist_get_show, get_episodes as anilist_get_episodes
from .consumet import resolve_episode, health_check as consumet_health_check

# Legacy providers kept as fallback (currently both down/blocked as of April 2026)
try:
    from .allanime import AllAnimeProvider
except ImportError:
    AllAnimeProvider = None

try:
    from .animekai import AnimeKaiProvider
except ImportError:
    AnimeKaiProvider = None

_PROVIDERS: dict[str, type[BaseProvider]] = {}
if AllAnimeProvider:
    _PROVIDERS["allanime"] = AllAnimeProvider
if AnimeKaiProvider:
    _PROVIDERS["animekai"] = AnimeKaiProvider

DEFAULT_PROVIDER = "anilist"


def get_provider(name: str = DEFAULT_PROVIDER) -> BaseProvider:
    """Get a legacy provider instance by name."""
    cls = _PROVIDERS.get(name.lower())
    if cls is None:
        raise ValueError(f"Unknown provider: {name}. Available: {list(_PROVIDERS.keys())}")
    return cls()


def list_providers() -> list[str]:
    """List all available legacy provider names."""
    return list(_PROVIDERS.keys())
