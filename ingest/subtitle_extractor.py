"""
subtitle_extractor.py — extract embedded subtitle tracks from MKV files using FFmpeg.

SubsPlease MKVs always have soft-subs (ASS/SSA format internally).
We extract them to WebVTT (.vtt) so the Babylon player can use them natively
without FFmpeg on the client.

Extraction happens BEFORE transcoding so the .mkv is still intact.
"""

import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def probe_subtitles(mkv_path: str) -> list[dict]:
    """
    Use ffprobe to list all subtitle streams in *mkv_path*.

    Returns a list of dicts:
      { "index": int, "language": str, "codec": str, "title": str }

    *index* is the subtitle stream index (0-based within subtitle streams).
    """
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-select_streams", "s",
        mkv_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=60)
    except subprocess.CalledProcessError as exc:
        logger.error("ffprobe failed on %s: %s", mkv_path, exc.stderr)
        return []
    except subprocess.TimeoutExpired:
        logger.error("ffprobe timed out on %s", mkv_path)
        return []

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        logger.error("ffprobe returned invalid JSON for %s", mkv_path)
        return []

    streams = []
    for i, stream in enumerate(data.get("streams", [])):
        tags = stream.get("tags", {})
        language = tags.get("language") or tags.get("LANGUAGE") or ("eng" if i == 0 else f"sub{i}")
        codec = stream.get("codec_name", "unknown")
        title = tags.get("title") or tags.get("TITLE") or ""
        streams.append({
            "index": i,          # subtitle stream index (for -map 0:s:N)
            "language": language,
            "codec": codec,
            "title": title,
        })

    logger.debug("Found %d subtitle stream(s) in %s", len(streams), mkv_path)
    return streams


def extract_subtitles(mkv_path: str, output_dir: str) -> list[dict]:
    """
    Extract all subtitle streams from *mkv_path* to WebVTT files in *output_dir*.

    Returns a list of dicts:
      { "path": str, "language": str, "format": "vtt" }

    Files are named: <stem>_<language>[_<i>].vtt  (suffix added on duplicates)
    """
    os.makedirs(output_dir, exist_ok=True)
    stem = Path(mkv_path).stem
    streams = probe_subtitles(mkv_path)

    if not streams:
        logger.info("No subtitle streams found in %s", mkv_path)
        return []

    extracted: list[dict] = []
    seen_langs: dict[str, int] = {}  # lang → count, to handle duplicate languages

    for stream in streams:
        lang = stream["language"]
        count = seen_langs.get(lang, 0)
        seen_langs[lang] = count + 1

        if count == 0:
            filename = f"{stem}_{lang}.vtt"
        else:
            filename = f"{stem}_{lang}_{count}.vtt"

        output_path = os.path.join(output_dir, filename)

        cmd = [
            "ffmpeg",
            "-y",                    # overwrite if exists
            "-i", mkv_path,
            "-map", f"0:s:{stream['index']}",
            "-c:s", "webvtt",
            output_path,
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=120)
            logger.info("Extracted subtitle stream %d (%s) → %s", stream["index"], lang, filename)
            extracted.append({
                "path": output_path,
                "language": lang,
                "format": "vtt",
            })
        except subprocess.CalledProcessError as exc:
            logger.error(
                "ffmpeg subtitle extraction failed (stream %d, lang %s): %s",
                stream["index"], lang, exc.stderr[-500:],
            )
        except subprocess.TimeoutExpired:
            logger.error("ffmpeg subtitle extraction timed out for stream %d", stream["index"])

    return extracted
