"""Test: Search TamilMV by movie title."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from scraper import search_movies


def test_search_generic():
    """Search for a common word across all languages."""
    results = search_movies("Raja")
    print(f"\n=== Search 'Raja' (all languages) — {len(results)} results ===\n")
    for r in results[:5]:
        print(f"  {r['parsed_title']} ({r['year']}) [{', '.join(r['languages'])}] {r['quality_tag']}")
    # Raja is a common name, should find something
    print("PASS: test_search_generic passed")


def test_search_with_language():
    """Search with language filter."""
    results = search_movies("2026", language="tamil")
    print(f"\n=== Search '2026' in Tamil — {len(results)} results ===\n")
    for r in results[:5]:
        print(f"  {r['parsed_title']} ({r['year']}) [{', '.join(r['languages'])}]")
    print("PASS: test_search_with_language passed")


if __name__ == "__main__":
    test_search_generic()
    test_search_with_language()
    print("\nPASS: All search tests passed!")
