"""Data models for anime, episodes, and streams."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class LanguageType(Enum):
    SUB = "sub"
    DUB = "dub"


class Quality(Enum):
    Q360 = "360"
    Q480 = "480"
    Q720 = "720"
    Q1080 = "1080"
    BEST = "best"
    WORST = "worst"


@dataclass
class SearchResult:
    """A search result from a provider."""
    id: str
    title: str
    provider: str
    languages: list[LanguageType] = field(default_factory=list)
    year: Optional[int] = None
    episode_count: Optional[int] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    genres: list[str] = field(default_factory=list)
    status: Optional[str] = None  # "AIRING", "FINISHED", etc.


@dataclass
class Episode:
    """An episode reference (not yet resolved to a stream URL)."""
    anime_id: str
    number: float  # float to support 1.5-type episodes
    provider: str
    language: LanguageType = LanguageType.SUB
    title: Optional[str] = None


@dataclass
class Subtitle:
    """A subtitle track."""
    url: str
    language: str
    label: Optional[str] = None


@dataclass
class Stream:
    """A resolved streaming URL for an episode."""
    url: str
    quality: Optional[str] = None  # e.g. "1080", "720"
    format: str = "m3u8"  # "m3u8" or "mp4"
    referer: Optional[str] = None
    subtitles: list[Subtitle] = field(default_factory=list)
    provider_name: str = ""  # which internal provider served this


@dataclass
class Anime:
    """Full anime details from a provider."""
    id: str
    title: str
    provider: str
    languages: list[LanguageType] = field(default_factory=list)
    year: Optional[int] = None
    episode_count: Optional[int] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    genres: list[str] = field(default_factory=list)
    status: Optional[str] = None
    alt_titles: list[str] = field(default_factory=list)

    @classmethod
    def from_search_result(cls, result: SearchResult) -> "Anime":
        return cls(
            id=result.id,
            title=result.title,
            provider=result.provider,
            languages=result.languages,
            year=result.year,
            episode_count=result.episode_count,
            cover_url=result.cover_url,
            description=result.description,
            genres=result.genres,
            status=result.status,
        )
