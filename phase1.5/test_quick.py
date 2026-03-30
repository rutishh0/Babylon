"""Quick test — search for Solo Leveling and list episodes."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from babylon_anime import search, get_episodes, get_stream
from babylon_anime.models import LanguageType

def main():
    print("=== Searching for 'Solo Leveling' ===")
    results = search("Solo Leveling")

    if not results:
        print("No results found!")
        return

    for i, r in enumerate(results[:5]):
        langs = ", ".join(l.value for l in r.languages)
        print(f"  [{i}] {r.title} ({r.year}) [{langs}] — {r.episode_count} eps")

    # Pick the first result
    anime = results[0]
    print(f"\n=== Episodes for: {anime.title} ===")
    episodes = get_episodes(anime)

    if not episodes:
        print("No episodes found!")
        return

    for ep in episodes[:5]:
        print(f"  Episode {ep.number}")
    print(f"  ... ({len(episodes)} total)")

    # Get stream for episode 1
    ep1 = episodes[0]
    print(f"\n=== Streams for Episode {ep1.number} ===")
    stream = get_stream(ep1, quality="best")

    if stream:
        print(f"  URL: {stream.url[:80]}...")
        print(f"  Quality: {stream.quality}")
        print(f"  Format: {stream.format}")
        print(f"  Provider: {stream.provider_name}")
        print(f"  Subtitles: {len(stream.subtitles)}")
    else:
        print("  No streams found!")


if __name__ == "__main__":
    main()
