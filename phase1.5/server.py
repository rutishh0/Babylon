"""Phase 1.5 — Simple Flask server for anime search/stream/download."""

import os
import sys
import json
import threading
import logging
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Add parent to path for babylon_anime import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from babylon_anime import search as anime_search, get_episodes, get_stream, get_streams, download_episode
from babylon_anime.models import LanguageType, Episode
from babylon_anime.download import download_subtitles

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
        }

    def run_downloads():
        lang_type = LanguageType.DUB if lang == "dub" else LanguageType.SUB
        safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in anime_title).strip()
        dl_dir = os.path.join(output_dir, safe_title)
        os.makedirs(dl_dir, exist_ok=True)

        for i, ep_num in enumerate(episodes):
            with _download_lock:
                _downloads[job_id]["status"] = "downloading"
                _downloads[job_id]["current"] = ep_num
                _downloads[job_id]["progress"] = i

            try:
                episode = Episode(
                    anime_id=anime_id,
                    number=float(ep_num),
                    provider="allanime",
                    language=lang_type,
                )
                stream = get_stream(episode, quality=quality)
                if not stream:
                    with _download_lock:
                        _downloads[job_id]["errors"].append(f"Ep {ep_num}: no streams")
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
                    with _download_lock:
                        _downloads[job_id]["completed"].append(ep_num)
                else:
                    with _download_lock:
                        _downloads[job_id]["errors"].append(f"Ep {ep_num}: download failed")

            except Exception as e:
                logger.error("Download error ep %s: %s", ep_num, e)
                with _download_lock:
                    _downloads[job_id]["errors"].append(f"Ep {ep_num}: {str(e)}")

        with _download_lock:
            _downloads[job_id]["status"] = "complete"
            _downloads[job_id]["progress"] = len(episodes)

    thread = threading.Thread(target=run_downloads, daemon=True)
    thread.start()

    return jsonify({"job_id": job_id, "message": f"Started downloading {len(episodes)} episodes"})


@app.route("/api/download/status")
def api_download_status():
    job_id = request.args.get("job_id")
    if job_id:
        job = _downloads.get(job_id)
        if not job:
            return jsonify({"error": "Job not found"}), 404
        return jsonify(job)
    return jsonify(_downloads)


if __name__ == "__main__":
    os.makedirs(DEFAULT_OUTPUT, exist_ok=True)
    print("\n  Phase 1.5 server running at http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
