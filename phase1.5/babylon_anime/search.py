"""Top-level search function that queries all providers."""

from .models import SearchResult
from .providers import get_provider, list_providers, DEFAULT_PROVIDER


def search(query: str, provider: str = DEFAULT_PROVIDER) -> list[SearchResult]:
    """
    Search for anime across providers.

    Args:
        query: Search string (anime title)
        provider: Provider name ("allanime", "animekai") or "all"

    Returns:
        List of SearchResult objects
    """
    if provider == "all":
        results = []
        for name in list_providers():
            try:
                p = get_provider(name)
                results.extend(p.search(query))
            except Exception:
                continue
        return results

    p = get_provider(provider)
    return p.search(query)
