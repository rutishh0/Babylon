"""Provider registry — all anime source providers."""

from .base import BaseProvider
from .allanime import AllAnimeProvider
from .animekai import AnimeKaiProvider

_PROVIDERS: dict[str, type[BaseProvider]] = {
    "allanime": AllAnimeProvider,
    "animekai": AnimeKaiProvider,
}

DEFAULT_PROVIDER = "allanime"


def get_provider(name: str = DEFAULT_PROVIDER) -> BaseProvider:
    """Get a provider instance by name."""
    cls = _PROVIDERS.get(name.lower())
    if cls is None:
        raise ValueError(f"Unknown provider: {name}. Available: {list(_PROVIDERS.keys())}")
    return cls()


def list_providers() -> list[str]:
    """List all available provider names."""
    return list(_PROVIDERS.keys())
