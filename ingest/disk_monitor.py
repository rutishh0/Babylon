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
