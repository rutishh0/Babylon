"""Test: Scrape a topic page for magnet link variants."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from scraper import browse_forum, get_variants, FORUMS


def test_variants_from_first_result():
    """Get variants from the first topic in Tamil Web-HD forum."""
    # First, get a topic URL dynamically
    results = browse_forum(FORUMS["tamil"]["webhd"], page=1)
    assert len(results) > 0, "No results from browse to test variants"

    topic_url = results[0]["topic_url"]
    topic_title = results[0]["title"]
    print(f"\n=== Variants for: {topic_title[:60]}... ===")
    print(f"    URL: {topic_url}\n")

    variants = get_variants(topic_url)
    print(f"    Found {len(variants)} variants:\n")
    for v in variants:
        print(f"    • {v['label']}")
        print(f"      Magnet: {v['magnet_url'][:60]}...")
        print(f"      Resolution: {v['resolution']}, Size: {v['file_size']}")
        print()

    assert len(variants) >= 1, f"Expected at least 1 variant, got {len(variants)}"
    for v in variants:
        assert v["magnet_url"].startswith("magnet:?"), f"Bad magnet: {v['magnet_url'][:50]}"

    print("PASS: test_variants_from_first_result passed")


if __name__ == "__main__":
    test_variants_from_first_result()
    print("\nPASS: All variant tests passed!")
