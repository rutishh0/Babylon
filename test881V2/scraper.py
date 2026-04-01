"""TamilMV Forum Scraper — standalone module for scraping 1TamilMV movie listings."""

import re
import time
import random
import logging
from urllib.parse import urljoin, quote

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

BASE_URL = "https://www.1tamilmv.immo"

FORUMS = {
    "tamil":   {"webhd": 69, "hdrip": 70, "predvd": 68, "hdtv": 72, "series": 77, "dvd": 71},
    "telugu":  {"webhd": 11, "hdrip": 12, "predvd": 10, "hdtv": 14, "series": 19, "dvd": 13},
    "kannada": {"webhd": 24, "hdrip": 25, "predvd": 23, "hdtv": 27, "series": 33, "dvd": 31},
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.1tamilmv.immo/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
}

QUALITY_TAGS = [
    "TRUE WEB-DL", "WEB-DL", "BluRay", "BDRip", "HD Rip", "HDRip",
    "BRRip", "HDTV", "DVDRip", "PreDVD", "CAM",
]

LANGUAGE_MAP = {
    "tamil": "Tamil", "tam": "Tamil",
    "telugu": "Telugu", "tel": "Telugu",
    "kannada": "Kannada", "kan": "Kannada",
    "malayalam": "Malayalam", "mal": "Malayalam",
    "hindi": "Hindi", "hin": "Hindi",
    "english": "English", "eng": "English",
}

# Session with retry
_session = requests.Session()
_session.headers.update(HEADERS)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _delay():
    """Sleep for a random duration between 1 and 2 seconds to be polite."""
    duration = random.uniform(1.0, 2.0)
    logger.debug("Sleeping %.2f seconds between requests", duration)
    time.sleep(duration)


def _fetch(url: str) -> BeautifulSoup:
    """GET *url* with the module session, return parsed BeautifulSoup tree.

    Raises ``requests.HTTPError`` on non-200 responses.
    """
    logger.info("Fetching %s", url)
    try:
        resp = _session.get(url, timeout=30)
        resp.raise_for_status()
    except requests.RequestException:
        logger.exception("Request failed for %s", url)
        raise

    soup = BeautifulSoup(resp.text, "html.parser")
    _delay()
    return soup


# ---------------------------------------------------------------------------
# Title parser
# ---------------------------------------------------------------------------

def _parse_title(raw_title: str) -> dict:
    """Parse a TamilMV topic title into structured metadata.

    Returns a dict with keys: parsed_title, year, languages, quality_tag,
    resolutions, file_size, has_esub.
    """
    title = raw_title.strip()

    # 1. Year — look for (YYYY) where 1990 <= YYYY <= 2030
    year = None
    year_match = re.search(r"\((\d{4})\)", title)
    if year_match:
        candidate = int(year_match.group(1))
        if 1990 <= candidate <= 2030:
            year = candidate

    # 2. Languages — scan for known names / abbreviations (case-insensitive)
    languages_found: list[str] = []
    title_lower = title.lower()
    # Check longer names first to avoid partial matches
    for key, normalised in sorted(LANGUAGE_MAP.items(), key=lambda kv: -len(kv[0])):
        # Use word-boundary matching so "tam" doesn't match inside "stamp"
        pattern = r"(?<![a-z])" + re.escape(key) + r"(?![a-z])"
        if re.search(pattern, title_lower):
            if normalised not in languages_found:
                languages_found.append(normalised)

    # 3. Quality tag — first match wins (order of QUALITY_TAGS is priority)
    quality_tag = None
    for tag in QUALITY_TAGS:
        if tag.lower() in title_lower:
            quality_tag = tag
            break

    # 4. Resolutions — common patterns
    resolutions: list[str] = []
    for res in re.findall(r"(?i)\b(4K|2160p|1080p|720p|480p|360p)\b", title):
        normalised_res = res.upper() if res.upper() == "4K" else res.lower()
        if normalised_res not in resolutions:
            resolutions.append(normalised_res)

    # 5. File size — e.g. "4.2GB", "800 MB", "1.1 TB"
    file_size = None
    size_match = re.search(r"(\d+\.?\d*\s*[GMTK]B)", title, re.IGNORECASE)
    if size_match:
        file_size = size_match.group(1).strip()

    # 6. ESub detection
    has_esub = bool(re.search(r"(?i)\bE[\s-]?Sub\b", title))

    # 7. Parsed (clean) title — everything before the first year-containing paren
    parsed_title = title
    if year_match:
        parsed_title = title[: year_match.start()].strip()
    else:
        # Fallback: everything before the first '(' if any
        paren_idx = title.find("(")
        if paren_idx > 0:
            parsed_title = title[:paren_idx].strip()

    # Strip trailing punctuation/hyphens from the clean title
    parsed_title = re.sub(r"[\s\-–—:]+$", "", parsed_title).strip()

    return {
        "parsed_title": parsed_title,
        "year": year,
        "languages": languages_found,
        "quality_tag": quality_tag,
        "resolutions": resolutions,
        "file_size": file_size,
        "has_esub": has_esub,
    }


# ---------------------------------------------------------------------------
# Forum browsing
# ---------------------------------------------------------------------------

def browse_forum(forum_id: int, page: int = 1) -> list[dict]:
    """Scrape one page of a TamilMV forum listing.

    Returns a list of topic dicts, each containing raw_title, topic_url,
    and all fields from ``_parse_title``.
    """
    if page <= 1:
        url = f"{BASE_URL}/index.php?/forums/forum/{forum_id}-x/"
    else:
        url = f"{BASE_URL}/index.php?/forums/forum/{forum_id}-x/page/{page}/"

    logger.info("Browsing forum %d, page %d", forum_id, page)

    try:
        soup = _fetch(url)
    except requests.RequestException:
        logger.error("Failed to fetch forum %d page %d", forum_id, page)
        return []

    topics: list[dict] = []

    # IPS Community forums wrap topic links in:
    #   <span class="ipsType_break ipsContained"><a href="..." title="...">
    containers = soup.select("span.ipsType_break.ipsContained")
    if not containers:
        # Fallback: try broader selector for topic title links
        containers = soup.select("h4.ipsDataItem_title span a[href]")
        if not containers:
            logger.debug("No topic containers found on forum %d page %d", forum_id, page)
            return topics

    for container in containers:
        # If the container is the <span>, look for the <a> inside
        if container.name == "span":
            link = container.find("a", href=True)
        else:
            link = container if container.name == "a" and container.get("href") else None

        if link is None:
            continue

        raw_title = link.get("title", "") or link.get_text(strip=True)
        if not raw_title:
            continue

        topic_url = link["href"]
        if not topic_url.startswith("http"):
            topic_url = urljoin(BASE_URL, topic_url)

        parsed = _parse_title(raw_title)
        entry = {
            "title": raw_title,
            "topic_url": topic_url,
            **parsed,
        }
        topics.append(entry)

    logger.info("Found %d topics on forum %d page %d", len(topics), forum_id, page)
    return topics


def get_total_pages(forum_id: int) -> int:
    """Return the total number of pages for a forum.

    Looks for an IPS pagination element with a ``data-pages`` attribute.
    Falls back to 1 if no pagination is present.
    """
    url = f"{BASE_URL}/index.php?/forums/forum/{forum_id}-x/"
    logger.info("Getting total pages for forum %d", forum_id)

    try:
        soup = _fetch(url)
    except requests.RequestException:
        logger.error("Failed to fetch forum %d for pagination", forum_id)
        return 1

    # IPS pagination: <ul class="ipsPagination" data-pages="N">
    pagination = soup.find(attrs={"data-pages": True})
    if pagination:
        try:
            total = int(pagination["data-pages"])
            logger.info("Forum %d has %d pages", forum_id, total)
            return total
        except (ValueError, TypeError):
            pass

    logger.debug("No pagination found for forum %d, defaulting to 1", forum_id)
    return 1


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search_movies(query: str, language: str = None) -> list[dict]:
    """Search for movies matching *query* across Web-HD and HD Rip forums.

    Parameters
    ----------
    query : str
        Substring to match against the parsed (clean) title.
    language : str or None
        If given (e.g. ``"tamil"``), only search that language's forums.
        If ``None``, search all languages.

    Returns a deduplicated list sorted by year (newest first).
    """
    query_lower = query.strip().lower()
    if not query_lower:
        logger.warning("Empty search query")
        return []

    # Determine which forum IDs to search
    forum_ids: list[int] = []
    if language:
        lang_key = language.strip().lower()
        if lang_key in FORUMS:
            forum_data = FORUMS[lang_key]
            for cat in ("webhd", "hdrip"):
                if cat in forum_data:
                    forum_ids.append(forum_data[cat])
        else:
            logger.warning("Unknown language '%s', searching all", language)
            language = None  # fall through to all

    if not forum_ids:
        # Search all languages
        for lang_key, forum_data in FORUMS.items():
            for cat in ("webhd", "hdrip"):
                if cat in forum_data:
                    forum_ids.append(forum_data[cat])

    logger.info("Searching '%s' across %d forums", query, len(forum_ids))

    seen_urls: set[str] = set()
    results: list[dict] = []

    for fid in forum_ids:
        # Browse first two pages for better coverage
        for pg in (1, 2):
            topics = browse_forum(fid, page=pg)
            for topic in topics:
                if topic["topic_url"] in seen_urls:
                    continue
                if query_lower in topic.get("parsed_title", "").lower():
                    seen_urls.add(topic["topic_url"])
                    results.append(topic)
            # If page 1 returned nothing, skip page 2
            if not topics:
                break

    # Sort by year descending; entries without a year go last
    results.sort(key=lambda t: (t.get("year") is not None, t.get("year") or 0), reverse=True)

    logger.info("Search for '%s' returned %d results", query, len(results))
    return results


# ---------------------------------------------------------------------------
# Topic / variant scraping
# ---------------------------------------------------------------------------

def get_variants(topic_url: str) -> list[dict]:
    """Scrape a topic page for all magnet links and their metadata.

    Returns a list of variant dicts, each containing magnet_url, resolution,
    quality_tag, file_size, languages, has_esub, and a human-readable label.
    """
    logger.info("Getting variants from %s", topic_url)

    try:
        soup = _fetch(topic_url)
    except requests.RequestException:
        logger.error("Failed to fetch topic %s", topic_url)
        return []

    # Fallback metadata from the page title (<h1> tag)
    page_title_tag = soup.find("h1")
    fallback_meta = _parse_title(page_title_tag.get_text(strip=True)) if page_title_tag else {}

    magnet_links = soup.find_all("a", href=re.compile(r"^magnet:\?"))
    if not magnet_links:
        logger.debug("No magnet links found on %s", topic_url)
        return []

    variants: list[dict] = []
    seen_magnets: set[str] = set()

    for mag_tag in magnet_links:
        magnet_url = mag_tag["href"]

        # Deduplicate identical magnets
        if magnet_url in seen_magnets:
            continue
        seen_magnets.add(magnet_url)

        # Try to extract context from surrounding elements.
        # Walk up to find a reasonable text block (parent <p>, <div>, <td>, etc.)
        context_text = ""
        for parent in mag_tag.parents:
            if parent.name in ("p", "div", "td", "li", "span", "blockquote"):
                context_text = parent.get_text(" ", strip=True)
                if len(context_text) > 20:
                    break

        # Also use the link's own text as context
        link_text = mag_tag.get_text(strip=True)
        combined_context = f"{link_text} {context_text}"

        # Extract resolution from context
        resolution = None
        res_match = re.search(r"(?i)\b(4K|2160p|1080p|720p|480p|360p)\b", combined_context)
        if res_match:
            r = res_match.group(1)
            resolution = r.upper() if r.upper() == "4K" else r.lower()

        # Extract file size from context
        file_size = None
        size_match = re.search(r"(\d+\.?\d*\s*[GMTK]B)", combined_context, re.IGNORECASE)
        if size_match:
            file_size = size_match.group(1).strip()

        # Extract quality tag from context
        quality_tag = None
        ctx_lower = combined_context.lower()
        for tag in QUALITY_TAGS:
            if tag.lower() in ctx_lower:
                quality_tag = tag
                break

        # Extract languages from context
        languages: list[str] = []
        for key, normalised in sorted(LANGUAGE_MAP.items(), key=lambda kv: -len(kv[0])):
            pattern = r"(?<![a-z])" + re.escape(key) + r"(?![a-z])"
            if re.search(pattern, ctx_lower):
                if normalised not in languages:
                    languages.append(normalised)

        # ESub from context
        has_esub = bool(re.search(r"(?i)\bE[\s-]?Sub\b", combined_context))

        # Apply fallback metadata from page title where local extraction failed
        if not resolution and fallback_meta.get("resolutions"):
            resolution = fallback_meta["resolutions"][0]
        if not file_size and fallback_meta.get("file_size"):
            file_size = fallback_meta["file_size"]
        if not quality_tag and fallback_meta.get("quality_tag"):
            quality_tag = fallback_meta["quality_tag"]
        if not languages and fallback_meta.get("languages"):
            languages = fallback_meta["languages"]
        if not has_esub and fallback_meta.get("has_esub"):
            has_esub = True

        # Build a human-readable label
        label_parts: list[str] = []
        if fallback_meta.get("parsed_title"):
            label_parts.append(fallback_meta["parsed_title"])
        if resolution:
            label_parts.append(resolution)
        if quality_tag:
            label_parts.append(quality_tag)
        if file_size:
            label_parts.append(f"[{file_size}]")
        if languages:
            label_parts.append("+".join(languages))
        if has_esub:
            label_parts.append("ESub")

        label = " | ".join(label_parts) if label_parts else "Unknown variant"

        variants.append({
            "magnet_url": magnet_url,
            "resolution": resolution,
            "quality_tag": quality_tag,
            "file_size": file_size,
            "languages": languages,
            "has_esub": has_esub,
            "label": label,
        })

    logger.info("Found %d variants on %s", len(variants), topic_url)
    return variants
