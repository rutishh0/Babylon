"""AnimeKai provider — web scraping based fallback."""

import logging
import re
from typing import Optional

from bs4 import BeautifulSoup

from .base import BaseProvider
from ..models import SearchResult, Episode, Stream, LanguageType

logger = logging.getLogger(__name__)

BASE_URL = "https://animekai.to"


class AnimeKaiProvider(BaseProvider):
    NAME = "animekai"
    BASE_URL = BASE_URL

    def search(self, query: str) -> list[SearchResult]:
        resp = self.session.get(f"{BASE_URL}/browser", params={"keyword": query}, timeout=15)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        results = []

        for card in soup.select(".aitem"):
            link = card.select_one("a.poster")
            if not link:
                continue
            href = link.get("href", "")
            anime_id = href.rstrip("/").split("/")[-1] if href else ""

            title_el = card.select_one(".title")
            title = title_el.get_text(strip=True) if title_el else "Unknown"

            img = card.select_one("img")
            cover = img.get("src") if img else None

            # Detect languages from info tags
            languages = []
            info_text = card.get_text().lower()
            if "sub" in info_text:
                languages.append(LanguageType.SUB)
            if "dub" in info_text:
                languages.append(LanguageType.DUB)
            if not languages:
                languages.append(LanguageType.SUB)

            results.append(SearchResult(
                id=anime_id,
                title=title,
                provider=self.NAME,
                languages=languages,
                cover_url=cover,
            ))

        return results

    def get_episodes(self, anime_id: str, lang: LanguageType = LanguageType.SUB) -> list[Episode]:
        resp = self.session.get(f"{BASE_URL}/watch/{anime_id}", timeout=15)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        episodes = []

        for ep_item in soup.select(".ep-item"):
            ep_num_text = ep_item.get("data-number") or ep_item.get_text(strip=True)
            try:
                num = float(re.search(r"[\d.]+", ep_num_text).group())
            except (AttributeError, ValueError):
                continue

            ep_id = ep_item.get("data-id", anime_id)
            episodes.append(Episode(
                anime_id=ep_id,
                number=num,
                provider=self.NAME,
                language=lang,
            ))

        episodes.sort(key=lambda e: e.number)
        return episodes

    def get_streams(self, anime_id: str, episode: Episode) -> list[Stream]:
        """AnimeKai stream extraction — returns empty if scraping fails."""
        # AnimeKai uses encrypted iframe sources that require complex decoding.
        # This is a simplified implementation that may not work for all episodes.
        logger.warning("AnimeKai stream extraction is limited — use AllAnime as primary provider")
        return []

    def get_info(self, anime_id: str) -> Optional[dict]:
        resp = self.session.get(f"{BASE_URL}/watch/{anime_id}", timeout=15)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        title_el = soup.select_one("h1.title")
        desc_el = soup.select_one(".synopsis .content")

        return {
            "id": anime_id,
            "title": title_el.get_text(strip=True) if title_el else None,
            "description": desc_el.get_text(strip=True) if desc_el else None,
            "genres": [g.get_text(strip=True) for g in soup.select(".genre a")],
        }
