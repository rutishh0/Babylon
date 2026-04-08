"""Phase 1.5 — SQLite database for download history and library tracking."""

import os
import json
import sqlite3
import threading

DB_PATH = os.environ.get("DOWNLOAD_DB", "B:/Babylon/data/phase15.db")

_conn = None
_lock = threading.Lock()


def _get_conn():
    """Get a shared database connection (serialized with a lock)."""
    global _conn
    if _conn is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=30)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA busy_timeout=10000")
        _conn.execute("PRAGMA foreign_keys=ON")
    return _conn


def init_db():
    """Create tables if they don't exist."""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS anime (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            cover_url TEXT,
            description TEXT,
            genres TEXT,
            year INTEGER,
            episode_count INTEGER,
            status TEXT,
            languages TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS downloaded_episode (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anime_id TEXT NOT NULL,
            episode_number REAL NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            language TEXT DEFAULT 'sub',
            quality TEXT,
            downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (anime_id) REFERENCES anime(id),
            UNIQUE(anime_id, episode_number, language)
        );

        CREATE TABLE IF NOT EXISTS download_job (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anime_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            total_episodes INTEGER NOT NULL,
            completed_episodes TEXT DEFAULT '[]',
            errors TEXT DEFAULT '[]',
            current_episode REAL,
            progress INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS movie (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            year INTEGER,
            languages TEXT,
            quality_tag TEXT,
            resolutions TEXT,
            file_size TEXT,
            has_esub INTEGER DEFAULT 0,
            topic_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS movie_download_job (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            magnet_url TEXT NOT NULL,
            torrent_hash TEXT,
            language TEXT,
            resolution TEXT,
            save_path TEXT,
            progress REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()


def upsert_anime(data: dict):
    """Insert or update anime by id."""
    conn = _get_conn()
    anime_id = data.get("id")
    if not anime_id:
        raise ValueError("anime data must include 'id'")

    # Serialize list fields to JSON strings
    genres = data.get("genres")
    if isinstance(genres, (list, tuple)):
        genres = json.dumps(genres)
    languages = data.get("languages")
    if isinstance(languages, (list, tuple)):
        languages = json.dumps(languages)

    conn.execute("""
        INSERT INTO anime (id, title, cover_url, description, genres, year, episode_count, status, languages)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = COALESCE(excluded.title, anime.title),
            cover_url = COALESCE(excluded.cover_url, anime.cover_url),
            description = COALESCE(excluded.description, anime.description),
            genres = COALESCE(excluded.genres, anime.genres),
            year = COALESCE(excluded.year, anime.year),
            episode_count = COALESCE(excluded.episode_count, anime.episode_count),
            status = COALESCE(excluded.status, anime.status),
            languages = COALESCE(excluded.languages, anime.languages)
    """, (
        anime_id,
        data.get("title", "Unknown"),
        data.get("cover_url"),
        data.get("description"),
        genres,
        data.get("year"),
        data.get("episode_count"),
        data.get("status"),
        languages,
    ))
    conn.commit()


def insert_downloaded_episode(anime_id, ep_num, file_path, file_size=None, language="sub", quality=None):
    """Insert a downloaded episode record. Raises on duplicate."""
    conn = _get_conn()
    conn.execute("""
        INSERT INTO downloaded_episode (anime_id, episode_number, file_path, file_size, language, quality)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (anime_id, float(ep_num), file_path, file_size, language, quality))
    conn.commit()


def get_downloaded_episode(anime_id, ep_num, language="sub"):
    """Get a single downloaded episode row."""
    conn = _get_conn()
    row = conn.execute("""
        SELECT * FROM downloaded_episode
        WHERE anime_id = ? AND episode_number = ?
        ORDER BY downloaded_at DESC LIMIT 1
    """, (anime_id, float(ep_num))).fetchone()
    if row:
        return dict(row)
    return None


def get_library():
    """Return all anime that have at least 1 downloaded episode, with episode count.
    Deduplicates by title — prefers entries with cover_url (from AllAnime) over disk-scanned entries."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT a.*, COUNT(de.id) as downloaded_count
        FROM anime a
        INNER JOIN downloaded_episode de ON de.anime_id = a.id
        GROUP BY a.id
        ORDER BY a.title
    """).fetchall()

    # Deduplicate by normalized title — keep the one with the most metadata (cover_url)
    import re
    def _normalize(t):
        """Normalize title for dedup: lowercase, strip punctuation, collapse spaces."""
        t = (t or "").lower().strip()
        t = re.sub(r'[^a-z0-9\s]', '', t)  # remove all non-alphanumeric
        t = re.sub(r'\s+', ' ', t).strip()  # collapse whitespace
        return t

    seen_titles = {}
    for row in rows:
        item = dict(row)
        for field in ("genres", "languages"):
            val = item.get(field)
            if val and isinstance(val, str):
                try:
                    item[field] = json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    pass
        norm_key = _normalize(item.get("title"))
        existing = seen_titles.get(norm_key)
        if existing is None:
            seen_titles[norm_key] = item
        else:
            # Prefer entry with cover_url, or with more downloaded episodes
            if item.get("cover_url") and not existing.get("cover_url"):
                item["downloaded_count"] = existing["downloaded_count"] + item["downloaded_count"]
                seen_titles[norm_key] = item
            else:
                existing["downloaded_count"] = existing["downloaded_count"] + item["downloaded_count"]

    return list(seen_titles.values())


def get_anime_detail(anime_id):
    """Get anime metadata plus all its downloaded episodes."""
    conn = _get_conn()
    anime_row = conn.execute("SELECT * FROM anime WHERE id = ?", (anime_id,)).fetchone()
    if not anime_row:
        return None
    anime = dict(anime_row)
    # Parse JSON fields
    for field in ("genres", "languages"):
        val = anime.get(field)
        if val and isinstance(val, str):
            try:
                anime[field] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                pass

    episodes = conn.execute("""
        SELECT * FROM downloaded_episode
        WHERE anime_id = ?
        ORDER BY episode_number
    """, (anime_id,)).fetchall()
    anime["episodes"] = [dict(ep) for ep in episodes]
    return anime


def create_job(anime_id, title, total):
    """Create a download job and return its id."""
    conn = _get_conn()
    cursor = conn.execute("""
        INSERT INTO download_job (anime_id, title, total_episodes)
        VALUES (?, ?, ?)
    """, (anime_id, title, total))
    conn.commit()
    return cursor.lastrowid


def update_job(job_id, **kwargs):
    """Update fields on a download job."""
    conn = _get_conn()
    allowed = {"status", "progress", "completed_episodes", "errors", "current_episode"}
    sets = []
    vals = []
    for key, val in kwargs.items():
        if key not in allowed:
            continue
        if key in ("completed_episodes", "errors") and isinstance(val, (list, tuple)):
            val = json.dumps(val)
        sets.append(f"{key} = ?")
        vals.append(val)
    if not sets:
        return
    sets.append("updated_at = CURRENT_TIMESTAMP")
    vals.append(job_id)
    conn.execute(f"UPDATE download_job SET {', '.join(sets)} WHERE id = ?", vals)
    conn.commit()


def get_job(job_id):
    """Return a single download job."""
    conn = _get_conn()
    row = conn.execute("SELECT * FROM download_job WHERE id = ?", (job_id,)).fetchone()
    if not row:
        return None
    return _parse_job(dict(row))


def get_all_jobs():
    """Return all download jobs."""
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM download_job ORDER BY created_at DESC").fetchall()
    return [_parse_job(dict(row)) for row in rows]


def _parse_job(job):
    """Parse JSON fields in a job dict."""
    for field in ("completed_episodes", "errors"):
        val = job.get(field)
        if val and isinstance(val, str):
            try:
                job[field] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                pass
    return job


# ============================================================
# Movie helpers (TamilMV) — completely separate from anime helpers
# ============================================================

def upsert_movie(data: dict) -> None:
    """Insert or update a movie by id."""
    conn = _get_conn()
    movie_id = data.get("id")
    if not movie_id:
        raise ValueError("movie data must include 'id'")

    languages = data.get("languages")
    if isinstance(languages, (list, tuple)):
        languages = json.dumps(languages)
    resolutions = data.get("resolutions")
    if isinstance(resolutions, (list, tuple)):
        resolutions = json.dumps(resolutions)

    conn.execute("""
        INSERT INTO movie (id, title, year, languages, quality_tag, resolutions, file_size, has_esub, topic_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = COALESCE(excluded.title, movie.title),
            year = COALESCE(excluded.year, movie.year),
            languages = COALESCE(excluded.languages, movie.languages),
            quality_tag = COALESCE(excluded.quality_tag, movie.quality_tag),
            resolutions = COALESCE(excluded.resolutions, movie.resolutions),
            file_size = COALESCE(excluded.file_size, movie.file_size),
            has_esub = COALESCE(excluded.has_esub, movie.has_esub),
            topic_url = COALESCE(excluded.topic_url, movie.topic_url)
    """, (
        movie_id,
        data.get("title", "Unknown"),
        data.get("year"),
        languages,
        data.get("quality_tag"),
        resolutions,
        data.get("file_size"),
        1 if data.get("has_esub") else 0,
        data.get("topic_url"),
    ))
    conn.commit()


def get_movie_library() -> list[dict]:
    """Get all movies."""
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM movie ORDER BY created_at DESC").fetchall()
    results = []
    for row in rows:
        item = dict(row)
        for field in ("languages", "resolutions"):
            val = item.get(field)
            if val and isinstance(val, str):
                try:
                    item[field] = json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    pass
        results.append(item)
    return results


def create_movie_job(movie_id, title, magnet_url, language=None, resolution=None, save_path=None) -> int:
    """Create a movie download job and return its id."""
    conn = _get_conn()
    cursor = conn.execute("""
        INSERT INTO movie_download_job (movie_id, title, magnet_url, language, resolution, save_path)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (movie_id, title, magnet_url, language, resolution, save_path))
    conn.commit()
    return cursor.lastrowid


def update_movie_job(job_id, **kwargs) -> None:
    """Update fields on a movie download job."""
    conn = _get_conn()
    allowed = {"status", "progress", "torrent_hash"}
    sets = []
    vals = []
    for key, val in kwargs.items():
        if key not in allowed:
            continue
        sets.append(f"{key} = ?")
        vals.append(val)
    if not sets:
        return
    sets.append("updated_at = CURRENT_TIMESTAMP")
    vals.append(job_id)
    conn.execute(f"UPDATE movie_download_job SET {', '.join(sets)} WHERE id = ?", vals)
    conn.commit()


def get_movie_job(job_id) -> dict:
    """Get a single movie download job."""
    conn = _get_conn()
    row = conn.execute("SELECT * FROM movie_download_job WHERE id = ?", (job_id,)).fetchone()
    if not row:
        return None
    return dict(row)


def get_all_movie_jobs() -> list[dict]:
    """Get all movie download jobs."""
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM movie_download_job ORDER BY created_at DESC").fetchall()
    return [dict(row) for row in rows]
