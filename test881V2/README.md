# TamilMV Scraper — Babylon Test Sandbox

Standalone scraper for 1TamilMV forum (Tamil/Telugu/Kannada movies).

## Prerequisites

```bash
cd test881V2
pip install -r requirements.txt
```

## Tests

Run individual tests (verbose with stdout):

```bash
python -m pytest test_browse.py -v -s
python -m pytest test_search.py -v -s
python -m pytest test_variants.py -v -s
python -m pytest test_qbt.py -v -s
```

Run all automated tests:

```bash
python -m pytest test_browse.py test_search.py test_variants.py test_qbt.py -v -s
```

## Interactive End-to-End Test

```bash
python test_full.py
```

This walks you through: search → select movie → view variants → optionally add to qBittorrent.

## Notes

- `test_qbt.py` requires qBittorrent running at localhost:8080 (skips gracefully if not available)
- `test_full.py` is interactive and not run by pytest
- All scraping tests make live requests to 1TamilMV with 1-2s delays between requests
- Forum IDs are hardcoded based on the current site structure
