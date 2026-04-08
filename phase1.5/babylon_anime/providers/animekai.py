"""AnimeKai provider — full scraping with curl_cffi for Cloudflare bypass.

Flow: search → get ani_id → episodes (AJAX) → servers (AJAX) → encrypted embed → decrypt → m3u8
Crypto delegated to enc-dec.app external API.
"""

import json
import logging
import re
from typing import Optional

from bs4 import BeautifulSoup
from curl_cffi import requests as curl_requests

from ..models import SearchResult, Episode, Stream, Subtitle, LanguageType

logger = logging.getLogger(__name__)

BASE_URL = "https://anikai.to"

# enc-dec.app — third-party crypto service for AnimeKai tokens
ENCDEC_ENC = "https://enc-dec.app/api/enc-kai"
ENCDEC_DEC_KAI = "https://enc-dec.app/api/dec-kai"
ENCDEC_DEC_MEGA = "https://enc-dec.app/api/dec-mega"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": f"{BASE_URL}/",
}
AJAX_HEADERS = {**HEADERS, "X-Requested-With": "XMLHttpRequest"}


def _session() -> curl_requests.Session:
    """Create a curl_cffi session impersonating Chrome to bypass Cloudflare."""
    return curl_requests.Session(impersonate="chrome124")


# ---------------------------------------------------------------------------
# enc-dec.app helpers
# ---------------------------------------------------------------------------

def _encrypt_token(text: str) -> Optional[str]:
    """Encrypt a token value for AnimeKai's _ parameter."""
    try:
        import requests as plain_requests
        r = plain_requests.get(ENCDEC_ENC, params={"text": text}, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data.get("status") == 200:
            return data.get("result")
        logger.warning("enc-dec encrypt failed: %s", data)
        return None
    except Exception as e:
        logger.error("enc-dec encrypt error: %s", e)
        return None


def _decrypt_kai(text: str) -> Optional[dict]:
    """Decrypt an AnimeKai AJAX response (returns embed URL + skip times)."""
    try:
        import requests as plain_requests
        r = plain_requests.post(ENCDEC_DEC_KAI, json={"text": text}, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data.get("status") == 200:
            return data.get("result")
        logger.warning("enc-dec dec-kai failed: %s", data)
        return None
    except Exception as e:
        logger.error("enc-dec dec-kai error: %s", e)
        return None


def _decrypt_mega(text: str) -> Optional[dict]:
    """Decrypt MegaCloud/AKCloud media response (returns sources + tracks)."""
    try:
        import requests as plain_requests
        r = plain_requests.post(ENCDEC_DEC_MEGA,
                                json={"text": text, "agent": HEADERS["User-Agent"]},
                                timeout=15)
        r.raise_for_status()
        data = r.json()
        if data.get("status") == 200:
            return data.get("result")
        logger.warning("enc-dec dec-mega failed: %s", data)
        return None
    except Exception as e:
        logger.error("enc-dec dec-mega error: %s", e)
        return None


# ---------------------------------------------------------------------------
# AnimeKai scraping
# ---------------------------------------------------------------------------

def search(query: str) -> list[SearchResult]:
    """Search AnimeKai for anime."""
    session = _session()
    try:
        encoded = _encrypt_token(query)
        params = {"keyword": query}
        if encoded:
            params["_"] = encoded
        resp = session.get(f"{BASE_URL}/ajax/anime/search",
                           params=params, headers=AJAX_HEADERS, timeout=15)
        resp.raise_for_status()

        data = resp.json()
        html = data.get("result", "")
        if not html:
            # Fallback: try browser page directly
            resp = session.get(f"{BASE_URL}/browser", params={"keyword": query},
                               headers=HEADERS, timeout=15)
            resp.raise_for_status()
            html = resp.text

        soup = BeautifulSoup(html, "lxml")
        results = []

        for card in soup.select(".aitem"):
            link = card.select_one("a.poster") or card.select_one("a")
            if not link:
                continue
            href = link.get("href", "")
            anime_id = href.rstrip("/").split("/")[-1] if href else ""
            if not anime_id:
                continue

            title_el = card.select_one(".title") or card.select_one("h3") or card.select_one("a")
            title = title_el.get_text(strip=True) if title_el else "Unknown"

            img = card.select_one("img")
            cover = img.get("src") or img.get("data-src") if img else None

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
                provider="animekai",
                languages=languages,
                cover_url=cover,
            ))

        return results

    except Exception as e:
        logger.error("AnimeKai search error: %s", e)
        raise


def _get_ani_id(session: curl_requests.Session, slug: str) -> Optional[str]:
    """Extract the internal ani_id from an anime's watch page."""
    resp = session.get(f"{BASE_URL}/watch/{slug}", headers=HEADERS, timeout=15)
    resp.raise_for_status()

    # Look for syncData script tag containing the anime ID
    soup = BeautifulSoup(resp.text, "lxml")
    sync_script = soup.select_one("script#syncData")
    if sync_script:
        try:
            data = json.loads(sync_script.string)
            return data.get("ani_id") or data.get("id")
        except (json.JSONDecodeError, TypeError):
            pass

    # Fallback: look for data attributes
    for el in soup.select("[data-ani-id]"):
        return el.get("data-ani-id")

    # Fallback: regex search in page source
    match = re.search(r'"ani_id"\s*:\s*"?(\d+)"?', resp.text)
    if match:
        return match.group(1)

    return None


def get_episodes(slug: str, lang: LanguageType = LanguageType.SUB) -> list[Episode]:
    """Get episode list for an anime slug."""
    session = _session()
    try:
        # First get the internal anime ID
        ani_id = _get_ani_id(session, slug)
        if not ani_id:
            logger.warning("Could not find ani_id for %s", slug)
            return []

        # Encrypt the ani_id for the _ parameter
        encrypted = _encrypt_token(ani_id)
        if not encrypted:
            logger.warning("Could not encrypt token for %s", slug)
            return []

        # Fetch episode list via AJAX
        resp = session.get(f"{BASE_URL}/ajax/episodes/list",
                           params={"ani_id": ani_id, "_": encrypted},
                           headers=AJAX_HEADERS, timeout=15)
        resp.raise_for_status()

        data = resp.json()
        html = data.get("result", "")
        soup = BeautifulSoup(html, "lxml")

        episodes = []
        for ep_el in soup.select("a[num]"):
            try:
                num = float(ep_el.get("num", "0"))
            except (ValueError, TypeError):
                continue
            if num <= 0:
                continue

            token = ep_el.get("token", "")
            langs_mask = int(ep_el.get("langs", "1"))
            # langs bitmask: 1=sub, 2=dub
            if lang == LanguageType.DUB and not (langs_mask & 2):
                continue
            if lang == LanguageType.SUB and not (langs_mask & 1):
                continue

            episodes.append(Episode(
                anime_id=token or slug,  # Use token as episode identifier
                number=num,
                provider="animekai",
                language=lang,
            ))

        episodes.sort(key=lambda e: e.number)
        return episodes

    except Exception as e:
        logger.error("AnimeKai episodes error: %s", e)
        raise


def get_streams(episode_token: str, lang: LanguageType = LanguageType.SUB) -> list[Stream]:
    """Get streaming URLs for an episode.

    Args:
        episode_token: The episode token from get_episodes()
        lang: Language preference (sub/dub)
    """
    session = _session()
    try:
        # Step 1: Get server list
        encrypted = _encrypt_token(episode_token)
        if not encrypted:
            return []

        resp = session.get(f"{BASE_URL}/ajax/links/list",
                           params={"token": episode_token, "_": encrypted},
                           headers=AJAX_HEADERS, timeout=15)
        resp.raise_for_status()

        data = resp.json()
        html = data.get("result", "")
        soup = BeautifulSoup(html, "lxml")

        # Find server links — prefer sub/softsub groups
        lang_key = "dub" if lang == LanguageType.DUB else "sub"
        servers = []

        for group in soup.select(".server-items"):
            group_id = (group.get("data-id") or "").lower()
            # Match by language group
            if lang_key in group_id or "softsub" in group_id:
                for server in group.select(".server"):
                    link_id = server.get("data-lid") or server.get("data-id")
                    server_name = server.get_text(strip=True)
                    if link_id:
                        servers.append((link_id, server_name))

        # If no language-specific servers found, try all servers
        if not servers:
            for server in soup.select(".server"):
                link_id = server.get("data-lid") or server.get("data-id")
                server_name = server.get_text(strip=True)
                if link_id:
                    servers.append((link_id, server_name))

        if not servers:
            logger.warning("No servers found for token %s", episode_token[:20])
            return []

        streams = []
        for link_id, server_name in servers:
            try:
                stream = _resolve_server(session, link_id, server_name)
                if stream:
                    streams.extend(stream)
                    # One working server is enough
                    if streams:
                        break
            except Exception as e:
                logger.debug("Server %s failed: %s", server_name, e)
                continue

        return streams

    except Exception as e:
        logger.error("AnimeKai streams error: %s", e)
        return []


def _resolve_server(session: curl_requests.Session, link_id: str, server_name: str) -> list[Stream]:
    """Resolve a single server's streaming URL."""
    # Step 2: Get encrypted embed URL
    encrypted = _encrypt_token(link_id)
    if not encrypted:
        return []

    resp = session.get(f"{BASE_URL}/ajax/links/view",
                       params={"id": link_id, "_": encrypted},
                       headers=AJAX_HEADERS, timeout=15)
    resp.raise_for_status()

    encrypted_result = resp.json().get("result", "")
    if not encrypted_result:
        return []

    # Step 3: Decrypt to get embed URL
    embed_data = _decrypt_kai(encrypted_result)
    if not embed_data:
        return []

    embed_url = embed_data.get("url", "") if isinstance(embed_data, dict) else str(embed_data)
    skip_data = embed_data.get("skip", {}) if isinstance(embed_data, dict) else {}

    if not embed_url or not embed_url.startswith("http"):
        return []

    logger.info("Resolved embed: %s → %s", server_name, embed_url[:60])

    # Step 4: Extract video_id and get media sources
    video_id = embed_url.rstrip("/").split("/")[-1].split("?")[0]
    embed_base = re.match(r'(https?://[^/]+)', embed_url)
    if not embed_base:
        return []
    embed_base = embed_base.group(1)

    try:
        media_resp = session.get(f"{embed_base}/media/{video_id}",
                                 headers=HEADERS, timeout=15)
        media_resp.raise_for_status()
        encrypted_media = media_resp.json().get("result", "")

        if not encrypted_media:
            return []

        # Step 5: Decrypt media to get m3u8 sources
        final_data = _decrypt_mega(encrypted_media)
        if not final_data:
            return []

        streams = []
        sources = final_data.get("sources", [])
        tracks = final_data.get("tracks", [])

        # Build subtitle list
        subtitles = []
        for track in tracks:
            if track.get("kind") == "captions" or track.get("file", "").endswith(".vtt"):
                subtitles.append(Subtitle(
                    url=track.get("file", ""),
                    language=track.get("label", "Unknown"),
                ))

        for source in sources:
            url = source.get("file", "")
            if not url:
                continue

            fmt = "m3u8" if ".m3u8" in url or source.get("type") == "hls" else "mp4"
            streams.append(Stream(
                url=url,
                quality="auto",
                format=fmt,
                referer=embed_url,
                subtitles=subtitles,
                provider_name=f"animekai/{server_name}",
            ))

        # Also check for direct download URL
        download_url = final_data.get("download")
        if download_url:
            streams.append(Stream(
                url=download_url,
                quality="auto",
                format="mp4",
                referer=embed_url,
                subtitles=subtitles,
                provider_name=f"animekai/{server_name}/download",
            ))

        return streams

    except Exception as e:
        logger.debug("Media extraction failed for %s: %s", server_name, e)
        return []


def resolve_episode_stream(
    title: str,
    episode_number: int,
    dub: bool = False,
) -> Optional[dict]:
    """High-level resolver: search AnimeKai → find episode → get stream URL.

    Returns dict compatible with server.py's expected format:
        {url, quality, format, referer, headers, provider, subtitles}
    """
    lang = LanguageType.DUB if dub else LanguageType.SUB

    # Step 1: Search for the anime
    results = search(title)
    if not results:
        logger.warning("AnimeKai: no results for '%s'", title)
        return None

    # Step 2: Pick the best match
    slug = results[0].id
    logger.info("AnimeKai: matched '%s' → slug=%s", title, slug)

    # Step 3: Get episodes
    episodes = get_episodes(slug, lang)
    if not episodes:
        logger.warning("AnimeKai: no episodes for %s", slug)
        return None

    # Step 4: Find the matching episode
    target_ep = None
    for ep in episodes:
        if int(ep.number) == episode_number:
            target_ep = ep
            break

    if not target_ep:
        logger.warning("AnimeKai: episode %d not found (have %d episodes)", episode_number, len(episodes))
        return None

    # Step 5: Get streams
    streams = get_streams(target_ep.anime_id, lang)
    if not streams:
        logger.warning("AnimeKai: no streams for episode %d", episode_number)
        return None

    # Return the best stream
    best = streams[0]
    return {
        "url": best.url,
        "quality": best.quality or "auto",
        "format": best.format,
        "referer": best.referer or "",
        "headers": {"Referer": best.referer} if best.referer else {},
        "provider": best.provider_name,
        "subtitles": [{"url": s.url, "lang": s.language} for s in best.subtitles],
    }
