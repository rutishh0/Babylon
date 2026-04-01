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

from babylon_anime import search as anime_search, get_episodes, get_stream, get_streams, download_episode
from babylon_anime.models import LanguageType, Episode
from babylon_anime.download import download_subtitles

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
            "native_title": r.native_title,
            "provider": r.provider,
            "languages": [l.value for l in r.languages],
            "year": r.year,
            "episode_count": r.episode_count,
            "cover_url": r.cover_url,
            "description": r.description,
            "genres": r.genres,
            "status": r.status,
        } for r in results])
    except Exception as e:
        logger.error("Search error: %s", e)
        return jsonify({"error": str(e)}), 500


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
        logger.error("Episodes error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/stream")
def api_stream():
    anime_id = request.args.get("anime_id", "")
    ep_num = request.args.get("ep", "")
    lang = request.args.get("lang", "sub")
    quality = request.args.get("quality", "best")
    if not anime_id or not ep_num:
        return jsonify({"error": "Parameters 'anime_id' and 'ep' are required"}), 400
    try:
        lang_type = LanguageType.DUB if lang == "dub" else LanguageType.SUB
        episode = Episode(
            anime_id=anime_id,
            number=float(ep_num),
            provider="allanime",
            language=lang_type,
        )
        stream = get_stream(episode, quality=quality)
        if not stream:
            return jsonify({"error": "No streams found"}), 404
        return jsonify({
            "url": stream.url,
            "quality": stream.quality,
            "format": stream.format,
            "referer": stream.referer,
            "provider_name": stream.provider_name,
            "subtitles": [{"url": s.url, "language": s.language} for s in stream.subtitles],
        })
    except Exception as e:
        logger.error("Stream error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/download", methods=["POST"])
def api_download():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    anime_id = data.get("anime_id", "")
    episodes = data.get("episodes", [])  # list of episode numbers
    lang = data.get("lang", "sub")
    quality = data.get("quality", "best")
    output_dir = data.get("output_dir", DEFAULT_OUTPUT)
    anime_title = data.get("title", "anime")

    if not anime_id or not episodes:
        return jsonify({"error": "anime_id and episodes list required"}), 400

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

    # Create DB-backed job
    job_db_id = db.create_job(anime_id, anime_title, len(episodes))

    with _download_lock:
        _job_counter[0] += 1
        job_id = str(_job_counter[0])
        _downloads[job_id] = {
            "status": "starting",
            "progress": 0,
            "total": len(episodes),
            "current": None,
            "completed": [],
            "errors": [],
            "title": anime_title,
            "db_job_id": job_db_id,
        }

    def run_downloads():
        lang_type = LanguageType.DUB if lang == "dub" else LanguageType.SUB
        safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in anime_title).strip()
        dl_dir = os.path.join(output_dir, safe_title)
        os.makedirs(dl_dir, exist_ok=True)

        completed_list = []
        error_list = []

        for i, ep_num in enumerate(episodes):
            with _download_lock:
                _downloads[job_id]["status"] = "downloading"
                _downloads[job_id]["current"] = ep_num
                _downloads[job_id]["progress"] = i

            db.update_job(job_db_id,
                          status="downloading",
                          current_episode=float(ep_num),
                          progress=i)

            try:
                episode = Episode(
                    anime_id=anime_id,
                    number=float(ep_num),
                    provider="allanime",
                    language=lang_type,
                )
                stream = get_stream(episode, quality=quality)
                if not stream:
                    err_msg = f"Ep {ep_num}: no streams"
                    error_list.append(err_msg)
                    with _download_lock:
                        _downloads[job_id]["errors"].append(err_msg)
                    db.update_job(job_db_id, errors=error_list)
                    continue

                ext = "ts" if stream.format == "m3u8" else "mp4"
                filename = f"{safe_title} - E{int(ep_num):02d}.{ext}"
                filepath = os.path.join(dl_dir, filename)

                success = download_episode(stream, filepath)
                if success:
                    # Download subtitles too
                    if stream.subtitles:
                        sub_dir = os.path.join(dl_dir, "subs")
                        download_subtitles(stream, sub_dir)

                    completed_list.append(ep_num)
                    with _download_lock:
                        _downloads[job_id]["completed"].append(ep_num)

                    # Record downloaded episode in DB
                    file_size = os.path.getsize(filepath) if os.path.isfile(filepath) else None
                    try:
                        db.insert_downloaded_episode(
                            anime_id=anime_id,
                            ep_num=float(ep_num),
                            file_path=filepath,
                            file_size=file_size,
                            language=lang,
                            quality=quality,
                        )
                    except Exception:
                        pass  # UNIQUE constraint — already recorded

                    db.update_job(job_db_id,
                                  completed_episodes=completed_list,
                                  progress=i + 1)
                else:
                    err_msg = f"Ep {ep_num}: download failed"
                    error_list.append(err_msg)
                    with _download_lock:
                        _downloads[job_id]["errors"].append(err_msg)
                    db.update_job(job_db_id, errors=error_list)

            except Exception as e:
                logger.error("Download error ep %s: %s", ep_num, e)
                err_msg = f"Ep {ep_num}: {str(e)}"
                error_list.append(err_msg)
                with _download_lock:
                    _downloads[job_id]["errors"].append(err_msg)
                db.update_job(job_db_id, errors=error_list)

        with _download_lock:
            _downloads[job_id]["status"] = "complete"
            _downloads[job_id]["progress"] = len(episodes)

        db.update_job(job_db_id,
                      status="complete",
                      progress=len(episodes),
                      completed_episodes=completed_list,
                      errors=error_list)

    thread = threading.Thread(target=run_downloads, daemon=True)
    thread.start()

    return jsonify({"job_id": job_id, "db_job_id": job_db_id, "message": f"Started downloading {len(episodes)} episodes"})


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

                resp = app.response_class(generate(), status=206, mimetype='video/mp4')
                resp.headers['Content-Range'] = f'bytes {start}-{end}/{file_size}'
                resp.headers['Accept-Ranges'] = 'bytes'
                resp.headers['Content-Length'] = length
                return resp

        return send_file(file_path, mimetype='video/mp4', conditional=True)
    except Exception as e:
        logger.error("Stream error: %s", e)
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
library.reconcile_with_db(media_path)


if __name__ == "__main__":
    os.makedirs(DEFAULT_OUTPUT, exist_ok=True)
    print("\n  Phase 1.5 server running at http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
