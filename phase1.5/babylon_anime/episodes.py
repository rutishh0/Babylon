"""Episode listing functions."""

from .models import SearchResult, Anime, Episode, LanguageType
from .providers import get_provider


def get_episodes(
    anime: SearchResult | Anime | str,
    lang: LanguageType = LanguageType.SUB,
    provider: str = "allanime",
) -> list[Episode]:
    """
    Get all episodes for an anime.

    Args:
        anime: SearchResult, Anime, or anime ID string
        lang: Language type (SUB or DUB)
        provider: Provider name (used when anime is a string ID)

    Returns:
        Sorted list of Episode objects
    """
    if isinstance(anime, (SearchResult, Anime)):
        p = get_provider(anime.provider)
        return p.get_episodes(anime.id, lang)
    else:
        p = get_provider(provider)
        return p.get_episodes(anime, lang)
