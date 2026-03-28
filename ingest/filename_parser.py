"""
filename_parser.py — extract episode numbers from anime filename patterns.

Supported patterns (in priority order):
  1. S01E03        [SubsPlease] Show S01E03 (1080p).mkv  → 3
  2. - NN          [SubsPlease] Show - 03 (1080p).mkv    → 3
  3. Episode NN    Episode 01.mkv                        → 1
  4. ENN           Show E12 [1080p].mkv                  → 12
  5. Bare NN       03.mkv                                → 3

Non-episode files (NCED, NCOP, OVA, Special, PV, Preview, Trailer, Menu, Extra)
are identified by is_non_episode() and skipped during batch processing.
"""

import re
from typing import Optional

# Keywords that indicate non-episode content — checked case-insensitively
_NON_EPISODE_KEYWORDS = [
    "NCED", "NCOP", "OVA", "Special", "PV", "Preview",
    "Trailer", "Menu", "Extra", "Bonus", "CM", "Creditless",
]

# Compiled patterns in priority order
_PATTERNS: list[tuple[str, re.Pattern]] = [
    # S01E03 or S1E03 or S02E11v2 (season + episode, optional version suffix)
    ("SxxExx", re.compile(r'\bS\d{1,2}E(\d{1,3})(?:v\d+)?\b', re.IGNORECASE)),
    # " - 03 " style (SubsPlease standard)
    ("dash_ep", re.compile(r'\s-\s+(\d{1,3})(?:\s|\[|\.mkv|$)')),
    # Episode 01
    ("episode_word", re.compile(r'\bEpisode\s+(\d{1,3})\b', re.IGNORECASE)),
    # E12 (standalone, not preceded by S\d\d or S\d)
    # Use two fixed-width lookbehinds to avoid variable-width restriction (Python < 3.11)
    ("bare_E", re.compile(r'(?<![Ss]\d\d)(?<![Ss]\d)\bE(\d{1,3})\b', re.IGNORECASE)),
    # Bare number: filename is just digits (e.g., "03.mkv")
    ("bare_num", re.compile(r'^(\d{1,3})(?:\s|\.|$)')),
]


def parse_episode(filename: str) -> Optional[int]:
    """
    Return the episode number extracted from *filename*, or None if not found.
    Only the base filename (no directory component) should be passed in.
    """
    # Strip directory component if present
    basename = filename.split("/")[-1].split("\\")[-1]
    # Remove extension for bare-number matching
    stem = re.sub(r'\.[^.]+$', '', basename)

    for _name, pattern in _PATTERNS:
        m = pattern.search(basename if _name != "bare_num" else stem)
        if m:
            return int(m.group(1))
    return None


def is_non_episode(filename: str) -> bool:
    """
    Return True if *filename* looks like a non-episode file
    (creditless OP/ED, OVA, special, PV, etc.) that should be skipped.
    """
    basename = filename.split("/")[-1].split("\\")[-1]
    lower = basename.lower()
    for keyword in _NON_EPISODE_KEYWORDS:
        if keyword.lower() in lower:
            return True
    return False
