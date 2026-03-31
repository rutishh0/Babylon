"""Phase 1.5 — Disk scanner for the Babylon media library."""

import os
import re
import logging

import db

logger = logging.getLogger(__name__)


def scan_media_directory(media_path):
    """Scan media_path for downloaded anime. Returns list of found anime."""
    found = []
    if not os.path.isdir(media_path):
        return found

    for dirname in os.listdir(media_path):
        dirpath = os.path.join(media_path, dirname)
        if not os.path.isdir(dirpath):
            continue

        episodes = []
        for filename in os.listdir(dirpath):
            filepath = os.path.join(dirpath, filename)
            if not os.path.isfile(filepath):
                continue
            if not filename.lower().endswith(('.mp4', '.ts', '.mkv')):
                continue

            # Parse episode number from "Title - E01.mp4" pattern
            match = re.search(r'E(\d+)', filename)
            if match:
                ep_num = float(match.group(1))
                episodes.append({
                    'number': ep_num,
                    'path': filepath,
                    'size': os.path.getsize(filepath),
                    'filename': filename,
                })

        if episodes:
            found.append({
                'title': dirname,
                'directory': dirpath,
                'episodes': sorted(episodes, key=lambda e: e['number']),
            })

    return found


def reconcile_with_db(media_path):
    """Scan disk and insert any episodes missing from the database."""
    scanned = scan_media_directory(media_path)
    added_count = 0
    for anime in scanned:
        # We don't have the AllAnime ID from disk, so use title as fallback ID
        anime_id = anime['title']
        db.upsert_anime({
            'id': anime_id,
            'title': anime['title'],
        })
        for ep in anime['episodes']:
            try:
                db.insert_downloaded_episode(
                    anime_id=anime_id,
                    ep_num=ep['number'],
                    file_path=ep['path'],
                    file_size=ep['size'],
                )
                added_count += 1
            except Exception:
                pass  # Already exists (UNIQUE constraint)
    logger.info("Reconcile: scanned %d anime dirs, added %d new episodes", len(scanned), added_count)
    return scanned
