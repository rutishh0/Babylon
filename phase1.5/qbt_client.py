"""Standalone qBittorrent WebUI API client."""

import hashlib
import logging
import requests

logger = logging.getLogger(__name__)


class QBittorrentClient:
    """Minimal qBittorrent WebUI API client."""

    def __init__(self, host="http://127.0.0.1:8080", username="admin", password=""):
        self.host = host.rstrip("/")
        self.username = username
        self.password = password
        self.session = requests.Session()
        self._logged_in = False

    def login(self) -> bool:
        """Authenticate with qBittorrent. Returns True on success."""
        try:
            resp = self.session.post(
                f"{self.host}/api/v2/auth/login",
                data={"username": self.username, "password": self.password},
                timeout=10,
            )
            self._logged_in = resp.status_code == 200 and resp.text == "Ok."
            if self._logged_in:
                logger.info("qBittorrent login successful")
            else:
                logger.warning("qBittorrent login failed: %s %s", resp.status_code, resp.text)
            return self._logged_in
        except Exception as e:
            logger.error("qBittorrent connection error: %s", e)
            return False

    def _ensure_login(self):
        if not self._logged_in:
            if not self.login():
                raise ConnectionError("Not logged in to qBittorrent")

    def add_magnet(self, magnet_url: str, save_path: str = None) -> str:
        """Add a magnet link. Returns the info hash."""
        self._ensure_login()
        data = {"urls": magnet_url}
        if save_path:
            data["savepath"] = save_path
        resp = self.session.post(
            f"{self.host}/api/v2/torrents/add",
            data=data,
            timeout=15,
        )
        resp.raise_for_status()
        # Extract hash from magnet URL
        import re
        match = re.search(r"btih:([a-fA-F0-9]{40})", magnet_url)
        if match:
            return match.group(1).lower()
        # Try base32 hash
        match = re.search(r"btih:([A-Za-z2-7]{32})", magnet_url)
        if match:
            import base64
            return base64.b32decode(match.group(1).upper()).hex()
        return ""

    def get_torrent_info(self, torrent_hash: str) -> dict:
        """Get info for a specific torrent by hash."""
        self._ensure_login()
        resp = self.session.get(
            f"{self.host}/api/v2/torrents/info",
            params={"hashes": torrent_hash},
            timeout=10,
        )
        resp.raise_for_status()
        torrents = resp.json()
        return torrents[0] if torrents else {}

    def get_files(self, torrent_hash: str) -> list:
        """Get file list for a torrent."""
        self._ensure_login()
        resp = self.session.get(
            f"{self.host}/api/v2/torrents/files",
            params={"hash": torrent_hash},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()

    def delete_torrent(self, torrent_hash: str, delete_files: bool = False) -> None:
        """Delete a torrent. Optionally delete downloaded files."""
        self._ensure_login()
        resp = self.session.post(
            f"{self.host}/api/v2/torrents/delete",
            data={
                "hashes": torrent_hash,
                "deleteFiles": "true" if delete_files else "false",
            },
            timeout=10,
        )
        resp.raise_for_status()
        logger.info("Deleted torrent %s (files=%s)", torrent_hash, delete_files)

    def list_torrents(self) -> list:
        """List all torrents."""
        self._ensure_login()
        resp = self.session.get(
            f"{self.host}/api/v2/torrents/info",
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
