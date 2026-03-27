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
