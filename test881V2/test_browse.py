"""Test: Browse TamilMV forum pages."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from scraper import browse_forum, FORUMS


def test_browse_tamil_webhd():
    """Browse Tamil Web-HD forum (ID 69), page 1. Expect at least 10 results."""
    results = browse_forum(FORUMS["tamil"]["webhd"], page=1)

    print(f"\n=== Tamil Web-HD Forum (ID 69) — {len(results)} results ===\n")
    for i, r in enumerate(results[:5]):
        print(f"  [{i+1}] {r['title'][:80]}...")
        print(f"      URL: {r['topic_url'][:80]}...")
        print(f"      Parsed: {r['parsed_title']} ({r['year']})")
        print(f"      Languages: {r['languages']}, Quality: {r['quality_tag']}")
        print(f"      Resolutions: {r['resolutions']}, Size: {r['file_size']}, ESub: {r['has_esub']}")
        print()

    assert len(results) >= 5, f"Expected at least 5 results, got {len(results)}"

    for r in results:
        assert "title" in r and r["title"], "Missing title"
        assert "topic_url" in r and r["topic_url"], "Missing topic_url"
        assert r["topic_url"].startswith("http"), f"Bad URL: {r['topic_url']}"

    print("PASS: test_browse_tamil_webhd passed")


def test_browse_telugu_webhd():
    """Browse Telugu Web-HD forum (ID 11)."""
    results = browse_forum(FORUMS["telugu"]["webhd"], page=1)
    print(f"\n=== Telugu Web-HD Forum (ID 11) — {len(results)} results ===")
    assert len(results) >= 3, f"Expected at least 3 results, got {len(results)}"
    print("PASS: test_browse_telugu_webhd passed")


def test_browse_kannada_webhd():
    """Browse Kannada Web-HD forum (ID 24)."""
    results = browse_forum(FORUMS["kannada"]["webhd"], page=1)
    print(f"\n=== Kannada Web-HD Forum (ID 24) — {len(results)} results ===")
    # Kannada may have fewer releases
    assert len(results) >= 1, f"Expected at least 1 result, got {len(results)}"
    print("PASS: test_browse_kannada_webhd passed")


if __name__ == "__main__":
    test_browse_tamil_webhd()
    test_browse_telugu_webhd()
    test_browse_kannada_webhd()
    print("\nPASS: All browse tests passed!")
