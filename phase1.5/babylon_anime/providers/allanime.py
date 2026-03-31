"""AllAnime provider — GraphQL API scraping (from ani-cli logic)."""

import json
import logging
import re
from typing import Optional
from urllib.parse import quote

from .base import BaseProvider
from ..models import SearchResult, Episode, Stream, Subtitle, LanguageType

logger = logging.getLogger(__name__)

API_URL = "https://api.allanime.day/api"
BASE_URL = "https://allanime.day"
REFERER = "https://allmanga.to"

ALLANIME_COVER_BASE = "https://wp.youtube-anime.com/aln.youtube-anime.com/"

SEARCH_GQL = """
query($search: SearchInput, $limit: Int, $page: Int, $translationType: VaildTranslationTypeEnumType, $countryOrigin: VaildCountryOriginEnumType) {
    shows(search: $search, limit: $limit, page: $page, translationType: $translationType, countryOrigin: $countryOrigin) {
        edges {
            _id
            name
            englishName
            altNames
            availableEpisodesDetail
            thumbnail
            description
            genres
            status
            season
            airedStart
        }
    }
}
"""

EPISODES_GQL = """
query($showId: String!) {
    show(_id: $showId) {
        availableEpisodesDetail
    }
}
"""

STREAMS_GQL = """
query($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
    episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) {
        episodeString
        sourceUrls
    }
}
"""

INFO_GQL = """
query($showId: String!) {
    show(_id: $showId) {
        _id
        name
        englishName
        description
        genres
        status
        season
        score
        thumbnail
        airedStart
        availableEpisodesDetail
        altNames
    }
}
"""

# Substitution cipher table from ani-cli source (NOT XOR — it's a static hex-to-char map)
_SUBST_TABLE = {
    '79': 'A', '7a': 'B', '7b': 'C', '7c': 'D', '7d': 'E', '7e': 'F', '7f': 'G',
    '70': 'H', '71': 'I', '72': 'J', '73': 'K', '74': 'L', '75': 'M', '76': 'N',
    '77': 'O', '68': 'P', '69': 'Q', '6a': 'R', '6b': 'S', '6c': 'T', '6d': 'U',
    '6e': 'V', '6f': 'W', '60': 'X', '61': 'Y', '62': 'Z', '59': 'a', '5a': 'b',
    '5b': 'c', '5c': 'd', '5d': 'e', '5e': 'f', '5f': 'g', '50': 'h', '51': 'i',
    '52': 'j', '53': 'k', '54': 'l', '55': 'm', '56': 'n', '57': 'o', '48': 'p',
    '49': 'q', '4a': 'r', '4b': 's', '4c': 't', '4d': 'u', '4e': 'v', '4f': 'w',
    '40': 'x', '41': 'y', '42': 'z', '08': '0', '09': '1', '0a': '2', '0b': '3',
    '0c': '4', '0d': '5', '0e': '6', '0f': '7', '00': '8', '01': '9', '15': '-',
    '16': '.', '67': '_', '46': '~', '02': ':', '17': '/', '07': '?', '1b': '#',
    '63': '[', '65': ']', '78': '@', '19': '!', '1c': '$', '1e': '&', '10': '(',
    '11': ')', '12': '*', '13': '+', '14': ',', '03': ';', '05': '=', '1d': '%',
}


def _decrypt(encrypted: str) -> str:
    """Decrypt provider URLs using ani-cli's hex substitution cipher."""
    if not encrypted.startswith("-"):
        return encrypted
    # Strip leading dashes (usually -- prefix)
    hex_str = encrypted.lstrip("-")
    # Split into 2-char hex pairs and substitute
    pairs = [hex_str[i:i+2] for i in range(0, len(hex_str), 2)]
    return ''.join(_SUBST_TABLE.get(p, '?') for p in pairs)


def _fix_cover_url(url: str | None) -> str | None:
    """Fix relative AllAnime cover URLs by prepending the CDN base."""
    if not url:
        return None
    if url.startswith("http"):
        return url
    # Relative path like "mcovers/a_tbs/dhw/xxx.webp"
    return ALLANIME_COVER_BASE + url


def _parse_m3u8_qualities(m3u8_text: str, base_url: str) -> list[tuple[str, str]]:
    """Parse M3U8 master playlist to extract quality -> URL pairs."""
    qualities = []
    lines = m3u8_text.strip().split("\n")
    for i, line in enumerate(lines):
        if line.startswith("#EXT-X-STREAM-INF:"):
            res_match = re.search(r"RESOLUTION=\d+x(\d+)", line)
            quality = res_match.group(1) if res_match else "unknown"
            if i + 1 < len(lines) and not lines[i + 1].startswith("#"):
                url = lines[i + 1].strip()
                if not url.startswith("http"):
                    url = base_url.rsplit("/", 1)[0] + "/" + url
                qualities.append((quality, url))
    return qualities


class AllAnimeProvider(BaseProvider):
    NAME = "allanime"
    BASE_URL = BASE_URL

    def __init__(self):
        super().__init__()
        self.session.headers.update({
            "Referer": REFERER,
            "Origin": REFERER,
        })

    def _gql(self, query: str, variables: dict) -> dict:
        """Execute a GraphQL query against the AllAnime API."""
        params = {
            "query": query,
            "variables": json.dumps(variables),
        }
        resp = self.session.get(API_URL, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", {})

    def search(self, query: str) -> list[SearchResult]:
        results = []
        for lang_type in ["sub", "dub"]:
            data = self._gql(SEARCH_GQL, {
                "search": {"query": query, "sortBy": "Latest_Update"},
                "limit": 20,
                "page": 1,
                "translationType": lang_type,
                "countryOrigin": "ALL",
            })
            for edge in data.get("shows", {}).get("edges", []):
                aid = edge["_id"]
                # Check if we already have this ID
                existing = next((r for r in results if r.id == aid), None)
                eps = edge.get("availableEpisodesDetail", {}) or {}
                if existing:
                    # Add language type
                    lt = LanguageType.SUB if lang_type == "sub" else LanguageType.DUB
                    if lt not in existing.languages:
                        existing.languages.append(lt)
                    continue

                languages = []
                if eps.get("sub"):
                    languages.append(LanguageType.SUB)
                if eps.get("dub"):
                    languages.append(LanguageType.DUB)

                year = None
                aired = edge.get("airedStart")
                if aired and isinstance(aired, dict):
                    year = aired.get("year")

                ep_count = None
                sub_eps = eps.get("sub")
                if sub_eps:
                    ep_count = len(sub_eps) if isinstance(sub_eps, list) else None

                # Prefer English name, fall back to Japanese romanized
                jp_name = edge.get("name", "Unknown")
                en_name = edge.get("englishName") or ""
                display_title = en_name if en_name else jp_name

                results.append(SearchResult(
                    id=aid,
                    title=display_title,
                    native_title=jp_name if jp_name != display_title else None,
                    provider=self.NAME,
                    languages=languages,
                    year=year,
                    episode_count=ep_count,
                    cover_url=_fix_cover_url(edge.get("thumbnail")),
                    description=edge.get("description"),
                    genres=edge.get("genres", []),
                    status=edge.get("status"),
                ))
        return results

    def get_episodes(self, anime_id: str, lang: LanguageType = LanguageType.SUB) -> list[Episode]:
        data = self._gql(EPISODES_GQL, {"showId": anime_id})
        eps_detail = data.get("show", {}).get("availableEpisodesDetail", {}) or {}
        lang_key = "sub" if lang == LanguageType.SUB else "dub"
        ep_list = eps_detail.get(lang_key, [])
        if not ep_list:
            return []

        episodes = []
        for ep in ep_list:
            try:
                num = float(ep)
            except (ValueError, TypeError):
                continue
            episodes.append(Episode(
                anime_id=anime_id,
                number=num,
                provider=self.NAME,
                language=lang,
            ))
        episodes.sort(key=lambda e: e.number)
        return episodes

    def get_streams(self, anime_id: str, episode: Episode) -> list[Stream]:
        lang_str = "sub" if episode.language == LanguageType.SUB else "dub"
        ep_str = str(int(episode.number)) if episode.number == int(episode.number) else str(episode.number)

        data = self._gql(STREAMS_GQL, {
            "showId": anime_id,
            "translationType": lang_str,
            "episodeString": ep_str,
        })

        ep_data = data.get("episode", {})
        if not ep_data:
            return []

        source_urls = ep_data.get("sourceUrls", [])
        streams = []

        # Sort sources: type=player first (direct downloadable URLs), then others
        player_sources = [s for s in source_urls if s.get("type") == "player"]
        other_sources = [s for s in source_urls if s.get("type") != "player"]

        for source in player_sources + other_sources:
            try:
                raw_url = source.get("sourceUrl", "")
                source_name = source.get("sourceName", "")
                stype = source.get("type", "")

                decrypted = _decrypt(raw_url)
                if not decrypted or '?' * 3 in decrypted:
                    continue

                # type=player sources decode to direct downloadable URLs (e.g. Yt-mp4)
                # These are the only reliable source for actual video downloads.
                if stype == "player" and decrypted.startswith("http"):
                    streams.append(Stream(
                        url=decrypted,
                        quality="1080",
                        format="mp4",
                        referer=REFERER,
                        provider_name=source_name,
                    ))
                    continue

                # Skip iframe embeds (mp4upload, ok.ru, streamwish, etc.)
                # These are HTML pages with JS players, not downloadable files.
                if stype == "iframe" and decrypted.startswith("http"):
                    logger.debug("Skipping iframe embed: %s (%s)", source_name, decrypted[:60])
                    continue

                # AllAnime /apivtwo/clock endpoints — these sometimes return
                # direct links but often return more encoded data. Try them as fallback.
                if decrypted.startswith("/apivtwo/"):
                    clock_url = f"{BASE_URL}{decrypted}"
                    try:
                        resp = self.session.get(clock_url, timeout=15, headers={"Referer": REFERER})
                        if resp.status_code != 200:
                            continue
                        clock_data = resp.json()
                        links = clock_data.get("links", [])
                        for link in links:
                            link_url = link.get("link", "")
                            if not link_url or not link_url.startswith("http"):
                                continue

                            subtitles = []
                            for sub in link.get("subtitles", []):
                                subtitles.append(Subtitle(
                                    url=sub.get("src", ""),
                                    language=sub.get("label", "Unknown"),
                                ))

                            res_str = link.get("resolutionStr", "unknown")

                            if ".m3u8" in link_url:
                                try:
                                    m3u8_resp = self.session.get(link_url, timeout=10)
                                    if "#EXT-X-STREAM-INF" in m3u8_resp.text:
                                        for quality, q_url in _parse_m3u8_qualities(m3u8_resp.text, link_url):
                                            streams.append(Stream(
                                                url=q_url, quality=quality, format="m3u8",
                                                referer=REFERER, subtitles=subtitles,
                                                provider_name=source_name,
                                            ))
                                    else:
                                        streams.append(Stream(
                                            url=link_url, quality=res_str, format="m3u8",
                                            referer=REFERER, subtitles=subtitles,
                                            provider_name=source_name,
                                        ))
                                except Exception:
                                    streams.append(Stream(
                                        url=link_url, quality=res_str, format="m3u8",
                                        referer=REFERER, subtitles=subtitles,
                                        provider_name=source_name,
                                    ))
                            else:
                                streams.append(Stream(
                                    url=link_url, quality=res_str, format="mp4",
                                    referer=REFERER, subtitles=subtitles,
                                    provider_name=source_name,
                                ))
                    except Exception as e:
                        logger.debug("Clock endpoint failed for %s: %s", source_name, e)
                        continue

            except Exception as e:
                logger.debug("Failed to extract stream from source %s: %s", source_name, e)
                continue

        return streams

    def get_info(self, anime_id: str) -> Optional[dict]:
        data = self._gql(INFO_GQL, {"showId": anime_id})
        show = data.get("show")
        if not show:
            return None
        jp_name = show.get("name", "")
        en_name = show.get("englishName") or ""
        return {
            "id": show.get("_id"),
            "title": en_name if en_name else jp_name,
            "native_title": jp_name if jp_name != (en_name or jp_name) else None,
            "description": show.get("description"),
            "genres": show.get("genres", []),
            "status": show.get("status"),
            "score": show.get("score"),
            "cover_url": _fix_cover_url(show.get("thumbnail")),
            "alt_titles": show.get("altNames", []),
            "year": (show.get("airedStart") or {}).get("year"),
        }
