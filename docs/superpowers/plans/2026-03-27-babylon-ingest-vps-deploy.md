# Babylon Ingest Pipeline + VPS Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Python ingest daemon and deploy the full Babylon stack to the UpCloud VPS (api.internalrr.info).

**Architecture:** Python daemon (systemd) polls Nyaa RSS, downloads via qBittorrent-nox, extracts soft subtitles with FFmpeg, transcodes to MP4, uploads to Scaleway S3 via boto3, registers in Babylon API. Nginx reverse proxy with Let's Encrypt SSL on api.internalrr.info. Daemon shares SQLite database (`/opt/babylon/data/babylon.db`) with the API for `ingest_seen` / `ingest_failed` tables. IPC uses two files: the API writes `trigger` (a plain text file), the daemon writes `status.json`.

**Tech Stack:** Python 3.12, qbittorrent-api, boto3, feedparser, requests, FFmpeg/ffprobe, Nginx, Certbot, systemd, pytest

---

## Context: Existing API Surface the Daemon Calls

The daemon calls the Babylon API on `localhost:3000`. All requests include the header `X-Babylon-Pin: <BABYLON_PIN>`.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/media` | Create a new media entry (returns `{ id }`) |
| POST | `/api/upload/complete` | Register an uploaded episode file |
| POST | `/api/metadata/apply/:id` | Trigger Jikan metadata fetch |
| POST | `/api/ingest/watchlist` | Add entry to watchlist (body: `{ title, aliases, season }`) |

The API reads `status.json` for `GET /api/ingest/status` and writes a `trigger` file (plain ISO timestamp) for `POST /api/ingest/trigger`. The daemon watches for the trigger file and deletes it after processing.

### DB schema (ingest tables — `packages/api/src/db/schema.ts`)

```typescript
// ingest_seen — prevents re-download, indexed on (title, episode)
{ id, title, episode, torrent_hash, processed_at }

// ingest_failed — titles not found on Nyaa
{ id, title, reason, failed_at }
```

The daemon accesses these tables directly via `sqlite3` (Python stdlib) — no ORM needed. The API also reads them. Both must use WAL mode to allow concurrent reads.

---

## Task 1: Python Project Setup

**Files to create:**
- `ingest/requirements.txt`
- `ingest/config.py`
- `ingest/__init__.py`

- [ ] Create `ingest/requirements.txt` with pinned dependencies:

```
qbittorrent-api==2024.2.59
boto3==1.34.69
feedparser==6.0.11
requests==2.31.0
pytest==8.1.1
```

- [ ] Create `ingest/__init__.py` (empty — marks package boundary):

```python
```

- [ ] Create `ingest/config.py` — reads all config from environment variables (same `.env` file as the API):

```python
"""
config.py — reads configuration from environment variables.
All variables are sourced from /opt/babylon/.env (loaded by systemd EnvironmentFile=).
"""
import os


def _require(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise RuntimeError(f"Required environment variable {key!r} is not set")
    return val


def _optional(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


# Scaleway S3
SCALEWAY_ACCESS_KEY: str = _require("SCALEWAY_ACCESS_KEY")
SCALEWAY_SECRET_KEY: str = _require("SCALEWAY_SECRET_KEY")
SCALEWAY_BUCKET: str = _require("SCALEWAY_BUCKET")
SCALEWAY_REGION: str = _require("SCALEWAY_REGION")
SCALEWAY_ENDPOINT: str = _require("SCALEWAY_ENDPOINT")

# qBittorrent
QBITTORRENT_HOST: str = _optional("QBITTORRENT_HOST", "http://127.0.0.1:8080")
QBITTORRENT_USER: str = _optional("QBITTORRENT_USER", "admin")
QBITTORRENT_PASS: str = _require("QBITTORRENT_PASS")

# Directories
DOWNLOAD_DIR: str = _optional("DOWNLOAD_DIR", "/downloads/raw")
PROCESSED_DIR: str = _optional("PROCESSED_DIR", "/downloads/processed")
INGEST_STATE_DIR: str = _optional("INGEST_STATE_DIR", "/opt/babylon/ingest")

# API
BABYLON_API_URL: str = _optional("BABYLON_API_URL", "http://127.0.0.1:3000")
BABYLON_PIN: str = _optional("BABYLON_PIN", "")

# Database
DATABASE_URL: str = _optional("DATABASE_URL", "file:///opt/babylon/data/babylon.db")

def get_db_path() -> str:
    """Strip the file:// prefix from DATABASE_URL to get the raw filesystem path."""
    url = DATABASE_URL
    if url.startswith("file://"):
        return url[len("file://"):]
    return url

# Daemon behaviour
INGEST_POLL_INTERVAL: int = int(_optional("INGEST_POLL_INTERVAL", "300"))  # seconds
DISK_PAUSE_THRESHOLD: float = 0.85   # pause when disk > 85 %
DISK_RESUME_THRESHOLD: float = 0.75  # resume when disk < 75 %
```

---

## Task 2: Filename Parser Module

**Files to create:**
- `ingest/filename_parser.py`
- `ingest/tests/test_filename_parser.py`

- [ ] Create `ingest/filename_parser.py`:

```python
"""
filename_parser.py — extract episode numbers from anime filename patterns.

Supported patterns (in priority order):
  1. S01E03        [SubsPlease] Show S01E03 (1080p).mkv  → 3
  2. - NN          [SubsPlease] Show - 03 (1080p).mkv    → 3
  3. Episode NN    Episode 01.mkv                        → 1
  4. ENN           Show E12 [1080p].mkv                  → 12
  5. Bare NN       03.mkv                                → 3

Non-episode files (NCED, NCOP, OVA, Special, PV, Preview, Trailer, Menu, Extra)
are identified by is_non_episode() and skipped during batch processing.
"""

import re
from typing import Optional

# Keywords that indicate non-episode content — checked case-insensitively
_NON_EPISODE_KEYWORDS = [
    "NCED", "NCOP", "OVA", "Special", "PV", "Preview",
    "Trailer", "Menu", "Extra", "Bonus", "CM", "Creditless",
]

# Compiled patterns in priority order
_PATTERNS: list[tuple[str, re.Pattern]] = [
    # S01E03 or S1E03 (season + episode)
    ("SxxExx", re.compile(r'\bS\d{1,2}E(\d{1,3})\b', re.IGNORECASE)),
    # " - 03 " style (SubsPlease standard)
    ("dash_ep", re.compile(r'\s-\s+(\d{1,3})(?:\s|\[|\.mkv|$)')),
    # Episode 01
    ("episode_word", re.compile(r'\bEpisode\s+(\d{1,3})\b', re.IGNORECASE)),
    # E12 (standalone, not preceded by S\d)
    ("bare_E", re.compile(r'(?<![Ss]\d{1,2})\bE(\d{1,3})\b')),
    # Bare number: filename is just digits (e.g., "03.mkv")
    ("bare_num", re.compile(r'^(\d{1,3})(?:\s|\.|$)')),
]


def parse_episode(filename: str) -> Optional[int]:
    """
    Return the episode number extracted from *filename*, or None if not found.
    Only the base filename (no directory component) should be passed in.
    """
    # Strip directory component if present
    basename = filename.split("/")[-1].split("\\")[-1]
    # Remove extension for bare-number matching
    stem = re.sub(r'\.[^.]+$', '', basename)

    for _name, pattern in _PATTERNS:
        m = pattern.search(basename if _name != "bare_num" else stem)
        if m:
            return int(m.group(1))
    return None


def is_non_episode(filename: str) -> bool:
    """
    Return True if *filename* looks like a non-episode file
    (creditless OP/ED, OVA, special, PV, etc.) that should be skipped.
    """
    basename = filename.split("/")[-1].split("\\")[-1]
    lower = basename.lower()
    for keyword in _NON_EPISODE_KEYWORDS:
        if keyword.lower() in lower:
            return True
    return False
```

- [ ] Create `ingest/tests/__init__.py` (empty)

- [ ] Create `ingest/tests/test_filename_parser.py` — full pytest test suite:

```python
"""
Tests for ingest/filename_parser.py

Run with:
    cd ingest && python -m pytest tests/test_filename_parser.py -v
"""

import pytest
from filename_parser import parse_episode, is_non_episode


class TestParseEpisode:
    """Episode number extraction from filenames."""

    # --- S01E03 pattern ---
    def test_sxxexx_standard(self):
        assert parse_episode("[SubsPlease] Show Name S01E03 (1080p) [ABCD1234].mkv") == 3

    def test_sxxexx_two_digit_episode(self):
        assert parse_episode("[SubsPlease] Show S01E12 (1080p).mkv") == 12

    def test_sxxexx_three_digit_episode(self):
        assert parse_episode("Show S02E100 [1080p].mkv") == 100

    def test_sxxexx_single_digit_season(self):
        assert parse_episode("Show S1E5 (720p).mkv") == 5

    def test_sxxexx_uppercase(self):
        assert parse_episode("SHOW S03E07.mkv") == 7

    # --- Dash-space pattern (SubsPlease standard) ---
    def test_dash_ep_standard(self):
        assert parse_episode("[SubsPlease] Mushoku Tensei - 03 (1080p) [ABCD1234].mkv") == 3

    def test_dash_ep_two_digit(self):
        assert parse_episode("[SubsPlease] Re Zero - 25 (1080p).mkv") == 25

    def test_dash_ep_at_end_of_filename(self):
        assert parse_episode("Show - 01.mkv") == 1

    def test_dash_ep_before_bracket(self):
        assert parse_episode("[Sub] Anime - 07 [1080p].mkv") == 7

    # --- "Episode NN" pattern ---
    def test_episode_word_lowercase(self):
        assert parse_episode("episode 01.mkv") == 1

    def test_episode_word_titlecase(self):
        assert parse_episode("Episode 12.mkv") == 12

    def test_episode_word_uppercase(self):
        assert parse_episode("EPISODE 05.mkv") == 5

    def test_episode_word_with_prefix(self):
        assert parse_episode("Show Name Episode 03 [1080p].mkv") == 3

    # --- Bare E pattern ---
    def test_bare_e_standard(self):
        assert parse_episode("Show E12 [1080p].mkv") == 12

    def test_bare_e_lowercase(self):
        # E is case-insensitive but must not be preceded by S digit
        assert parse_episode("show e05.mkv") == 5

    def test_bare_e_not_confused_with_sxxexx(self):
        # S01E03 should be matched by SxxExx pattern and return 3, not some other value
        assert parse_episode("Show S01E03.mkv") == 3

    # --- Bare number pattern ---
    def test_bare_number_only_stem(self):
        assert parse_episode("03.mkv") == 3

    def test_bare_number_two_digit(self):
        assert parse_episode("12.mkv") == 12

    def test_bare_number_with_space(self):
        assert parse_episode("07 [1080p].mkv") == 7

    # --- Edge cases ---
    def test_no_episode_number(self):
        assert parse_episode("[SubsPlease] Show (1080p) [ABCD1234].mkv") is None

    def test_empty_string(self):
        assert parse_episode("") is None

    def test_path_with_directory(self):
        # Should only look at basename
        assert parse_episode("/downloads/raw/Show/[Sub] Show - 05 (1080p).mkv") == 5

    def test_windows_path(self):
        assert parse_episode("C:\\downloads\\Show - 07 [1080p].mkv") == 7

    def test_year_not_confused_as_episode(self):
        # Years like 2024 should not match bare-number pattern (3-digit cap on bare num)
        result = parse_episode("Show (2024) [1080p].mkv")
        # Should be None or not 2024 — our bare_num is capped at 3 digits so 2024 won't match
        assert result is None or result < 1000


class TestIsNonEpisode:
    """Non-episode file detection."""

    def test_nced(self):
        assert is_non_episode("[SubsPlease] Show NCED (1080p).mkv") is True

    def test_ncop(self):
        assert is_non_episode("[SubsPlease] Show NCOP (1080p).mkv") is True

    def test_ova(self):
        assert is_non_episode("Show OVA 01 [1080p].mkv") is True

    def test_special(self):
        assert is_non_episode("Show Special 01 [1080p].mkv") is True

    def test_pv(self):
        assert is_non_episode("Show PV 01.mkv") is True

    def test_preview(self):
        assert is_non_episode("Show Preview (1080p).mkv") is True

    def test_trailer(self):
        assert is_non_episode("Show Trailer.mkv") is True

    def test_menu(self):
        assert is_non_episode("Menu.mkv") is True

    def test_extra(self):
        assert is_non_episode("Show Extra 01.mkv") is True

    def test_creditless(self):
        assert is_non_episode("Show Creditless OP.mkv") is True

    def test_case_insensitive(self):
        assert is_non_episode("show nced.mkv") is True
        assert is_non_episode("SHOW OVA 01.MKV") is True

    def test_normal_episode_not_flagged(self):
        assert is_non_episode("[SubsPlease] Show - 03 (1080p) [ABCD1234].mkv") is False

    def test_normal_episode_s01e03(self):
        assert is_non_episode("[SubsPlease] Show S01E03 (1080p).mkv") is False

    def test_empty_string(self):
        assert is_non_episode("") is False
```

---

## Task 3: RSS Poller Module

**File:** `ingest/rss_poller.py`

- [ ] Create `ingest/rss_poller.py`:

```python
"""
rss_poller.py — Nyaa/SubsPlease RSS polling and watchlist matching.

SubsPlease RSS URL (1080p, no batches):
  https://nyaa.si/?page=rss&u=subsplease&q=1080p+-batch

Backlog batch search (SubsPlease uploader):
  https://nyaa.si/?page=rss&q={TITLE}+1080p+Batch&u=subsplease

Backlog batch search (no uploader filter, fallback):
  https://nyaa.si/?page=rss&q={TITLE}+1080p+Batch
"""

import time
import logging
from typing import Optional
from dataclasses import dataclass
from urllib.parse import quote_plus

import feedparser

logger = logging.getLogger(__name__)

SUBSPLEASE_RSS = "https://nyaa.si/?page=rss&u=subsplease&q=1080p+-batch"
NYAA_RSS_BASE = "https://nyaa.si/?page=rss"


@dataclass
class RssItem:
    title: str
    episode: Optional[int]   # None for non-episode files
    magnet_link: str
    seeders: int


def poll_subsplease() -> list[RssItem]:
    """
    Fetch the SubsPlease 1080p RSS feed and return a list of RssItems.
    Returns an empty list on network errors (caller should retry next cycle).
    """
    try:
        feed = feedparser.parse(SUBSPLEASE_RSS)
    except Exception as exc:
        logger.error("Failed to fetch SubsPlease RSS: %s", exc)
        return []

    from filename_parser import parse_episode, is_non_episode

    items: list[RssItem] = []
    for entry in feed.entries:
        title = entry.get("title", "")
        if is_non_episode(title):
            continue

        # Magnet link is in entry.link or a <nyaa:magnetUri> tag
        magnet = _extract_magnet(entry)
        if not magnet:
            continue

        episode = parse_episode(title)
        seeders = _extract_seeders(entry)
        items.append(RssItem(title=title, episode=episode, magnet_link=magnet, seeders=seeders))

    logger.info("SubsPlease RSS returned %d usable items", len(items))
    return items


def match_watchlist(rss_items: list[RssItem], watchlist: list[dict]) -> list[tuple[RssItem, dict]]:
    """
    Case-insensitive match each RSS item title against watchlist titles + aliases.

    Returns a list of (rss_item, watchlist_entry) pairs where the RSS item title
    contains the watchlist title or one of its aliases as a substring.
    """
    matched: list[tuple[RssItem, dict]] = []
    for item in rss_items:
        title_lower = item.title.lower()
        for entry in watchlist:
            candidates = [entry["title"]] + entry.get("aliases", [])
            for candidate in candidates:
                if candidate.lower() in title_lower:
                    matched.append((item, entry))
                    break  # one watchlist entry match per RSS item is enough
    return matched


def search_nyaa_batch(title: str, aliases: list[str]) -> Optional[RssItem]:
    """
    Search Nyaa for a completed batch for *title*.

    Strategy:
    1. Search SubsPlease uploader: ?q={title}+1080p+Batch&u=subsplease
    2. Try each alias with SubsPlease uploader
    3. Fallback: no uploader filter, pick highest-seeded result

    Returns the best RssItem found, or None if nothing found.
    """
    from filename_parser import is_non_episode

    search_terms = [title] + aliases

    # Pass 1: SubsPlease uploader
    for term in search_terms:
        result = _search_nyaa(term, uploader="subsplease")
        if result:
            logger.info("Found SubsPlease batch for %r (query: %r)", title, term)
            return result

    # Pass 2: any uploader
    for term in search_terms:
        result = _search_nyaa(term, uploader=None)
        if result:
            logger.info("Found general batch for %r (query: %r) — not SubsPlease", title, term)
            return result

    logger.warning("No batch found on Nyaa for %r (tried %d search terms)", title, len(search_terms))
    return None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _search_nyaa(query: str, uploader: Optional[str]) -> Optional[RssItem]:
    """Fetch one Nyaa RSS search page and return the best (most-seeded) result."""
    q = quote_plus(f"{query} 1080p Batch")
    url = f"{NYAA_RSS_BASE}&q={q}"
    if uploader:
        url += f"&u={uploader}"

    try:
        feed = feedparser.parse(url)
    except Exception as exc:
        logger.error("Nyaa search failed (query=%r): %s", query, exc)
        return None

    best: Optional[RssItem] = None
    for entry in feed.entries:
        title = entry.get("title", "")
        magnet = _extract_magnet(entry)
        if not magnet:
            continue
        seeders = _extract_seeders(entry)
        item = RssItem(title=title, episode=None, magnet_link=magnet, seeders=seeders)
        if best is None or item.seeders > best.seeders:
            best = item

    return best


def _extract_magnet(entry) -> Optional[str]:
    """Pull the magnet URI out of a feedparser entry."""
    # feedparser puts custom namespaced tags in entry.tags or entry.<ns>_<tag>
    # nyaa uses <nyaa:magnetUri>
    magnet = getattr(entry, "nyaa_magneturi", None)
    if magnet:
        return magnet

    # Some mirrors put it in entry.link
    link = entry.get("link", "")
    if link.startswith("magnet:"):
        return link

    # Check enclosures
    for enc in entry.get("enclosures", []):
        href = enc.get("href", "")
        if href.startswith("magnet:"):
            return href

    return None


def _extract_seeders(entry) -> int:
    """Pull seeder count from nyaa:seeders tag, defaulting to 0."""
    val = getattr(entry, "nyaa_seeders", None)
    if val is not None:
        try:
            return int(val)
        except (ValueError, TypeError):
            pass
    return 0
```

---

## Task 4: qBittorrent Integration

**File:** `ingest/downloader.py`

- [ ] Create `ingest/downloader.py`:

```python
"""
downloader.py — qBittorrent-nox integration via qbittorrent-api library.

Connects to the qBittorrent WebUI running on localhost:8080 (bound to 127.0.0.1).
Credentials come from config.py (QBITTORRENT_USER / QBITTORRENT_PASS).
"""

import time
import logging
from typing import Optional

import qbittorrentapi

import config

logger = logging.getLogger(__name__)

# Re-exported for caller convenience
TorrentFile = dict  # keys: name, size, priority, progress, index


def _client() -> qbittorrentapi.Client:
    """Create and return an authenticated qBittorrent client."""
    client = qbittorrentapi.Client(
        host=config.QBITTORRENT_HOST,
        username=config.QBITTORRENT_USER,
        password=config.QBITTORRENT_PASS,
        REQUESTS_ARGS={"timeout": 30},
    )
    client.auth_log_in()
    return client


def add_magnet(magnet_link: str, save_path: str) -> str:
    """
    Add a magnet link to qBittorrent and return the torrent hash.

    qBittorrent does not return the hash from the add call; we find it by
    matching the magnet's xt= parameter.
    """
    import re
    client = _client()

    # Extract expected hash from magnet URI (xt=urn:btih:<hash>)
    match = re.search(r'urn:btih:([0-9a-fA-F]{40})', magnet_link, re.IGNORECASE)
    if not match:
        raise ValueError(f"Cannot extract info hash from magnet: {magnet_link[:80]}")
    expected_hash = match.group(1).lower()

    client.torrents_add(
        urls=magnet_link,
        save_path=save_path,
        is_paused=False,
    )
    logger.info("Added magnet to qBittorrent, hash=%s", expected_hash)
    return expected_hash


def wait_for_completion(torrent_hash: str, poll_interval: int = 5, timeout: int = 86400) -> None:
    """
    Block until the torrent identified by *torrent_hash* reaches 100% progress
    (state == 'uploading' or progress == 1.0), or until *timeout* seconds elapse.

    Raises RuntimeError on timeout.
    """
    client = _client()
    elapsed = 0
    while elapsed < timeout:
        try:
            torrents = client.torrents_info(torrent_hashes=torrent_hash)
        except Exception as exc:
            logger.warning("qBittorrent poll error: %s — retrying", exc)
            time.sleep(poll_interval)
            elapsed += poll_interval
            continue

        if not torrents:
            logger.warning("Torrent %s not found in qBittorrent — may have been removed", torrent_hash)
            return

        torrent = torrents[0]
        state = torrent.state
        progress = torrent.progress

        logger.debug("Torrent %s: state=%s progress=%.1f%%", torrent_hash, state, progress * 100)

        # qBittorrent reports 'uploading' once seeding begins (download complete)
        if state in ("uploading", "stalledUP", "forcedUP") or progress >= 1.0:
            logger.info("Torrent %s download complete", torrent_hash)
            return

        if state in ("error", "missingFiles"):
            raise RuntimeError(f"Torrent {torrent_hash} entered error state: {state}")

        time.sleep(poll_interval)
        elapsed += poll_interval

    raise RuntimeError(f"Torrent {torrent_hash} timed out after {timeout}s")


def get_torrent_files(torrent_hash: str) -> list[TorrentFile]:
    """
    Return a list of file dicts for the torrent.
    Each dict has keys: index, name, size, priority, progress.
    """
    client = _client()
    files = client.torrents_files(torrent_hash=torrent_hash)
    result = []
    for f in files:
        result.append({
            "index": f.index,
            "name": f.name,
            "size": f.size,
            "priority": f.priority,
            "progress": f.progress,
        })
    return result


def set_file_priority(torrent_hash: str, file_index: int, priority: int) -> None:
    """
    Set download priority for a single file within a torrent.
    priority=0 means do not download; priority=1 means normal priority.
    """
    client = _client()
    client.torrents_file_priority(
        torrent_hash=torrent_hash,
        file_ids=[file_index],
        priority=priority,
    )
    logger.debug("Torrent %s file %d priority set to %d", torrent_hash, file_index, priority)


def remove_torrent(torrent_hash: str, delete_files: bool = False) -> None:
    """Remove a torrent from qBittorrent. Optionally deletes downloaded files."""
    client = _client()
    client.torrents_delete(torrent_hashes=torrent_hash, delete_files=delete_files)
    logger.info("Removed torrent %s (delete_files=%s)", torrent_hash, delete_files)


def wait_for_single_file(torrent_hash: str, file_index: int, poll_interval: int = 5, timeout: int = 86400) -> None:
    """
    Block until a specific file within a torrent reaches 100% progress.
    Used during backlog mode where only one file has priority > 0 at a time.
    """
    client = _client()
    elapsed = 0
    while elapsed < timeout:
        try:
            files = client.torrents_files(torrent_hash=torrent_hash)
        except Exception as exc:
            logger.warning("Error polling file progress: %s", exc)
            time.sleep(poll_interval)
            elapsed += poll_interval
            continue

        target = next((f for f in files if f.index == file_index), None)
        if target is None:
            raise RuntimeError(f"File index {file_index} not found in torrent {torrent_hash}")

        if target.progress >= 1.0:
            logger.info("File %d in torrent %s is complete", file_index, torrent_hash)
            return

        logger.debug("File %d progress: %.1f%%", file_index, target.progress * 100)
        time.sleep(poll_interval)
        elapsed += poll_interval

    raise RuntimeError(f"File {file_index} in torrent {torrent_hash} timed out after {timeout}s")
```

---

## Task 5: Subtitle Extractor

**File:** `ingest/subtitle_extractor.py`

- [ ] Create `ingest/subtitle_extractor.py`:

```python
"""
subtitle_extractor.py — extract embedded subtitle tracks from MKV files using FFmpeg.

SubsPlease MKVs always have soft-subs (ASS/SSA format internally).
We extract them to WebVTT (.vtt) so the Babylon player can use them natively
without FFmpeg on the client.

Extraction happens BEFORE transcoding so the .mkv is still intact.
"""

import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def probe_subtitles(mkv_path: str) -> list[dict]:
    """
    Use ffprobe to list all subtitle streams in *mkv_path*.

    Returns a list of dicts:
      { "index": int, "language": str, "codec": str, "title": str }

    *index* is the subtitle stream index (0-based within subtitle streams).
    """
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-select_streams", "s",
        mkv_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=60)
    except subprocess.CalledProcessError as exc:
        logger.error("ffprobe failed on %s: %s", mkv_path, exc.stderr)
        return []
    except subprocess.TimeoutExpired:
        logger.error("ffprobe timed out on %s", mkv_path)
        return []

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        logger.error("ffprobe returned invalid JSON for %s", mkv_path)
        return []

    streams = []
    for i, stream in enumerate(data.get("streams", [])):
        tags = stream.get("tags", {})
        language = tags.get("language") or tags.get("LANGUAGE") or ("eng" if i == 0 else f"sub{i}")
        codec = stream.get("codec_name", "unknown")
        title = tags.get("title") or tags.get("TITLE") or ""
        streams.append({
            "index": i,          # subtitle stream index (for -map 0:s:N)
            "language": language,
            "codec": codec,
            "title": title,
        })

    logger.debug("Found %d subtitle stream(s) in %s", len(streams), mkv_path)
    return streams


def extract_subtitles(mkv_path: str, output_dir: str) -> list[dict]:
    """
    Extract all subtitle streams from *mkv_path* to WebVTT files in *output_dir*.

    Returns a list of dicts:
      { "path": str, "language": str, "format": "vtt" }

    Files are named: <stem>_<language>[_<i>].vtt  (suffix added on duplicates)
    """
    os.makedirs(output_dir, exist_ok=True)
    stem = Path(mkv_path).stem
    streams = probe_subtitles(mkv_path)

    if not streams:
        logger.info("No subtitle streams found in %s", mkv_path)
        return []

    extracted: list[dict] = []
    seen_langs: dict[str, int] = {}  # lang → count, to handle duplicate languages

    for stream in streams:
        lang = stream["language"]
        count = seen_langs.get(lang, 0)
        seen_langs[lang] = count + 1

        if count == 0:
            filename = f"{stem}_{lang}.vtt"
        else:
            filename = f"{stem}_{lang}_{count}.vtt"

        output_path = os.path.join(output_dir, filename)

        cmd = [
            "ffmpeg",
            "-y",                    # overwrite if exists
            "-i", mkv_path,
            "-map", f"0:s:{stream['index']}",
            "-c:s", "webvtt",
            output_path,
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=120)
            logger.info("Extracted subtitle stream %d (%s) → %s", stream["index"], lang, filename)
            extracted.append({
                "path": output_path,
                "language": lang,
                "format": "vtt",
            })
        except subprocess.CalledProcessError as exc:
            logger.error(
                "ffmpeg subtitle extraction failed (stream %d, lang %s): %s",
                stream["index"], lang, exc.stderr[-500:],
            )
        except subprocess.TimeoutExpired:
            logger.error("ffmpeg subtitle extraction timed out for stream %d", stream["index"])

    return extracted
```

---

## Task 6: FFmpeg Transcoder

**File:** `ingest/transcoder.py`

- [ ] Create `ingest/transcoder.py`:

```python
"""
transcoder.py — FFmpeg MKV → MP4 transcoding wrapper.

Command used:
  ffmpeg -i input.mkv -c:v libx264 -preset medium -crf 23
         -c:a aac -b:a 192k -sn -movflags +faststart output.mp4

  -sn              strip subtitle streams (extracted separately as .vtt)
  -movflags +faststart  move moov atom to file start (progressive streaming)

Expected performance on the 6-vCPU VPS:
  ~3–8 minutes per 24-min 1080p episode with libx264 preset medium.
"""

import json
import logging
import os
import subprocess
from typing import Optional

logger = logging.getLogger(__name__)


def get_duration(video_path: str) -> Optional[float]:
    """
    Return the duration of *video_path* in seconds using ffprobe.
    Returns None if duration cannot be determined.
    """
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_entries", "format=duration",
        video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
        data = json.loads(result.stdout)
        duration_str = data.get("format", {}).get("duration")
        if duration_str:
            return float(duration_str)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, json.JSONDecodeError, ValueError) as exc:
        logger.warning("Could not get duration of %s: %s", video_path, exc)
    return None


def transcode(input_path: str, output_path: str) -> bool:
    """
    Transcode *input_path* (MKV) to *output_path* (MP4) using libx264 + AAC.

    Returns True on success, False on failure.
    Raises no exceptions — errors are logged and False is returned.
    """
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",                          # overwrite output if exists
        "-i", input_path,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "192k",
        "-sn",                         # no subtitle streams in output
        "-movflags", "+faststart",     # progressive streaming
        output_path,
    ]

    logger.info("Starting transcode: %s → %s", os.path.basename(input_path), os.path.basename(output_path))

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=3600,  # 1-hour timeout — plenty for a 24-min episode
        )
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        logger.info("Transcode complete: %s (%.1f MB)", os.path.basename(output_path), size_mb)
        return True

    except subprocess.CalledProcessError as exc:
        logger.error(
            "FFmpeg transcode failed for %s:\nstderr: %s",
            input_path,
            exc.stderr[-1000:],
        )
        # Clean up partial output
        if os.path.exists(output_path):
            os.remove(output_path)
        return False

    except subprocess.TimeoutExpired:
        logger.error("FFmpeg timed out transcoding %s (>1 hour)", input_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        return False
```

---

## Task 7: S3 Uploader

**File:** `ingest/uploader.py`

- [ ] Create `ingest/uploader.py`:

```python
"""
uploader.py — Upload files to Scaleway Object Storage via boto3.

Scaleway is S3-compatible. Configuration:
  SCALEWAY_ENDPOINT=https://s3.it-mil.scw.cloud
  SCALEWAY_REGION=it-mil
  SCALEWAY_BUCKET=Babylon

S3 key conventions (from spec §3):
  anime/{media_id}/s{season}/e{episode}/{filename}
  subtitles/{episode_id}/{language}.vtt
"""

import logging
import math
import os
from typing import Optional

import boto3
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import BotoCoreError, ClientError

import config

logger = logging.getLogger(__name__)

# Use multipart upload for files larger than 100 MB
MULTIPART_THRESHOLD = 100 * 1024 * 1024  # 100 MB in bytes
MULTIPART_CHUNKSIZE = 25 * 1024 * 1024   # 25 MB chunks


def _s3_client():
    """Create a configured boto3 S3 client for Scaleway."""
    return boto3.client(
        "s3",
        region_name=config.SCALEWAY_REGION,
        endpoint_url=config.SCALEWAY_ENDPOINT,
        aws_access_key_id=config.SCALEWAY_ACCESS_KEY,
        aws_secret_access_key=config.SCALEWAY_SECRET_KEY,
    )


def upload_file(local_path: str, s3_key: str) -> bool:
    """
    Upload *local_path* to *s3_key* in the configured Scaleway bucket.

    Uses multipart upload automatically for files > 100 MB.
    Returns True on success, False on failure.
    """
    client = _s3_client()
    transfer_config = TransferConfig(
        multipart_threshold=MULTIPART_THRESHOLD,
        multipart_chunksize=MULTIPART_CHUNKSIZE,
        use_threads=True,
        max_concurrency=4,
    )

    file_size = os.path.getsize(local_path)
    size_mb = file_size / (1024 * 1024)
    use_multipart = file_size > MULTIPART_THRESHOLD

    logger.info(
        "Uploading %s → s3://%s/%s (%.1f MB, multipart=%s)",
        os.path.basename(local_path), config.SCALEWAY_BUCKET, s3_key, size_mb, use_multipart,
    )

    try:
        client.upload_file(
            Filename=local_path,
            Bucket=config.SCALEWAY_BUCKET,
            Key=s3_key,
            Config=transfer_config,
        )
        logger.info("Upload complete: %s", s3_key)
        return True

    except (BotoCoreError, ClientError) as exc:
        logger.error("S3 upload failed for %s → %s: %s", local_path, s3_key, exc)
        return False


def build_episode_s3_key(media_id: str, season: int, episode_num: int, filename: str) -> str:
    """Return the S3 key for an anime episode MP4 file."""
    return f"anime/{media_id}/s{season}/e{episode_num}/{filename}"


def build_subtitle_s3_key(episode_id: str, language: str, fmt: str = "vtt") -> str:
    """Return the S3 key for a subtitle file."""
    return f"subtitles/{episode_id}/{language}.{fmt}"
```

---

## Task 8: API Registrar

**File:** `ingest/registrar.py`

- [ ] Create `ingest/registrar.py`:

```python
"""
registrar.py — Babylon API client for the ingest daemon.

All calls go to localhost:3000 (same VPS). The X-Babylon-Pin header is
sent on every request to satisfy the optional PIN middleware.

Also contains check_seen / mark_seen — direct SQLite access to the
ingest_seen / ingest_failed tables (shared DB with the API, WAL mode).
"""

import logging
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

import requests

import config

logger = logging.getLogger(__name__)

_SESSION = requests.Session()
_SESSION.headers.update({
    "Content-Type": "application/json",
    "X-Babylon-Pin": config.BABYLON_PIN,
})


def _api(method: str, path: str, **kwargs) -> dict:
    """Make an API call and return the parsed JSON response. Raises on HTTP errors."""
    url = f"{config.BABYLON_API_URL}{path}"
    resp = _SESSION.request(method, url, timeout=30, **kwargs)
    resp.raise_for_status()
    return resp.json()


def register_media(title: str, media_type: str = "anime") -> str:
    """
    Create a new media entry via POST /api/media.
    Returns the new media ID.
    Skips creation if a media entry with the same title already exists (409 → fetch existing).
    """
    try:
        data = _api("POST", "/api/media", json={
            "title": title,
            "type": media_type,
            "source": "ingest",
        })
        media_id = data["id"]
        logger.info("Registered media: %r → id=%s", title, media_id)
        return media_id
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 409:
            # Already exists — search for it
            logger.info("Media %r already exists, fetching existing id", title)
            results = _api("GET", f"/api/media?q={requests.utils.quote(title)}&type={media_type}&limit=1")
            items = results.get("items", results) if isinstance(results, dict) else results
            if items:
                return items[0]["id"]
        raise


def register_episode(
    media_id: str,
    season: int,
    episode_num: int,
    s3_key: str,
    duration_seconds: Optional[float],
    file_size: int,
    original_filename: str,
) -> str:
    """
    Register an uploaded episode via POST /api/upload/complete.
    Returns the episode ID.
    """
    data = _api("POST", "/api/upload/complete", json={
        "s3_key": s3_key,
        "media_id": media_id,
        "type": "episode",
        "season": season,
        "episode_number": episode_num,
        "duration": int(duration_seconds) if duration_seconds else None,
        "file_size": file_size,
        "original_filename": original_filename,
        "format": "mp4",
    })
    episode_id = data["id"]
    logger.info("Registered episode s%de%d → id=%s", season, episode_num, episode_id)
    return episode_id


def register_subtitle(episode_id: str, language: str, s3_key: str, fmt: str = "vtt") -> None:
    """Register a subtitle file linked to an episode."""
    _api("POST", "/api/upload/complete", json={
        "type": "subtitle",
        "episode_id": episode_id,
        "language": language,
        "s3_key": s3_key,
        "format": fmt,
        "label": _language_label(language),
    })
    logger.info("Registered subtitle (%s) for episode %s", language, episode_id)


def apply_metadata(media_id: str) -> None:
    """
    Trigger Jikan metadata fetch for a media entry.
    Insert 400 ms delay after to respect Jikan's 3 req/s rate limit.
    """
    try:
        _api("POST", f"/api/metadata/apply/{media_id}")
        logger.info("Triggered Jikan metadata for media %s", media_id)
    except Exception as exc:
        logger.warning("Metadata apply failed for %s: %s — continuing", media_id, exc)
    time.sleep(0.4)  # Jikan rate limiting: 3 req/s


# ---------------------------------------------------------------------------
# SQLite ingest_seen / ingest_failed (direct DB access)
# ---------------------------------------------------------------------------

def _db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(config.get_db_path(), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def check_seen(title: str, episode: int) -> bool:
    """Return True if this (title, episode) combination has already been processed."""
    with _db_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM ingest_seen WHERE LOWER(title) = LOWER(?) AND episode = ?",
            (title, str(episode)),
        ).fetchone()
    return row is not None


def mark_seen(title: str, episode: int, torrent_hash: Optional[str] = None) -> None:
    """Record that (title, episode) has been successfully processed."""
    with _db_conn() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO ingest_seen (id, title, episode, torrent_hash, processed_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), title, str(episode), torrent_hash, _now()),
        )
        conn.commit()
    logger.debug("Marked seen: %r episode %s", title, episode)


def mark_failed(title: str, reason: str) -> None:
    """Record a failed ingest attempt in ingest_failed for manual review."""
    with _db_conn() as conn:
        conn.execute(
            "INSERT INTO ingest_failed (id, title, reason, failed_at) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), title, reason, _now()),
        )
        conn.commit()
    logger.warning("Marked failed: %r — %s", title, reason)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _language_label(lang: str) -> str:
    """Return a human-readable label for a language code."""
    labels = {
        "eng": "English",
        "en": "English",
        "jpn": "Japanese",
        "ja": "Japanese",
        "chi": "Chinese",
        "zh": "Chinese",
        "kor": "Korean",
        "ko": "Korean",
    }
    return labels.get(lang.lower(), lang.upper())
```

---

## Task 9: Disk Space Monitor

**File:** `ingest/disk_monitor.py`

- [ ] Create `ingest/disk_monitor.py`:

```python
"""
disk_monitor.py — check available disk space before starting downloads.

The download → transcode → upload → delete cycle needs approximately 2.5 GB
free at peak (raw MKV ~1.3 GB + transcoded MP4 ~700 MB + headroom).

Thresholds (from spec §5):
  - Pause  when usage > 85%
  - Resume when usage < 75%
"""

import logging
import shutil
import time

import config

logger = logging.getLogger(__name__)


def check_disk_space(path: str = None) -> float:
    """
    Return the disk usage fraction (0.0–1.0) for the filesystem containing *path*.
    Defaults to DOWNLOAD_DIR.
    """
    if path is None:
        path = config.DOWNLOAD_DIR
    total, used, free = shutil.disk_usage(path)
    usage = used / total
    logger.debug("Disk usage at %s: %.1f%% (free: %.1f GB)", path, usage * 100, free / 1e9)
    return usage


def is_safe_to_download(path: str = None) -> bool:
    """Return True if disk usage is below the pause threshold (85%)."""
    return check_disk_space(path) < config.DISK_PAUSE_THRESHOLD


def wait_for_space(path: str = None, poll_interval: int = 60) -> None:
    """
    Block until disk usage drops below the resume threshold (75%).
    Logs a warning every poll cycle while waiting.
    """
    while True:
        usage = check_disk_space(path)
        if usage < config.DISK_RESUME_THRESHOLD:
            logger.info("Disk space recovered (%.1f%% used) — resuming ingest", usage * 100)
            return
        logger.warning(
            "Disk usage %.1f%% exceeds resume threshold %.0f%% — waiting %ds before retry",
            usage * 100, config.DISK_RESUME_THRESHOLD * 100, poll_interval,
        )
        time.sleep(poll_interval)
```

---

## Task 10: Pre-Populated watchlist.json

**File:** `ingest/watchlist.json`

- [ ] Create `ingest/watchlist.json` with all 80 titles from spec §12. All entries have `"mode": "backlog"`. Chinese donghua titles include Romanized, English, and pinyin aliases. Season numbers are parsed from the title strings.

```json
[
  {
    "title": "GOSICK",
    "aliases": [],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Nichijou",
    "aliases": ["My Ordinary Life", "Nichijou My Ordinary Life"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "No Game No Life",
    "aliases": ["NGNL"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "KonoSuba Season 1",
    "aliases": ["KonoSuba", "Kono Subarashii Sekai ni Shukufuku wo", "God's Blessing on This Wonderful World"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Quanzhi Fashi Season 1",
    "aliases": ["Full-Time Magister", "Quan Zhi Fa Shi", "Quanzhi Fashi", "Full Time Magister S1"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Gabriel DropOut",
    "aliases": ["Gabriel Dropout"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "KonoSuba Season 2",
    "aliases": ["KonoSuba S2", "Kono Subarashii Sekai ni Shukufuku wo 2"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Quanzhi Fashi Season 2",
    "aliases": ["Full-Time Magister Season 2", "Quan Zhi Fa Shi S2", "Full Time Magister S2"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Asobi Asobase",
    "aliases": ["Asobi Asobase workshop of fun"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Quanzhi Fashi Season 3",
    "aliases": ["Full-Time Magister Season 3", "Quan Zhi Fa Shi S3", "Full Time Magister S3"],
    "mode": "backlog",
    "season": 3,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Arifureta Season 1",
    "aliases": ["Arifureta", "Arifureta From Commonplace to World's Strongest", "Arifureta Shokugyou de Sekai Saikyou"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "High School Prodigies Have It Easy Even in Another World",
    "aliases": ["Choujin Koukousei-tachi wa Isekai demo Yoyuu de Ikinuku you desu", "High School Prodigies"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Assassin's Pride",
    "aliases": ["Assassins Pride"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Daily Life of the Immortal King Season 1",
    "aliases": ["Xian Wang de Richang Shenghuo", "Daily Life of Immortal King", "Immortal King S1"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Quanzhi Fashi Season 4",
    "aliases": ["Full-Time Magister Season 4", "Quan Zhi Fa Shi S4", "Full Time Magister S4"],
    "mode": "backlog",
    "season": 4,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Misfit of Demon King Academy Season 1",
    "aliases": ["Maou Gakuin no Futekigousha", "Misfit of Demon King Academy", "AntiMagic Academy"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "By the Grace of the Gods Season 1",
    "aliases": ["Kami-tachi ni Hirowareta Otoko", "By the Grace of the Gods"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Combatants Will Be Dispatched",
    "aliases": ["Sentai Daishikkaku", "Combatants Will Be Dispatched!"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Tsukimichi Moonlit Fantasy Season 1",
    "aliases": ["Tsukimichi", "Tsuki ga Michibiku Isekai Douchuu", "Moonlit Fantasy"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Quanzhi Fashi Season 5",
    "aliases": ["Full-Time Magister Season 5", "Quan Zhi Fa Shi S5", "Full Time Magister S5"],
    "mode": "backlog",
    "season": 5,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Daily Life of the Immortal King Season 2",
    "aliases": ["Xian Wang de Richang Shenghuo S2", "Daily Life of Immortal King S2", "Immortal King S2"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Spare Me Great Lord Season 1",
    "aliases": ["Zao Hua Zhi Wang", "Spare Me Great Lord", "Rao Ming Da Ren"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Arifureta Season 2",
    "aliases": ["Arifureta From Commonplace to World's Strongest Season 2", "Arifureta Shokugyou de Sekai Saikyou 2"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Greatest Demon Lord Is Reborn as a Typical Nobody",
    "aliases": ["Shijou Saikyou no Daimaou, Murabito A ni Tensei suru", "Greatest Demon Lord Reborn"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "I've Somehow Gotten Stronger When I Improved My Farm-Related Skills",
    "aliases": ["Noumin Kanren no Skill Bakka Agetetara Naze ka Tsuyoku Natta", "Farm Skills OP"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Daily Life of the Immortal King Season 3",
    "aliases": ["Xian Wang de Richang Shenghuo S3", "Daily Life of Immortal King S3", "Immortal King S3"],
    "mode": "backlog",
    "season": 3,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Eminence in Shadow Season 1",
    "aliases": ["Kage no Jitsuryokusha ni Naritakute", "Eminence in Shadow"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Farming Life in Another World",
    "aliases": ["Isekai Nonbiri Nouka", "Farming Life Isekai"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Misfit of Demon King Academy Season 2",
    "aliases": ["Maou Gakuin no Futekigousha S2", "Misfit of Demon King Academy S2"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "By the Grace of the Gods Season 2",
    "aliases": ["Kami-tachi ni Hirowareta Otoko S2", "By the Grace of the Gods S2"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Aristocrat's Otherworldly Adventure",
    "aliases": ["Isekai Kizoku no Shoukan Yuusha", "Aristocrat Otherworldly Adventure", "Serving Gods Who Go Too Far"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "KonoSuba An Explosion on This Wonderful World",
    "aliases": ["Megumin Spinoff", "Konosuba Explosion", "Kono Subarashii Sekai ni Bakuen wo"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "I Got a Cheat Skill in Another World",
    "aliases": ["Isekai de Cheat Skill wo Te ni Shita Ore", "Cheat Skill Another World"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Quanzhi Fashi Season 6",
    "aliases": ["Full-Time Magister Season 6", "Quan Zhi Fa Shi S6", "Full Time Magister S6"],
    "mode": "backlog",
    "season": 6,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Am I Actually the Strongest",
    "aliases": ["Jitsu wa Ore, Saikyou deshita?", "Am I Actually the Strongest?"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "My Unique Skill Makes Me OP Even at Level 1",
    "aliases": ["Level 1 dakedo Unique Skill de Saikyou desu", "Level 1 Unique Skill OP"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Shangri-La Frontier Season 1",
    "aliases": ["Shangri-La Frontier", "Shangri La Frontier"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "A Playthrough of a Certain Dude's VRMMO Life",
    "aliases": ["Toaru Ossan no VRMMO Katsudouki", "Certain Dude VRMMO"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Eminence in Shadow Season 2",
    "aliases": ["Kage no Jitsuryokusha ni Naritakute S2", "Eminence in Shadow S2"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Demon Sword Master of Excalibur Academy",
    "aliases": ["Maou no Ore ga Dorei Elf wo Yome ni Shitanda ga", "Excalibur Academy Demon Sword"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Vexations of a Shut-In Vampire Princess",
    "aliases": ["Futsutsuka na Akujo de wa Gozaimasu ga", "Shut-In Vampire Princess"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Daily Life of the Immortal King Season 4",
    "aliases": ["Xian Wang de Richang Shenghuo S4", "Daily Life of Immortal King S4", "Immortal King S4"],
    "mode": "backlog",
    "season": 4,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Tales of Wedding Rings Season 1",
    "aliases": ["Kekkon Yubiwa Monogatari", "Tales of Wedding Rings"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Tsukimichi Moonlit Fantasy Season 2",
    "aliases": ["Tsukimichi S2", "Tsuki ga Michibiku Isekai Douchuu S2", "Moonlit Fantasy S2"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Hokkaido Gals Are Super Adorable",
    "aliases": ["Dosanko Gal wa Namara Menkoi", "Hokkaido Gals"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Foolish Angel Dances with the Devil",
    "aliases": ["Oroka na Tenshi wa Akuma to Odoru", "Foolish Angel Dances with Devil"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Weakest Tamer Began a Journey to Pick Up Trash",
    "aliases": ["Saijaku Tamer wa Gomi Hiroi no Tabi wo Hajimemashita", "Weakest Tamer"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Mission Yozakura Family",
    "aliases": ["Mission: Yozakura Family", "Yozakura Family"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Chillin in Another World with Level 2 Super Cheat Powers",
    "aliases": ["Lv2 kara Cheat datta Moto Yuusha Kouho no Mattari Isekai Life", "Level 2 Cheat Powers"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "KonoSuba Season 3",
    "aliases": ["KonoSuba S3", "Kono Subarashii Sekai ni Shukufuku wo 3"],
    "mode": "backlog",
    "season": 3,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Misfit of Demon King Academy Season 2 Part 2",
    "aliases": ["Maou Gakuin no Futekigousha S2 Part 2", "Misfit Demon King S2B"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Failure Frame",
    "aliases": ["Failure Frame I Became the Strongest and Annihilated Everything With Low-Level Spells", "Hazure Waku no Joutai Ijou Skill"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Quanzhi Fashi Season 7",
    "aliases": ["Full-Time Magister Season 7", "Quan Zhi Fa Shi S7", "Full Time Magister S7"],
    "mode": "backlog",
    "season": 7,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Let This Grieving Soul Retire Part 1",
    "aliases": ["Wretched",  "Kanashimi no Tamashii yo Yasume", "Grieving Soul Retire"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Loner Life in Another World",
    "aliases": ["Hitoribocchi no Isekai Kouryaku", "Loner Life Isekai"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Healer Who Was Banished From His Party Is in Fact the Strongest",
    "aliases": ["Party kara Tsuihou Sareta Sono Chiyu-shi", "Banished Healer Strongest"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Shangri-La Frontier Season 2",
    "aliases": ["Shangri-La Frontier S2", "Shangri La Frontier S2"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Arifureta Season 3",
    "aliases": ["Arifureta From Commonplace to World's Strongest Season 3", "Arifureta Shokugyou de Sekai Saikyou 3"],
    "mode": "backlog",
    "season": 3,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Daily Life of a Middle-Aged Online Shopper in Another World",
    "aliases": ["Isekai de Mofumofu Nadenade suru Tame ni Ganbattemasu", "Middle-Aged Online Shopper Isekai"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "I'm a Noble on the Brink of Ruin So I Might as Well Try Mastering Magic",
    "aliases": ["Houjou no Tenki", "Noble Brink of Ruin Mastering Magic"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Left My A-Rank Party to Help My Former Students Reach the Dungeon Depths",
    "aliases": ["A-Rank Party wo Ridatsu shita Ore wa", "Former Students Dungeon Depths"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Shiunji Family Children",
    "aliases": ["Shiunji-ke no Kodomotachi", "Shiunji Family"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Unaware Atelier Meister",
    "aliases": ["Kioku ni Gozaimasen", "Unaware Atelier Meister"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "I'm the Evil Lord of an Intergalactic Empire",
    "aliases": ["Ore wa Seikai Saiaku no Akutoku Ryoshu", "Evil Lord Intergalactic Empire"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Tales of Wedding Rings Season 2",
    "aliases": ["Kekkon Yubiwa Monogatari S2", "Tales of Wedding Rings S2"],
    "mode": "backlog",
    "season": 2,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "A Gatherer's Adventure in Isekai",
    "aliases": ["Saikyou no Shien-shoku", "Gatherer Adventure Isekai"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Let This Grieving Soul Retire Part 2",
    "aliases": ["Kanashimi no Tamashii yo Yasume Part 2", "Grieving Soul Retire Part 2"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Chitose Is in the Ramune Bottle",
    "aliases": ["Chitose-kun wa Ramune Bin no Naka", "Chitose Ramune Bottle"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Dad is a Hero Mom is a Spirit I'm a Reincarnator",
    "aliases": ["Chichi wa Eiyuu, Haha wa Seirei, Musume no Watashi wa Tenseisha.", "Hero Dad Spirit Mom Reincarnator"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Hero Without a Class",
    "aliases": ["Munou Nana", "Classless Hero"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Li'l Miss Vampire Can't Suck Right",
    "aliases": ["Chiisana Vampire no Kekkon Seikatsu", "Lil Miss Vampire"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "My Gift Lvl 9999 Unlimited Gacha",
    "aliases": ["Mugen Gacha Level 9999 no Boukensha", "Unlimited Gacha Level 9999"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "My Status as an Assassin Obviously Exceeds the Hero's",
    "aliases": ["Assassin de Aru Ore no Status ga Yuusha yori mo Akiraka ni Tsuyoi", "Assassin Status Exceeds Hero"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Pass the Monster Meat Milady",
    "aliases": ["Kaijuu no Okasama", "Pass the Monster Meat"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Daily Life of the Immortal King Season 5",
    "aliases": ["Xian Wang de Richang Shenghuo S5", "Daily Life of Immortal King S5", "Immortal King S5"],
    "mode": "backlog",
    "season": 5,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "The Demon King's Daughter Is Too Kind",
    "aliases": ["Maou no Musume wa Yasashisugiru", "Demon King Daughter Too Kind"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "There Was a Cute Girl in the Hero's Party So I Tried Confessing to Her",
    "aliases": ["Yuusha Party ni Kawaii Ko ga Ita no de", "Cute Girl Hero Party Confessing"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Easygoing Territory Defense by the Optimistic Lord",
    "aliases": ["Nonbiri Ryoushu no Slow Life", "Optimistic Lord Territory Defense"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Noble Reincarnation Born Blessed So I'll Obtain Ultimate Power",
    "aliases": ["Tensei Kizoku no Isekai Boukenroku", "Noble Reincarnation Ultimate Power"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Hell Mode",
    "aliases": ["Hell Mode: The Hardcore Gamer Dominates in Another World with Garbage Balancing", "Hell Mode Hardcore Gamer"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  }
]
```

---

## Task 11: Main Daemon Loop

**File:** `ingest/daemon.py`

- [ ] Create `ingest/daemon.py`:

```python
"""
daemon.py — Babylon ingest daemon entry point.

Runs as a systemd service. Main responsibilities:
  1. RSS mode: poll SubsPlease every INGEST_POLL_INTERVAL seconds, match
     against watchlist, download + process new episodes.
  2. Backlog mode: for watchlist entries with mode="backlog", search Nyaa
     for a complete batch and process sequentially.
  3. Trigger file: if /opt/babylon/ingest/trigger exists, immediately start
     a new poll cycle (written by POST /api/ingest/trigger).
  4. Status file: write /opt/babylon/ingest/status.json continuously so
     GET /api/ingest/status has live data.
  5. Signal handling: SIGTERM → clean shutdown after current task.

IPC contract:
  - Trigger file: INGEST_STATE_DIR/trigger (plain text ISO timestamp)
  - Status file:  INGEST_STATE_DIR/status.json
  - Watchlist:    INGEST_STATE_DIR/watchlist.json
"""

import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import config
import disk_monitor
import downloader
import registrar
import rss_poller
import subtitle_extractor
import transcoder
import uploader
from filename_parser import is_non_episode, parse_episode

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("daemon")

# Paths
STATE_DIR = Path(config.INGEST_STATE_DIR)
WATCHLIST_PATH = STATE_DIR / "watchlist.json"
STATUS_PATH = STATE_DIR / "status.json"
TRIGGER_PATH = STATE_DIR / "trigger"

# Shutdown flag — set by SIGTERM
_shutdown = False


def _handle_sigterm(signum, frame):
    global _shutdown
    logger.info("SIGTERM received — finishing current task then shutting down")
    _shutdown = True


signal.signal(signal.SIGTERM, _handle_sigterm)


# ---------------------------------------------------------------------------
# Status file
# ---------------------------------------------------------------------------

def _write_status(state: dict) -> None:
    STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATUS_PATH.with_suffix(".tmp")
    with open(tmp, "w") as f:
        json.dump(state, f, indent=2)
    tmp.replace(STATUS_PATH)  # atomic rename


def _status(current_task: Optional[str] = None, queue: Optional[list] = None) -> dict:
    return {
        "running": True,
        "lastPollAt": datetime.now(timezone.utc).isoformat(),
        "currentTask": current_task,
        "queue": queue or [],
    }


# ---------------------------------------------------------------------------
# Watchlist
# ---------------------------------------------------------------------------

def _read_watchlist() -> list[dict]:
    if WATCHLIST_PATH.exists():
        with open(WATCHLIST_PATH) as f:
            return json.load(f)
    # Fallback: read bundled watchlist.json from daemon directory
    bundled = Path(__file__).parent / "watchlist.json"
    if bundled.exists():
        with open(bundled) as f:
            data = json.load(f)
        # Copy to state dir so the API can manage it
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        with open(WATCHLIST_PATH, "w") as f:
            json.dump(data, f, indent=2)
        logger.info("Initialised watchlist from bundled file (%d entries)", len(data))
        return data
    return []


# ---------------------------------------------------------------------------
# Single-episode pipeline
# ---------------------------------------------------------------------------

def _process_episode(
    mkv_path: str,
    show_title: str,
    season: int,
    episode_num: int,
    torrent_hash: Optional[str],
) -> bool:
    """
    Run the full pipeline for one episode file:
      extract subtitles → transcode → upload → register in API → mark seen.

    Returns True on success.
    """
    basename = os.path.basename(mkv_path)
    logger.info("Processing: %s (s%02de%02d)", show_title, season, episode_num)
    _write_status(_status(f"Processing {show_title} s{season:02d}e{episode_num:02d}"))

    # 1. Check disk space
    if not disk_monitor.is_safe_to_download():
        logger.warning("Disk space low — waiting before processing %s", basename)
        disk_monitor.wait_for_space()

    # 2. Extract subtitles
    subtitle_dir = os.path.join(config.PROCESSED_DIR, "subs")
    subs = subtitle_extractor.extract_subtitles(mkv_path, subtitle_dir)
    logger.info("Extracted %d subtitle track(s)", len(subs))

    # 3. Transcode
    mp4_name = os.path.splitext(basename)[0] + ".mp4"
    mp4_path = os.path.join(config.PROCESSED_DIR, mp4_name)
    ok = transcoder.transcode(mkv_path, mp4_path)
    if not ok:
        logger.error("Transcode failed for %s — skipping", basename)
        return False

    duration = transcoder.get_duration(mp4_path)
    file_size = os.path.getsize(mp4_path)

    # 4. Register media (idempotent — returns existing if already present)
    try:
        media_id = registrar.register_media(show_title, media_type="anime")
    except Exception as exc:
        logger.error("Failed to register media %r: %s", show_title, exc)
        _cleanup(mp4_path, subs)
        return False

    # 5. Upload MP4
    s3_key = uploader.build_episode_s3_key(media_id, season, episode_num, mp4_name)
    if not uploader.upload_file(mp4_path, s3_key):
        logger.error("S3 upload failed for %s", mp4_name)
        _cleanup(mp4_path, subs)
        return False

    # 6. Register episode
    try:
        episode_id = registrar.register_episode(
            media_id=media_id,
            season=season,
            episode_num=episode_num,
            s3_key=s3_key,
            duration_seconds=duration,
            file_size=file_size,
            original_filename=basename,
        )
    except Exception as exc:
        logger.error("Failed to register episode: %s", exc)
        _cleanup(mp4_path, subs)
        return False

    # 7. Upload and register subtitles
    for sub in subs:
        sub_s3_key = uploader.build_subtitle_s3_key(episode_id, sub["language"])
        if uploader.upload_file(sub["path"], sub_s3_key):
            try:
                registrar.register_subtitle(episode_id, sub["language"], sub_s3_key)
            except Exception as exc:
                logger.warning("Subtitle registration failed (%s): %s", sub["language"], exc)

    # 8. Trigger Jikan metadata (only once per show — registrar handles rate limit)
    registrar.apply_metadata(media_id)

    # 9. Mark seen
    registrar.mark_seen(show_title, episode_num, torrent_hash)

    # 10. Cleanup local files
    _cleanup(mp4_path, subs)
    os.remove(mkv_path)
    logger.info("Completed: %s s%02de%02d", show_title, season, episode_num)
    return True


def _cleanup(mp4_path: str, subs: list[dict]) -> None:
    for path in [mp4_path] + [s["path"] for s in subs]:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError as exc:
                logger.warning("Could not delete %s: %s", path, exc)


# ---------------------------------------------------------------------------
# RSS mode
# ---------------------------------------------------------------------------

def _run_rss_cycle(watchlist: list[dict]) -> None:
    """Fetch SubsPlease RSS, match against watchlist, process new episodes."""
    logger.info("Starting RSS poll cycle")
    _write_status(_status("Polling SubsPlease RSS"))

    items = rss_poller.poll_subsplease()
    if not items:
        logger.info("No RSS items returned")
        return

    rss_watchlist = [e for e in watchlist if e.get("mode") == "rss"]
    matched = rss_poller.match_watchlist(items, rss_watchlist or watchlist)
    logger.info("Matched %d RSS items against watchlist", len(matched))

    for rss_item, entry in matched:
        if _shutdown:
            break
        episode_num = rss_item.episode
        if episode_num is None:
            logger.debug("Skipping (no episode number): %s", rss_item.title)
            continue

        show_title = entry["title"]
        season = entry.get("season", 1)

        if registrar.check_seen(show_title, episode_num):
            logger.debug("Already seen: %s ep%d", show_title, episode_num)
            continue

        if not disk_monitor.is_safe_to_download():
            logger.warning("Disk full — pausing until space available")
            disk_monitor.wait_for_space()

        _write_status(_status(f"Downloading {show_title} ep{episode_num}"))
        try:
            torrent_hash = downloader.add_magnet(rss_item.magnet_link, config.DOWNLOAD_DIR)
            downloader.wait_for_completion(torrent_hash)
        except Exception as exc:
            logger.error("Download failed for %s ep%d: %s", show_title, episode_num, exc)
            continue

        # Find the downloaded MKV
        files = downloader.get_torrent_files(torrent_hash)
        mkv_files = [f for f in files if f["name"].lower().endswith(".mkv")]
        if not mkv_files:
            logger.warning("No MKV found in torrent %s", torrent_hash)
            downloader.remove_torrent(torrent_hash)
            continue

        mkv_path = os.path.join(config.DOWNLOAD_DIR, mkv_files[0]["name"])
        _process_episode(mkv_path, show_title, season, episode_num, torrent_hash)
        downloader.remove_torrent(torrent_hash, delete_files=True)


# ---------------------------------------------------------------------------
# Backlog mode
# ---------------------------------------------------------------------------

def _run_backlog_cycle(watchlist: list[dict]) -> None:
    """Process one backlog entry: search Nyaa, download batch, process episode-by-episode."""
    backlog = [e for e in watchlist if e.get("mode") == "backlog"]
    if not backlog:
        return

    for entry in backlog:
        if _shutdown:
            break

        show_title = entry["title"]
        aliases = entry.get("aliases", [])
        season = entry.get("season", 1)

        logger.info("Backlog search for: %s", show_title)
        _write_status(_status(f"Searching Nyaa for {show_title}"))

        batch = rss_poller.search_nyaa_batch(show_title, aliases)
        if not batch:
            registrar.mark_failed(show_title, "Not found on Nyaa")
            continue

        if not disk_monitor.is_safe_to_download():
            disk_monitor.wait_for_space()

        try:
            torrent_hash = downloader.add_magnet(batch.magnet_link, config.DOWNLOAD_DIR)
        except Exception as exc:
            logger.error("Failed to add batch torrent for %s: %s", show_title, exc)
            continue

        # Disable all files first
        all_files = downloader.get_torrent_files(torrent_hash)
        for f in all_files:
            downloader.set_file_priority(torrent_hash, f["index"], 0)

        # Filter to episode MKV files, sort by episode number
        episode_files = []
        for f in all_files:
            name = f["name"]
            if not name.lower().endswith(".mkv"):
                continue
            if is_non_episode(name):
                continue
            ep_num = parse_episode(name)
            if ep_num is None:
                continue
            episode_files.append((ep_num, f))

        episode_files.sort(key=lambda x: x[0])
        logger.info("Found %d episode files in batch for %s", len(episode_files), show_title)

        for ep_num, f in episode_files:
            if _shutdown:
                break

            if registrar.check_seen(show_title, ep_num):
                logger.debug("Already seen: %s ep%d", show_title, ep_num)
                continue

            if not disk_monitor.is_safe_to_download():
                disk_monitor.wait_for_space()

            _write_status(_status(f"Downloading {show_title} ep{ep_num}"))

            # Enable this file, wait, disable again
            downloader.set_file_priority(torrent_hash, f["index"], 1)
            try:
                downloader.wait_for_single_file(torrent_hash, f["index"])
            except Exception as exc:
                logger.error("File download failed: %s ep%d: %s", show_title, ep_num, exc)
                downloader.set_file_priority(torrent_hash, f["index"], 0)
                continue

            mkv_path = os.path.join(config.DOWNLOAD_DIR, f["name"])
            _process_episode(mkv_path, show_title, season, ep_num, torrent_hash)
            downloader.set_file_priority(torrent_hash, f["index"], 0)

        downloader.remove_torrent(torrent_hash, delete_files=True)
        logger.info("Backlog complete for: %s", show_title)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def _check_trigger() -> bool:
    """Return True and delete the trigger file if it exists."""
    if TRIGGER_PATH.exists():
        try:
            TRIGGER_PATH.unlink()
        except OSError:
            pass
        logger.info("Trigger file detected — forcing immediate poll")
        return True
    return False


def main() -> None:
    logger.info("Babylon ingest daemon starting — poll interval %ds", config.INGEST_POLL_INTERVAL)
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    os.makedirs(config.DOWNLOAD_DIR, exist_ok=True)
    os.makedirs(config.PROCESSED_DIR, exist_ok=True)

    _write_status({"running": True, "lastPollAt": None, "currentTask": "starting", "queue": []})

    last_poll = 0.0

    while not _shutdown:
        now = time.monotonic()
        triggered = _check_trigger()

        if triggered or (now - last_poll) >= config.INGEST_POLL_INTERVAL:
            watchlist = _read_watchlist()
            if watchlist:
                try:
                    _run_rss_cycle(watchlist)
                except Exception as exc:
                    logger.error("RSS cycle error: %s", exc, exc_info=True)
                try:
                    _run_backlog_cycle(watchlist)
                except Exception as exc:
                    logger.error("Backlog cycle error: %s", exc, exc_info=True)
            else:
                logger.warning("Watchlist is empty — nothing to do")

            last_poll = time.monotonic()
            _write_status(_status("idle"))

        time.sleep(5)  # short sleep to remain responsive to SIGTERM and trigger file

    _write_status({"running": False, "lastPollAt": None, "currentTask": None, "queue": []})
    logger.info("Ingest daemon stopped cleanly")


if __name__ == "__main__":
    main()
```

---

## Task 12: systemd Service File

**File:** `ingest/babylon-ingest.service`

- [ ] Create `ingest/babylon-ingest.service`:

```ini
[Unit]
Description=Babylon Ingest Daemon
After=network.target qbittorrent-nox.service babylon-api.service
Wants=qbittorrent-nox.service babylon-api.service

[Service]
Type=simple
User=babylon
Group=babylon
WorkingDirectory=/opt/babylon/ingest
EnvironmentFile=/opt/babylon/.env
ExecStart=/opt/babylon/ingest/venv/bin/python daemon.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=babylon-ingest

# Resource limits — daemon should not monopolise the VPS
# FFmpeg already uses all cores; this prevents the daemon loop from competing
CPUQuota=10%
MemoryMax=512M

# Give the daemon time to finish an in-progress task before force-kill
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
```

- [ ] Create `deploy/babylon-api.service`:

```ini
[Unit]
Description=Babylon API Server
After=network.target

[Service]
Type=simple
User=babylon
Group=babylon
WorkingDirectory=/opt/babylon/api
EnvironmentFile=/opt/babylon/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=babylon-api

# API is lightweight — generous limits
MemoryMax=1G

[Install]
WantedBy=multi-user.target
```

- [ ] Commit both service files:

```bash
git add ingest/babylon-ingest.service deploy/babylon-api.service
git commit -m "feat: add systemd service files for API + ingest daemon"
```

---

## Task 13: VPS Setup Script

**File:** `deploy/setup.sh`

- [ ] Create `deploy/setup.sh` — idempotent initial setup for the UpCloud VPS:

```bash
#!/usr/bin/env bash
# setup.sh — Idempotent VPS setup for Babylon (Ubuntu LTS, UpCloud Frankfurt)
# Run as root on first boot, safe to re-run.
set -euo pipefail

BABYLON_USER="babylon"
BABYLON_HOME="/opt/babylon"
DOWNLOAD_DIR="/downloads"

echo "=== Babylon VPS Setup ==="

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------
apt-get update -qq

# Node.js 22 LTS
if ! command -v node &>/dev/null || [[ "$(node --version)" != v22* ]]; then
  echo "Installing Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# Python 3.12
if ! command -v python3.12 &>/dev/null; then
  echo "Installing Python 3.12..."
  add-apt-repository -y ppa:deadsnakes/ppa
  apt-get update -qq
  apt-get install -y python3.12 python3.12-venv python3.12-dev
fi

# FFmpeg (latest from apt)
if ! command -v ffmpeg &>/dev/null; then
  echo "Installing FFmpeg..."
  apt-get install -y ffmpeg
fi

# qBittorrent-nox
if ! command -v qbittorrent-nox &>/dev/null; then
  echo "Installing qBittorrent-nox..."
  apt-get install -y qbittorrent-nox
fi

# Nginx + Certbot
if ! command -v nginx &>/dev/null; then
  echo "Installing Nginx..."
  apt-get install -y nginx
fi

if ! command -v certbot &>/dev/null; then
  echo "Installing Certbot..."
  apt-get install -y certbot python3-certbot-nginx
fi

# Misc tools
apt-get install -y git curl wget unzip sqlite3

echo "System packages installed."

# ---------------------------------------------------------------------------
# 2. babylon user
# ---------------------------------------------------------------------------
if ! id "${BABYLON_USER}" &>/dev/null; then
  echo "Creating user ${BABYLON_USER}..."
  useradd -r -m -d "${BABYLON_HOME}" -s /bin/bash "${BABYLON_USER}"
fi

# ---------------------------------------------------------------------------
# 3. Directory layout
# ---------------------------------------------------------------------------
echo "Creating directories..."
mkdir -p "${BABYLON_HOME}"/{api,ingest,data}
mkdir -p "${DOWNLOAD_DIR}"/{raw,processed/subs}

chown -R "${BABYLON_USER}:${BABYLON_USER}" "${BABYLON_HOME}"
chown -R "${BABYLON_USER}:${BABYLON_USER}" "${DOWNLOAD_DIR}"

# ---------------------------------------------------------------------------
# 4. qBittorrent-nox initial config
# ---------------------------------------------------------------------------
QB_CONFIG_DIR="/home/${BABYLON_USER}/.config/qBittorrent"
QB_CONFIG="${QB_CONFIG_DIR}/qBittorrent.conf"

if [[ ! -f "${QB_CONFIG}" ]]; then
  echo "Configuring qBittorrent-nox..."
  mkdir -p "${QB_CONFIG_DIR}"
  cat > "${QB_CONFIG}" <<'QBCONF'
[LegalNotice]
Accepted=true

[Preferences]
WebUI\Address=127.0.0.1
WebUI\Port=8080
WebUI\Username=admin
WebUI\Password_PBKDF2="@ByteArray(...);"
WebUI\LocalHostAuth=false
Downloads\SavePath=/downloads/raw
Downloads\TempPath=/downloads/raw
QBCONF
  chown -R "${BABYLON_USER}:${BABYLON_USER}" "${QB_CONFIG_DIR}"
  echo "NOTE: Change qBittorrent WebUI password after first start!"
fi

# ---------------------------------------------------------------------------
# 5. Python virtualenv for ingest daemon
# ---------------------------------------------------------------------------
VENV_DIR="${BABYLON_HOME}/ingest/venv"
if [[ ! -d "${VENV_DIR}" ]]; then
  echo "Creating Python virtualenv..."
  sudo -u "${BABYLON_USER}" python3.12 -m venv "${VENV_DIR}"
fi

if [[ -f "${BABYLON_HOME}/ingest/requirements.txt" ]]; then
  echo "Installing Python dependencies..."
  sudo -u "${BABYLON_USER}" "${VENV_DIR}/bin/pip" install --quiet -r "${BABYLON_HOME}/ingest/requirements.txt"
fi

# ---------------------------------------------------------------------------
# 6. .env template
# ---------------------------------------------------------------------------
if [[ ! -f "${BABYLON_HOME}/.env" ]]; then
  if [[ -f "${BABYLON_HOME}/deploy/.env.example" ]]; then
    cp "${BABYLON_HOME}/deploy/.env.example" "${BABYLON_HOME}/.env"
    chown "${BABYLON_USER}:${BABYLON_USER}" "${BABYLON_HOME}/.env"
    chmod 600 "${BABYLON_HOME}/.env"
    echo "Copied .env.example → .env — FILL IN YOUR CREDENTIALS!"
  fi
fi

# ---------------------------------------------------------------------------
# 7. systemd services
# ---------------------------------------------------------------------------
echo "Installing systemd services..."

# qBittorrent-nox
if [[ ! -f /etc/systemd/system/qbittorrent-nox.service ]]; then
  cat > /etc/systemd/system/qbittorrent-nox.service <<QBSVC
[Unit]
Description=qBittorrent-nox
After=network.target

[Service]
Type=exec
User=${BABYLON_USER}
ExecStart=/usr/bin/qbittorrent-nox
Restart=on-failure

[Install]
WantedBy=multi-user.target
QBSVC
fi

# Copy API and ingest service files if present
for SVC in babylon-api.service babylon-ingest.service; do
  SRC="${BABYLON_HOME}/ingest/${SVC}"
  if [[ -f "${SRC}" ]] && [[ ! -f "/etc/systemd/system/${SVC}" ]]; then
    cp "${SRC}" "/etc/systemd/system/${SVC}"
    echo "Installed ${SVC}"
  fi
done

systemctl daemon-reload
systemctl enable qbittorrent-nox babylon-api babylon-ingest

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Edit ${BABYLON_HOME}/.env with your credentials"
echo "  2. Copy your built API to ${BABYLON_HOME}/api/"
echo "  3. Copy ingest/ files to ${BABYLON_HOME}/ingest/"
echo "  4. Run: certbot --nginx -d api.internalrr.info"
echo "  5. Run: systemctl start qbittorrent-nox babylon-api babylon-ingest"
echo "  6. Change qBittorrent WebUI password at http://127.0.0.1:8080"
```

---

## Task 14: Nginx Config + SSL

**Files:**
- `deploy/nginx/babylon.conf`
- `deploy/.env.example`

- [ ] Create `deploy/nginx/babylon.conf`:

```nginx
# /etc/nginx/sites-available/babylon
# Proxy for Babylon API (api.internalrr.info → localhost:3000)
# SSL managed by Certbot (certbot --nginx -d api.internalrr.info)

server {
    listen 80;
    listen [::]:80;
    server_name api.internalrr.info;

    # Certbot will insert the ACME challenge location here.
    # All other HTTP traffic → HTTPS redirect.
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name api.internalrr.info;

    # --- SSL (managed by Certbot — do not edit these lines manually) ---
    # ssl_certificate     /etc/letsencrypt/live/api.internalrr.info/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.internalrr.info/privkey.pem;
    # include /etc/letsencrypt/options-ssl-nginx.conf;
    # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # --- Security headers ---
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;

    # --- Proxy to Fastify API ---
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket support (for future live status)
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts — generous for upload and streaming operations
        proxy_connect_timeout 60s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;

        # Body size — allow large file uploads via the API
        client_max_body_size 2G;
    }
}
```

- [ ] Create `deploy/.env.example`:

```bash
# Scaleway Object Storage (Milan region)
SCALEWAY_ACCESS_KEY=<your-scaleway-access-key>
SCALEWAY_SECRET_KEY=<your-scaleway-secret-key>
SCALEWAY_BUCKET=Babylon
SCALEWAY_REGION=it-mil
SCALEWAY_ENDPOINT=https://s3.it-mil.scw.cloud

# TMDB Metadata API
TMDB_API_KEY=<your-tmdb-api-key>
TMDB_READ_ACCESS_TOKEN=<your-tmdb-read-access-token>

# App Config
BABYLON_PIN=<optional-pin-leave-blank-to-disable>
DATABASE_URL=file:///opt/babylon/data/babylon.db
ALLOWED_ORIGINS=https://your-app.vercel.app
PORT=3000

# Ingest Daemon
QBITTORRENT_HOST=http://127.0.0.1:8080
QBITTORRENT_USER=admin
QBITTORRENT_PASS=<change-from-default>
DOWNLOAD_DIR=/downloads/raw
PROCESSED_DIR=/downloads/processed
INGEST_STATE_DIR=/opt/babylon/ingest
INGEST_POLL_INTERVAL=300
BABYLON_API_URL=http://127.0.0.1:3000
```

---

## Task 15: Deploy and Verify

- [ ] **Build the API on dev machine:**
  ```bash
  cd packages/api && npm run build
  ```

- [ ] **Copy built artifacts to VPS:**
  ```bash
  # From project root on dev machine
  rsync -avz --exclude node_modules packages/api/dist/ babylon@212.147.228.229:/opt/babylon/api/dist/
  rsync -avz packages/api/package.json babylon@212.147.228.229:/opt/babylon/api/
  rsync -avz ingest/ babylon@212.147.228.229:/opt/babylon/ingest/
  rsync -avz deploy/ babylon@212.147.228.229:/opt/babylon/deploy/
  ```

- [ ] **On VPS: install API dependencies:**
  ```bash
  cd /opt/babylon/api && npm install --omit=dev
  ```

- [ ] **On VPS: install Python dependencies:**
  ```bash
  cd /opt/babylon/ingest
  python3.12 -m venv venv
  venv/bin/pip install -r requirements.txt
  ```

- [ ] **On VPS: copy and enable Nginx config:**
  ```bash
  cp /opt/babylon/deploy/nginx/babylon.conf /etc/nginx/sites-available/babylon
  ln -sf /etc/nginx/sites-available/babylon /etc/nginx/sites-enabled/babylon
  nginx -t && systemctl reload nginx
  ```

- [ ] **On VPS: obtain Let's Encrypt certificate:**
  ```bash
  certbot --nginx -d api.internalrr.info --non-interactive --agree-tos -m your@email.com
  ```

- [ ] **On VPS: install and start all systemd services:**
  ```bash
  cp /opt/babylon/ingest/babylon-ingest.service /etc/systemd/system/
  # babylon-api.service should already exist from setup.sh
  systemctl daemon-reload
  systemctl enable --now qbittorrent-nox
  systemctl enable --now babylon-api
  systemctl enable --now babylon-ingest
  ```

- [ ] **Verify services are running:**
  ```bash
  systemctl status babylon-api babylon-ingest qbittorrent-nox
  ```

- [ ] **Verify API health check:**
  ```bash
  curl -s https://api.internalrr.info/api/health
  # Expected: {"status":"ok"}
  ```

- [ ] **Verify ingest daemon started and is polling:**
  ```bash
  journalctl -u babylon-ingest -f --no-pager
  # Look for: "Babylon ingest daemon starting" and "Starting RSS poll cycle"
  ```

- [ ] **Verify ingest status endpoint:**
  ```bash
  curl -s https://api.internalrr.info/api/ingest/status
  # Expected: {"running":true,"lastPollAt":"...","currentTask":"idle","queue":[]}
  ```

- [ ] **Verify watchlist seeded:**
  ```bash
  curl -s https://api.internalrr.info/api/ingest/watchlist | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d), 'entries')"
  # Expected: 80 entries
  ```

- [ ] **Trigger a manual poll and verify:**
  ```bash
  curl -X POST https://api.internalrr.info/api/ingest/trigger
  # Watch journalctl for the daemon to pick up the trigger file
  ```

---

## Notes for Implementors

1. **SQLite WAL mode is critical.** Both the API (Drizzle ORM) and the daemon (sqlite3 stdlib) open the same `babylon.db`. The daemon sets `PRAGMA journal_mode=WAL` and `PRAGMA busy_timeout=5000` on every connection. Ensure the API's Drizzle config also uses WAL mode — check `packages/api/src/db/index.ts`.

2. **qBittorrent default password.** The WebUI password `adminadmin` must be changed before exposing the config. The setup script warns about this. Store the new password in `.env` as `QBITTORRENT_PASS`.

3. **Watchlist initialisation.** On first run, `daemon.py` copies the bundled `watchlist.json` to `INGEST_STATE_DIR/watchlist.json` if no watchlist exists there yet. After that, the API manages the file via `createWatchlistManager` in `packages/api/src/lib/watchlist.ts` — both use the same path.

4. **Chinese donghua availability.** Quanzhi Fashi, The Daily Life of the Immortal King, and Spare Me Great Lord are not on SubsPlease. The `search_nyaa_batch` fallback (no uploader filter) is the primary path for these. Multiple aliases ensure the best match.

5. **Backlog vs RSS mode.** All 80 titles start as `mode: "backlog"`. To switch a currently-airing show to RSS mode, use `PATCH /api/ingest/watchlist/:title` (or directly edit `watchlist.json` and restart the daemon). The daemon processes RSS matches from the full watchlist regardless of mode — mode only controls whether the show gets a Nyaa batch search in the backlog cycle.

6. **Disk space.** Peak usage per episode: ~1.3 GB (raw MKV) + ~700 MB (transcoded MP4) + subtitle files (~1 MB each) = ~2.5 GB. The 320 GB VPS SSD provides substantial headroom, but the monitor is a safety rail for edge cases (large batch downloads).

7. **Certbot auto-renewal.** Certbot installs a systemd timer `certbot.timer` that runs twice daily. Verify with `systemctl status certbot.timer`. The Nginx plugin handles reload automatically.

8. **babylon-api.service** is created in Task 12 alongside the ingest service. The ingest service's `After=` and `Wants=` directives reference it.
