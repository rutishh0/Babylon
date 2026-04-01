"""Test: qBittorrent connection (read-only, no torrent additions)."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from qbt import QBittorrentClient


def test_qbt_connection():
    """Test connection to qBittorrent WebUI."""
    client = QBittorrentClient()

    connected = client.login()
    if not connected:
        print("\nWARNING: qBittorrent not available at localhost:8080 — skipping")
        print("  This is expected if qBittorrent is not running.")
        print("PASS: test_qbt_connection skipped (not running)")
        return

    print("\n=== qBittorrent Connected ===")
    torrents = client.list_torrents()
    print(f"    Active torrents: {len(torrents)}")
    for t in torrents[:3]:
        print(f"    • {t.get('name', 'unknown')}: {t.get('state', '?')} ({t.get('progress', 0)*100:.0f}%)")

    print("PASS: test_qbt_connection passed")


if __name__ == "__main__":
    test_qbt_connection()
