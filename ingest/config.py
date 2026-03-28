"""
config.py — reads configuration from environment variables.
All variables are sourced from /opt/babylon/.env (loaded by systemd EnvironmentFile=).
"""
import os


def _require(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise RuntimeError(f"Required environment variable {key!r} is not set")
    return val


def _optional(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


# Local media storage
LOCAL_MEDIA_PATH: str = _require("LOCAL_MEDIA_PATH")

# qBittorrent
QBITTORRENT_HOST: str = _optional("QBITTORRENT_HOST", "http://127.0.0.1:8080")
QBITTORRENT_USER: str = _optional("QBITTORRENT_USER", "admin")
QBITTORRENT_PASS: str = _require("QBITTORRENT_PASS")

# Directories
DOWNLOAD_DIR: str = _optional("DOWNLOAD_DIR", "/downloads/raw")
PROCESSED_DIR: str = _optional("PROCESSED_DIR", "/downloads/processed")
INGEST_STATE_DIR: str = _optional("INGEST_STATE_DIR", "/opt/babylon/ingest")

# API
BABYLON_API_URL: str = _optional("BABYLON_API_URL", "http://127.0.0.1:3000")
BABYLON_PIN: str = _optional("BABYLON_PIN", "")

# Database
DATABASE_URL: str = _optional("DATABASE_URL", "file:///opt/babylon/data/babylon.db")

def get_db_path() -> str:
    """Strip the file:// prefix from DATABASE_URL to get the raw filesystem path."""
    url = DATABASE_URL
    if url.startswith("file://"):
        return url[len("file://"):]
    return url

# Daemon behaviour
INGEST_POLL_INTERVAL: int = int(_optional("INGEST_POLL_INTERVAL", "300"))  # seconds
DISK_PAUSE_THRESHOLD: float = 0.85   # pause when disk > 85 %
DISK_RESUME_THRESHOLD: float = 0.75  # resume when disk < 75 %
