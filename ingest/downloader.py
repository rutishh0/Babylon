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
