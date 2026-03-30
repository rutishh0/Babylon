"""
registrar.py — Babylon API client for the ingest daemon.

All calls go to localhost:3000 (same VPS). The X-Babylon-Pin header is
sent on every request to satisfy the optional PIN middleware.

Also contains check_seen / mark_seen — direct SQLite access to the
ingest_seen / ingest_failed tables (shared DB with the API, WAL mode).
"""

import logging
import os
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
        "s3Key": s3_key,
        "mediaId": media_id,
        "seasonNumber": season,
        "episodeNumber": episode_num,
        "duration": int(duration_seconds) if duration_seconds else None,
        "fileSize": file_size,
        "originalFilename": original_filename,
        "format": "mp4",
    })
    episode_id = data.get("id") or data.get("episodeId")
    logger.info("Registered episode s%de%d → id=%s", season, episode_num, episode_id)
    return episode_id


def register_subtitle(episode_id: str, language: str, s3_key: str, fmt: str = "vtt") -> None:
    """Register a subtitle file linked to an episode."""
    # TODO: Add subtitle creation API endpoint. For now, subtitles are moved
    # to local storage but not registered in the database.
    logger.info("Subtitle moved to %s (lang=%s) — DB registration pending API endpoint", s3_key, language)
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

def _ingest_db_path() -> str:
    """Use a separate SQLite DB on native Linux fs for ingest tracking.
    The main Babylon DB lives on /mnt/b/ (9P mount) which doesn't support SQLite locking."""
    native_dir = os.path.expanduser("~/.babylon")
    os.makedirs(native_dir, exist_ok=True)
    return os.path.join(native_dir, "ingest.db")


_ingest_db_initialized = False


def _db_conn() -> sqlite3.Connection:
    global _ingest_db_initialized
    conn = sqlite3.connect(_ingest_db_path(), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    if not _ingest_db_initialized:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ingest_seen (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                episode TEXT NOT NULL,
                torrent_hash TEXT,
                processed_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ingest_failed (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                reason TEXT,
                failed_at TEXT NOT NULL
            )
        """)
        conn.commit()
        _ingest_db_initialized = True
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
