"""End-to-end interactive test: search → variants → (optional) add to qBittorrent."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from scraper import search_movies, get_variants
from qbt import QBittorrentClient


def main():
    print("=" * 60)
    print("  TamilMV Full Pipeline Test (Interactive)")
    print("=" * 60)

    query = input("\nSearch query (default: 'Raja'): ").strip() or "Raja"
    lang = input("Language filter [tamil/telugu/kannada/all] (default: all): ").strip() or None
    if lang == "all":
        lang = None

    print(f"\nSearching for '{query}' (language={lang or 'all'})...")
    results = search_movies(query, language=lang)

    if not results:
        print("No results found. Try a different query.")
        return

    print(f"\nFound {len(results)} results:\n")
    for i, r in enumerate(results[:10]):
        print(f"  [{i+1}] {r['parsed_title']} ({r['year']}) [{', '.join(r['languages'])}] {r['quality_tag'] or ''}")

    choice = input(f"\nSelect a movie [1-{min(len(results), 10)}] (default: 1): ").strip() or "1"
    idx = int(choice) - 1
    selected = results[idx]

    print(f"\nFetching variants for: {selected['parsed_title']}...")
    variants = get_variants(selected["topic_url"])

    if not variants:
        print("No magnet links found for this topic.")
        return

    print(f"\nFound {len(variants)} variants:\n")
    for i, v in enumerate(variants):
        print(f"  [{i+1}] {v['label']}")

    add_to_qbt = input("\nAdd to qBittorrent? [y/N]: ").strip().lower()
    if add_to_qbt != "y":
        print("Skipped. Done.")
        return

    v_choice = input(f"Select variant [1-{len(variants)}] (default: 1): ").strip() or "1"
    variant = variants[int(v_choice) - 1]

    client = QBittorrentClient()
    if not client.login():
        print("Failed to connect to qBittorrent.")
        return

    torrent_hash = client.add_magnet(variant["magnet_url"])
    print(f"\nPASS: Added to qBittorrent! Hash: {torrent_hash}")
    print(f"  Check qBittorrent WebUI at http://localhost:8080")


if __name__ == "__main__":
    main()
