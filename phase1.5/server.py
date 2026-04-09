"""Phase 1.5 — Simple Flask server for anime search/stream/download."""

import os
import re
import sys
import json
import threading
import logging
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS

# Add parent to path for babylon_anime import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from babylon_anime import search as anime_search, get_episodes, get_show, consumet_health_check
from babylon_anime.models import LanguageType, Episode

import nyaa_search
from qbt_client import QBittorrentClient

import requests as http_requests  # avoid conflict with flask.request
import db
import library

app = Flask(__name__, static_folder="web", static_url_path="")
CORS(app, origins=["http://localhost:3001", "http://192.168.1.140:3001"])
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Download tracking
_downloads = {}  # job_id -> {status, progress, total, current, errors}
_download_lock = threading.Lock()
_job_counter = [0]

DEFAULT_OUTPUT = os.environ.get("DOWNLOAD_OUTPUT", "B:/Babylon/media")


@app.route("/")
def index():
    return send_from_directory("web", "index.html")


@app.route("/api/health")
def api_health():
    qbt_ok = False
    try:
        qbt = QBittorrentClient()
        qbt_ok = qbt.login()
    except Exception:
        pass
    return jsonify({
        "status": "ok",
        "search": "anilist",
        "downloads": "nyaa+qbittorrent" if qbt_ok else "qbittorrent_offline",
    })


@app.route("/api/search")
def api_search():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"error": "Query parameter 'q' is required"}), 400
    try:
        results = anime_search(q)
        return jsonify([{
            "id": r.id,
            "title": r.title,
            "native_title": getattr(r, "native_title", None),
            "provider": r.provider,
            "languages": [l.value for l in r.languages] if r.languages else ["sub"],
            "year": r.year,
            "episode_count": r.episode_count,
            "cover_url": r.cover_url,
            "description": r.description,
            "genres": r.genres or [],
            "status": r.status,
        } for r in results])
    except Exception as e:
        logger.error("Search error: %s", e)
        return jsonify({"error": "Search is currently unavailable. Please try again later."}), 503


@app.route("/api/episodes")
def api_episodes():
    anime_id = request.args.get("id", "")
    lang = request.args.get("lang", "sub")
    if not anime_id:
        return jsonify({"error": "Parameter 'id' is required"}), 400
    try:
        lang_type = LanguageType.DUB if lang == "dub" else LanguageType.SUB
        episodes = get_episodes(anime_id, lang=lang_type)
        return jsonify([{
            "anime_id": ep.anime_id,
            "number": ep.number,
            "provider": ep.provider,
            "language": ep.language.value,
        } for ep in episodes])
    except Exception as e:
        logger.warning("Online episodes failed (%s), falling back to local DB", e)
        # Fall back to locally downloaded episodes from the database
        try:
            detail = db.get_anime_detail(anime_id)
            if detail and detail.get("episodes"):
                return jsonify([{
                    "anime_id": anime_id,
                    "number": ep["episode_number"],
                    "provider": "local",
                    "language": ep.get("language", "sub"),
                } for ep in detail["episodes"]])
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@app.route("/api/nyaa/search")
def api_nyaa_search():
    """Search Nyaa for anime torrents."""
    q = request.args.get("q", "").strip()
    batch = request.args.get("batch", "false").lower() == "true"
    if not q:
        return jsonify({"error": "Query parameter 'q' is required"}), 400
    try:
        results = nyaa_search.search_nyaa(q, batch_only=batch)
        return jsonify([{
            "title": r.title,
            "magnet": r.magnet,
            "seeders": r.seeders,
            "size": r.size,
        } for r in results[:20]])
    except Exception as e:
        logger.error("Nyaa search error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/stream")
def api_stream():
    anime_id = request.args.get("anime_id", "")
    ep_num = request.args.get("ep", "")
    lang = request.args.get("lang", "sub")
    title = request.args.get("title", "")
    if not anime_id or not ep_num:
        return jsonify({"error": "Parameters 'anime_id' and 'ep' are required"}), 400
    try:
        # Get show title from AniList if not provided
        if not title:
            show = get_show(anime_id)
            title = show["title"] if show else anime_id

        resolved = resolve_episode(title, int(float(ep_num)), dub=(lang == "dub"))
        if not resolved:
            return jsonify({"error": "No streams found from any provider"}), 404
        return jsonify({
            "url": resolved["url"],
            "quality": resolved.get("quality", "auto"),
            "format": resolved.get("format", "m3u8"),
            "referer": resolved.get("referer", ""),
            "provider_name": resolved.get("provider", "unknown"),
            "subtitles": [{"url": s.get("url", ""), "language": s.get("lang", "")} for s in resolved.get("subtitles", [])],
        })
    except Exception as e:
        logger.error("Stream error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/download", methods=["POST"])
def api_download():
    """Download anime via Nyaa torrents + qBittorrent.

    Searches Nyaa for the best batch torrent and adds it to qBittorrent.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    anime_id = data.get("anime_id", "")
    anime_title = data.get("title", "anime")

    if not anime_id or not anime_title:
        return jsonify({"error": "anime_id and title required"}), 400

    # Persist anime metadata to DB
    db.upsert_anime({
        "id": anime_id,
        "title": anime_title,
        "cover_url": data.get("cover_url"),
        "description": data.get("description"),
        "genres": data.get("genres"),
        "year": data.get("year"),
        "episode_count": data.get("episode_count"),
        "status": data.get("status"),
    })

    # Search Nyaa for the best batch torrent
    result = nyaa_search.find_best_batch(anime_title)
    if not result:
        return jsonify({"error": f"No torrents found on Nyaa for '{anime_title}'"}), 404

    # Set up save path
    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in anime_title).strip()
    save_path = os.path.join(DEFAULT_OUTPUT, safe_title)
    os.makedirs(save_path, exist_ok=True)

    # Add to qBittorrent
    try:
        qbt = QBittorrentClient()
        if not qbt.login():
            return jsonify({"error": "Failed to connect to qBittorrent"}), 500

        torrent_hash = qbt.add_magnet(result.magnet, save_path=save_path)
    except Exception as e:
        logger.error("qBittorrent error: %s", e)
        return jsonify({"error": f"qBittorrent error: {e}"}), 500

    # Create DB-backed job
    episode_count = data.get("episode_count") or 1
    job_db_id = db.create_job(anime_id, anime_title, episode_count)
    db.update_job(job_db_id, status="downloading", progress=0)

    with _download_lock:
        _job_counter[0] += 1
        job_id = str(_job_counter[0])
        _downloads[job_id] = {
            "status": "downloading",
            "progress": 0,
            "total": episode_count,
            "current": None,
            "completed": [],
            "errors": [],
            "title": anime_title,
            "db_job_id": job_db_id,
            "torrent_hash": torrent_hash,
            "nyaa_title": result.title,
            "nyaa_size": result.size,
            "nyaa_seeders": result.seeders,
        }

    # Background thread to monitor torrent progress
    def poll_torrent():
        import time
        while True:
            try:
                info = qbt.get_torrent_info(torrent_hash)
                if not info:
                    time.sleep(5)
                    continue

                progress_raw = info.get("progress", 0)
                progress_pct = int(progress_raw * 100)  # int 0-100 for Android
                state = info.get("state", "")

                with _download_lock:
                    _downloads[job_id]["progress"] = progress_pct
                    _downloads[job_id]["status"] = "downloading" if progress_raw < 1.0 else "complete"

                db.update_job(job_db_id, progress=int(progress_raw * episode_count))

                if progress_raw >= 1.0 or state in ("uploading", "pausedUP", "stalledUP"):
                    with _download_lock:
                        _downloads[job_id]["status"] = "complete"
                        _downloads[job_id]["progress"] = 100
                    db.update_job(job_db_id, status="complete", progress=episode_count)

                    # Register downloaded files in the library
                    try:
                        files = qbt.get_files(torrent_hash)
                        video_exts = (".mp4", ".mkv", ".ts", ".avi")
                        ep_num = 0
                        for f in sorted(files, key=lambda x: x.get("name", "")):
                            name = f.get("name", "")
                            if any(name.lower().endswith(ext) for ext in video_exts):
                                ep_num += 1
                                filepath = os.path.join(save_path, name)
                                file_size = f.get("size")
                                try:
                                    db.insert_downloaded_episode(
                                        anime_id=anime_id,
                                        ep_num=float(ep_num),
                                        file_path=filepath,
                                        file_size=file_size,
                                        language="sub",
                                        quality="1080p",
                                    )
                                except Exception:
                                    pass
                    except Exception as e:
                        logger.error("Error registering files: %s", e)

                    logger.info("Download complete: %s", anime_title)
                    break

                if state in ("error", "missingFiles"):
                    with _download_lock:
                        _downloads[job_id]["status"] = "error"
                        _downloads[job_id]["errors"].append(f"Torrent error: {state}")
                    db.update_job(job_db_id, status="error")
                    break

                time.sleep(5)
            except Exception as e:
                logger.error("Torrent poll error: %s", e)
                time.sleep(10)

    thread = threading.Thread(target=poll_torrent, daemon=True)
    thread.start()

    return jsonify({
        "job_id": job_id,
        "db_job_id": job_db_id,
        "torrent_hash": torrent_hash,
        "nyaa_title": result.title,
        "nyaa_size": result.size,
        "nyaa_seeders": result.seeders,
        "message": f"Added torrent: {result.title} ({result.size}, {result.seeders} seeders)",
    })


@app.route("/api/download/status")
def api_download_status():
    job_id = request.args.get("job_id")
    if job_id:
        job = _downloads.get(job_id)
        if job:
            return jsonify(job)
        # Fall back to DB (e.g. after server restart)
        db_job = db.get_job(int(job_id)) if job_id.isdigit() else None
        if db_job:
            return jsonify(db_job)
        return jsonify({"error": "Job not found"}), 404
    # Return in-memory jobs, or fall back to DB if empty (server restarted)
    if _downloads:
        return jsonify(_downloads)
    all_jobs = db.get_all_jobs()
    return jsonify({str(j["id"]): j for j in all_jobs})


@app.route("/api/library")
def api_library():
    """List all downloaded anime with episode counts."""
    try:
        items = db.get_library()
        return jsonify(items)
    except Exception as e:
        logger.error("Library error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/library/<path:anime_id>")
def api_library_detail(anime_id):
    """Get anime detail with downloaded episodes."""
    try:
        detail = db.get_anime_detail(anime_id)
        if not detail:
            return jsonify({"error": "Not found"}), 404
        return jsonify(detail)
    except Exception as e:
        logger.error("Library detail error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/library/<path:anime_id>/stream/<ep_num>")
def api_library_stream(anime_id, ep_num):
    """Stream a downloaded episode file with Range header support."""
    try:
        ep = db.get_downloaded_episode(anime_id, float(ep_num))
        if not ep or not os.path.isfile(ep['file_path']):
            return jsonify({"error": "Episode not found"}), 404

        file_path = ep['file_path']
        file_size = os.path.getsize(file_path)

        # Detect correct MIME type from file extension
        _mime_map = {
            '.mkv': 'video/x-matroska',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.ts': 'video/mp2t',
            '.webm': 'video/webm',
        }
        mime_type = _mime_map.get(os.path.splitext(file_path)[1].lower(), 'application/octet-stream')

        range_header = request.headers.get('Range')
        if range_header:
            match = re.match(r'bytes=(\d+)-(\d*)', range_header)
            if match:
                start = int(match.group(1))
                end = int(match.group(2)) if match.group(2) else file_size - 1
                if start >= file_size:
                    return '', 416
                length = end - start + 1

                def generate():
                    with open(file_path, 'rb') as f:
                        f.seek(start)
                        remaining = length
                        while remaining > 0:
                            chunk = f.read(min(8192, remaining))
                            if not chunk:
                                break
                            remaining -= len(chunk)
                            yield chunk

                resp = app.response_class(generate(), status=206, mimetype=mime_type)
                resp.headers['Content-Range'] = f'bytes {start}-{end}/{file_size}'
                resp.headers['Accept-Ranges'] = 'bytes'
                resp.headers['Content-Length'] = length
                return resp

        return send_file(file_path, mimetype=mime_type, conditional=True)
    except Exception as e:
        logger.error("Stream error: %s", e)
        return jsonify({"error": str(e)}), 500


# ============================================================
# Discovery routes (Jikan/MAL proxy) — anime trending/popular/seasonal
# ============================================================

JIKAN_BASE = "https://api.jikan.moe/v4"
_jikan_cache = {}  # simple in-memory cache: key -> (timestamp, data)
JIKAN_CACHE_TTL = 300  # 5 minutes

def _jikan_get(path: str) -> dict:
    """Fetch from Jikan with simple caching."""
    import time
    now = time.time()
    if path in _jikan_cache:
        ts, data = _jikan_cache[path]
        if now - ts < JIKAN_CACHE_TTL:
            return data
    try:
        resp = http_requests.get(f"{JIKAN_BASE}{path}", timeout=15)
        resp.raise_for_status()
        data = resp.json()
        _jikan_cache[path] = (now, data)
        return data
    except Exception as e:
        logger.error("Jikan API error: %s", e)
        # Return cached data if available (stale is better than nothing)
        if path in _jikan_cache:
            return _jikan_cache[path][1]
        return {"data": []}


DONGHUA_STUDIOS = {
    "bilibili", "tencent penguin pictures", "haoliners animation league",
    "colored pencil animation", "b.cmay pictures", "sparkly key animation studio",
    "pb animation", "shenying animation", "cg year", "nice boat animation",
    "garden culture", "lingsanwu animation", "wolf smoke animation",
}

def _is_japanese_anime(item: dict) -> bool:
    """Filter out Chinese donghua and non-Japanese animation."""
    # Check producers/studios for known Chinese animation companies
    for field in ("studios", "producers", "licensors"):
        for entry in item.get(field, []):
            name = entry.get("name", "").lower()
            if name in DONGHUA_STUDIOS:
                return False
    # Chinese donghua often has no Japanese title
    if item.get("title_japanese") is None and item.get("type") in ("ONA", "TV"):
        # Check if any genre/theme hints at donghua
        all_tags = [g.get("name", "").lower() for g in item.get("genres", []) + item.get("themes", []) + item.get("demographics", [])]
        if not any(d in all_tags for d in ("shounen", "shoujo", "seinen", "josei", "kids")):
            return False
    return True


def _format_jikan_anime(items: list, filter_japanese: bool = True) -> list:
    """Convert Jikan anime objects to our standard format."""
    results = []
    for item in items:
        entry = item.get("entry", item)  # handle both direct and nested formats
        if filter_japanese and not _is_japanese_anime(entry):
            continue
        images = entry.get("images", {}).get("jpg", {})
        results.append({
            "id": f"mal:{entry.get('mal_id', '')}",
            "title": entry.get("title_english") or entry.get("title", ""),
            "native_title": entry.get("title_japanese") or entry.get("title", ""),
            "cover_url": images.get("large_image_url") or images.get("image_url"),
            "year": entry.get("year"),
            "episode_count": entry.get("episodes"),
            "status": entry.get("status"),
            "description": (entry.get("synopsis") or "")[:300],
            "genres": [g.get("name", "") for g in entry.get("genres", [])],
            "score": entry.get("score"),
            "languages": ["sub"],
            "source": "jikan",
        })
        if len(results) >= 25:
            break
    return results


@app.route("/api/discover/trending")
def api_discover_trending():
    """Top airing Japanese anime (trending). Filters out donghua."""
    try:
        data = _jikan_get("/top/anime?filter=airing&limit=25&sfw=true")
        return jsonify(_format_jikan_anime(data.get("data", [])))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/discover/popular")
def api_discover_popular():
    """Most popular Japanese anime of all time."""
    try:
        data = _jikan_get("/top/anime?filter=bypopularity&limit=25&sfw=true")
        return jsonify(_format_jikan_anime(data.get("data", [])))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/discover/seasonal")
def api_discover_seasonal():
    """Current season anime (Japanese only)."""
    try:
        data = _jikan_get("/seasons/now?limit=25&sfw=true")
        return jsonify(_format_jikan_anime(data.get("data", [])))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/discover/upcoming")
def api_discover_upcoming():
    """Upcoming anime (Japanese only)."""
    try:
        data = _jikan_get("/seasons/upcoming?limit=25&sfw=true")
        return jsonify(_format_jikan_anime(data.get("data", [])))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/discover/recommended")
def api_discover_recommended():
    """Personalized recommendations based on the user's library genres.

    Looks at downloaded anime genres, finds top-rated anime in those genres.
    """
    try:
        library = db.get_library()
        if not library:
            # No library = no personalization, return popular instead
            data = _jikan_get("/top/anime?filter=bypopularity&limit=15&sfw=true")
            return jsonify(_format_jikan_anime(data.get("data", [])))

        # Collect genres from library
        genre_counts = {}
        for item in library:
            genres_raw = item.get("genres", "[]")
            if isinstance(genres_raw, str):
                try:
                    genres = json.loads(genres_raw)
                except (json.JSONDecodeError, TypeError):
                    genres = []
            else:
                genres = genres_raw or []
            for g in genres:
                genre_counts[g] = genre_counts.get(g, 0) + 1

        # Top 3 genres from library
        top_genres = sorted(genre_counts, key=genre_counts.get, reverse=True)[:3]
        if not top_genres:
            data = _jikan_get("/top/anime?filter=bypopularity&limit=15&sfw=true")
            return jsonify(_format_jikan_anime(data.get("data", [])))

        # Jikan genre IDs (partial mapping of common anime genres)
        GENRE_IDS = {
            "Action": 1, "Adventure": 2, "Comedy": 4, "Drama": 8,
            "Fantasy": 10, "Horror": 14, "Mystery": 7, "Romance": 22,
            "Sci-Fi": 24, "Slice of Life": 36, "Sports": 30,
            "Supernatural": 37, "Thriller": 41, "Music": 19,
        }

        all_recs = []
        seen_ids = set()
        # Also exclude anime already in library
        library_titles = {item.get("title", "").lower() for item in library}

        for genre_name in top_genres:
            genre_id = GENRE_IDS.get(genre_name)
            if not genre_id:
                continue
            data = _jikan_get(f"/anime?genres={genre_id}&order_by=score&sort=desc&limit=15&sfw=true")
            for item in _format_jikan_anime(data.get("data", []), filter_japanese=True):
                if item["id"] not in seen_ids and item["title"].lower() not in library_titles:
                    seen_ids.add(item["id"])
                    all_recs.append(item)

        return jsonify(all_recs[:25])
    except Exception as e:
        logger.error("Recommendations error: %s", e)
        return jsonify({"error": str(e)}), 500


# ============================================================
# Movie routes (TamilMV) — completely separate from anime routes
# ============================================================

@app.route("/api/movies/browse")
def api_movies_browse():
    """Browse a TamilMV forum page."""
    language = request.args.get("language", "tamil")
    forum_type = request.args.get("forum_type", "webhd")
    page = int(request.args.get("page", "1"))

    from tamilmv_scraper import browse_forum, FORUMS
    forums = FORUMS.get(language.lower(), {})
    forum_id = forums.get(forum_type)
    if not forum_id:
        return jsonify({"error": f"Unknown language/forum_type: {language}/{forum_type}"}), 400

    results = browse_forum(forum_id, page=page)
    return jsonify(results)


@app.route("/api/movies/search")
def api_movies_search():
    """Search TamilMV by title."""
    q = request.args.get("q", "").strip()
    language = request.args.get("language", None)
    if not q:
        return jsonify({"error": "Query parameter 'q' is required"}), 400

    from tamilmv_scraper import search_movies
    results = search_movies(q, language=language)
    return jsonify(results)


@app.route("/api/movies/variants")
def api_movies_variants():
    """Get magnet link variants for a topic."""
    topic_url = request.args.get("topic_url", "").strip()
    if not topic_url:
        return jsonify({"error": "Parameter 'topic_url' is required"}), 400

    from tamilmv_scraper import get_variants
    variants = get_variants(topic_url)
    return jsonify(variants)


@app.route("/api/movies/download", methods=["POST"])
def api_movies_download():
    """Start a movie download via qBittorrent."""
    data = request.get_json()
    if not data or not data.get("magnet_url"):
        return jsonify({"error": "magnet_url is required"}), 400

    magnet_url = data["magnet_url"]
    title = data.get("title", "Unknown Movie")
    year = data.get("year")
    language = data.get("language")
    resolution = data.get("resolution")
    languages = data.get("languages", [])
    quality_tag = data.get("quality_tag")
    topic_url = data.get("topic_url")

    # Generate a movie ID from title+year
    import hashlib
    movie_id = hashlib.md5(f"{title}_{year}".encode()).hexdigest()[:12]

    # Persist movie metadata
    db.upsert_movie({
        "id": movie_id,
        "title": title,
        "year": year,
        "languages": json.dumps(languages) if isinstance(languages, list) else languages,
        "quality_tag": quality_tag,
        "topic_url": topic_url,
    })

    save_path = os.path.join(DEFAULT_OUTPUT, "movies", title.replace("/", "_"))
    os.makedirs(save_path, exist_ok=True)

    # Create job in DB
    job_id = db.create_movie_job(
        movie_id=movie_id,
        title=title,
        magnet_url=magnet_url,
        language=language,
        resolution=resolution,
        save_path=save_path,
    )

    # Try to add to qBittorrent
    try:
        from qbt_client import QBittorrentClient
        qbt = QBittorrentClient()
        if qbt.login():
            torrent_hash = qbt.add_magnet(magnet_url, save_path=save_path)
            db.update_movie_job(job_id, status="downloading", torrent_hash=torrent_hash)

            # Start background polling thread
            def poll_torrent():
                import time
                while True:
                    try:
                        info = qbt.get_torrent_info(torrent_hash)
                        if not info:
                            time.sleep(5)
                            continue
                        progress = info.get("progress", 0)
                        state = info.get("state", "")
                        db.update_movie_job(job_id, progress=progress)
                        if progress >= 1.0 or state in ("uploading", "pausedUP", "stalledUP"):
                            db.update_movie_job(job_id, status="complete", progress=1.0)
                            break
                        time.sleep(5)
                    except Exception as e:
                        logger.error("Torrent poll error: %s", e)
                        time.sleep(10)

            t = threading.Thread(target=poll_torrent, daemon=True)
            t.start()

            return jsonify({
                "job_id": job_id,
                "torrent_hash": torrent_hash,
                "message": f"Added '{title}' to qBittorrent",
                "save_path": save_path,
            })
        else:
            db.update_movie_job(job_id, status="error")
            return jsonify({"error": "Failed to connect to qBittorrent"}), 500
    except Exception as e:
        logger.error("qBittorrent error: %s", e)
        db.update_movie_job(job_id, status="error")
        return jsonify({"error": str(e)}), 500


@app.route("/api/movies/download/status")
def api_movies_download_status():
    """Get movie download job status."""
    job_id = request.args.get("job_id")
    try:
        if job_id:
            job = db.get_movie_job(int(job_id))
            if not job:
                return jsonify({"error": "Job not found"}), 404
            return jsonify(dict(job))
        else:
            jobs = db.get_all_movie_jobs()
            return jsonify({str(j["id"]): dict(j) for j in jobs})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/movies/library")
def api_movies_library():
    """List all movies in the library."""
    try:
        movies = db.get_movie_library()
        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Initialize DB and scan disk on startup
db.init_db()
media_path = os.environ.get("DOWNLOAD_OUTPUT", "B:/Babylon/media")
try:
    library.reconcile_with_db(media_path)
except Exception as e:
    logger.warning("Library reconcile failed (non-fatal): %s", e)


if __name__ == "__main__":
    os.makedirs(DEFAULT_OUTPUT, exist_ok=True)
    print("\n  Phase 1.5 server running at http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
