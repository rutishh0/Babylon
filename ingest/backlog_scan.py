#!/usr/bin/env python3
"""
backlog_scan.py — Dry-run scan of all watchlist entries against Nyaa.

Reads watchlist.json and runs the batch search for each title,
printing a report. Does NOT queue or download anything.

Usage:
  cd /opt/babylon/ingest && python3 backlog_scan.py
"""

import json
import os
import sys
import time

# Add current dir to path so we can import project modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import rss_poller
import logging

logging.basicConfig(
    level=logging.WARNING,  # Suppress INFO noise, show warnings
    format="%(message)s",
)

WATCHLIST_PATH = os.environ.get(
    "WATCHLIST_PATH",
    os.path.join(os.environ.get("INGEST_STATE_DIR", "/opt/babylon/ingest"), "watchlist.json"),
)


def main():
    if not os.path.exists(WATCHLIST_PATH):
        print(f"ERROR: watchlist not found at {WATCHLIST_PATH}")
        sys.exit(1)

    with open(WATCHLIST_PATH) as f:
        watchlist = json.load(f)

    backlog = [e for e in watchlist if e.get("mode") == "backlog"]
    print(f"Scanning {len(backlog)} backlog entries...\n")
    print(f"{'#':<4} {'TITLE':<50} {'UPLOADER/SOURCE':<20} {'SEEDERS':<8} {'SIZE':<12} {'MAGNET'}")
    print("-" * 130)

    found = 0
    not_found = 0

    for i, entry in enumerate(backlog, 1):
        title = entry["title"]
        aliases = entry.get("aliases", [])

        result = rss_poller.search_nyaa_batch(title, aliases)

        if result:
            found += 1
            # Try to identify uploader from title
            uploader = "unknown"
            for u in ["Judas", "EMBER", "ASW", "SubsPlease", "Erai-raws", "FLE", "INDEX",
                       "DKB", "Yameii", "LoliHouse", "Tsundere-Raws", "ToonsHub"]:
                if u.lower() in result.title.lower() or f"[{u}]" in result.title:
                    uploader = u
                    break

            has_magnet = "yes" if result.magnet_link else "no"
            print(f"{i:<4} {title:<50} {uploader:<20} {result.seeders:<8} {result.size:<12} {has_magnet}")
        else:
            not_found += 1
            print(f"{i:<4} {title:<50} {'NOT FOUND':<20} {'-':<8} {'-':<12} no")

        # Polite delay to avoid hammering Nyaa
        time.sleep(1.5)

    print("-" * 130)
    print(f"\nSummary: {found} found, {not_found} not found, {len(backlog)} total")


if __name__ == "__main__":
    main()
