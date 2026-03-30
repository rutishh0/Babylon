"""Stream resolution functions."""

from typing import Optional
from .models import SearchResult, Anime, Episode, Stream, Quality
from .providers import get_provider


def get_streams(
    episode: Episode,
    anime_id: Optional[str] = None,
) -> list[Stream]:
    """Get all available streams for an episode, sorted by quality (highest first)."""
    aid = anime_id or episode.anime_id
    p = get_provider(episode.provider)
    streams = p.get_streams(aid, episode)

    def quality_sort_key(s: Stream) -> int:
        try:
            return int(s.quality or "0")
        except ValueError:
            return 0

    return sorted(streams, key=quality_sort_key, reverse=True)


def get_stream(
    episode: Episode,
    quality: str = "best",
    anime_id: Optional[str] = None,
) -> Optional[Stream]:
    """
    Get the best matching stream for an episode.

    Args:
        episode: Episode to get stream for
        quality: "best", "worst", or a resolution like "1080", "720"
        anime_id: Override anime ID

    Returns:
        Best matching Stream, or None if no streams found
    """
    streams = get_streams(episode, anime_id)
    if not streams:
        return None

    if quality == "best":
        return streams[0]
    elif quality == "worst":
        return streams[-1]
    else:
        # Find exact or closest match
        for s in streams:
            if s.quality == quality:
                return s
        # Fallback to best
        return streams[0]
