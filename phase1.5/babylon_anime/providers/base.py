"""Abstract base class for anime providers."""

from abc import ABC, abstractmethod
from typing import Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..models import SearchResult, Episode, Stream, LanguageType


class BaseProvider(ABC):
    """Base class all providers must implement."""

    NAME: str = ""
    BASE_URL: str = ""

    def __init__(self):
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        session = requests.Session()
        retry = Retry(total=3, backoff_factor=0.5, status_forcelist=[500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retry)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
        })
        return session

    @abstractmethod
    def search(self, query: str) -> list[SearchResult]:
        """Search for anime by title."""
        ...

    @abstractmethod
    def get_episodes(self, anime_id: str, lang: LanguageType = LanguageType.SUB) -> list[Episode]:
        """Get all episodes for an anime."""
        ...

    @abstractmethod
    def get_streams(self, anime_id: str, episode: Episode) -> list[Stream]:
        """Get all available streams for an episode."""
        ...

    def get_info(self, anime_id: str) -> Optional[dict]:
        """Get detailed anime info. Optional — providers may return None."""
        return None
