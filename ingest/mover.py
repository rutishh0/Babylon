"""
mover.py — Move transcoded files to local media storage.

Replaces uploader.py (S3 upload) in Phase 2.
After FFmpeg transcodes the .mp4, move it to LOCAL_MEDIA_PATH/<relative_path>.
Uses shutil.move() for atomic moves on the same filesystem.
"""

import logging
import os
import shutil

import config

logger = logging.getLogger(__name__)


def move_file(source_path: str, relative_key: str) -> bool:
    """
    Move source_path to LOCAL_MEDIA_PATH/relative_key.
    Creates intermediate directories. Returns True on success, False on failure.
    """
    dest_path = os.path.join(config.LOCAL_MEDIA_PATH, relative_key)

    if not os.path.exists(source_path):
        logger.error("Source file does not exist: %s", source_path)
        return False

    os.makedirs(os.path.dirname(dest_path), exist_ok=True)

    try:
        shutil.move(source_path, dest_path)
        size_mb = os.path.getsize(dest_path) / (1024 * 1024)
        logger.info("Moved %s → %s (%.1f MB)", os.path.basename(source_path), relative_key, size_mb)
        return True
    except (OSError, shutil.Error) as exc:
        logger.error("Failed to move %s → %s: %s", source_path, dest_path, exc)
        return False


def build_episode_path(media_id: str, season: int, episode_num: int, filename: str) -> str:
    """Return the relative path for an anime episode MP4 file (same convention as Phase 1 S3 keys)."""
    return f"anime/{media_id}/s{season}/e{episode_num}/{filename}"


def build_subtitle_path(episode_id: str, language: str, fmt: str = "vtt") -> str:
    """Return the relative path for a subtitle file (same convention as Phase 1 S3 keys)."""
    return f"subtitles/{episode_id}/{language}.{fmt}"
