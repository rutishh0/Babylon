"""Episode download module — uses yt-dlp for robust HLS/MP4 downloading."""

import json
import logging
import os
import re
import subprocess
from typing import Callable, Optional

import requests

from .models import Episode, Stream

logger = logging.getLogger(__name__)


def download_episode(
    stream: Stream,
    output_path: str,
    progress_callback: Optional[Callable[[float], None]] = None,
    use_ffmpeg: bool = False,
) -> bool:
    """
    Download an episode stream to a file using yt-dlp.

    Args:
        stream: Stream object with URL and format info
        output_path: Where to save the file
        progress_callback: Optional function called with progress 0.0-1.0
        use_ffmpeg: Ignored (yt-dlp handles format selection internally)

    Returns:
        True on success, False on failure
    """
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    return _ytdlp_download(stream.url, output_path, stream.referer, progress_callback)


def download_from_resolved(
    resolved: dict,
    output_path: str,
    progress_callback: Optional[Callable[[float], None]] = None,
) -> bool:
    """Download from a consumet-resolved source dict.

    Args:
        resolved: dict from consumet.resolve_episode() with keys: url, referer, headers
        output_path: Where to save the file
        progress_callback: Optional progress callback

    Returns:
        True on success, False on failure
    """
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    referer = resolved.get("referer", "")
    headers = resolved.get("headers", {})
    return _ytdlp_download(resolved["url"], output_path, referer, progress_callback, headers)


def _ytdlp_download(
    url: str,
    output_path: str,
    referer: str = "",
    progress_callback: Optional[Callable[[float], None]] = None,
    extra_headers: Optional[dict] = None,
) -> bool:
    """Download a stream URL using yt-dlp."""
    cmd = [
        "yt-dlp",
        "--no-warnings",
        "--progress",
        "--newline",
        "-o", output_path,
        "--merge-output-format", "mp4",
    ]

    if referer:
        cmd.extend(["--referer", referer])

    if extra_headers:
        for key, value in extra_headers.items():
            if key.lower() != "referer":  # referer handled above
                cmd.extend(["--add-header", f"{key}: {value}"])

    cmd.append(url)

    try:
        logger.info("yt-dlp: downloading %s → %s", url[:80], os.path.basename(output_path))
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        for line in process.stdout:
            line = line.strip()
            if progress_callback and "[download]" in line:
                match = re.search(r"([\d.]+)%", line)
                if match:
                    pct = float(match.group(1)) / 100.0
                    progress_callback(pct)

        process.wait()

        if process.returncode == 0 and os.path.isfile(output_path):
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            logger.info("yt-dlp complete: %s (%.1f MB)", os.path.basename(output_path), size_mb)
            return True
        else:
            logger.error("yt-dlp failed with exit code %d", process.returncode)
            return False

    except FileNotFoundError:
        logger.error("yt-dlp not found — install with: pip install yt-dlp")
        return False
    except Exception as e:
        logger.error("yt-dlp download error: %s", e)
        return False


def download_subtitles(stream: Stream, output_dir: str) -> list[str]:
    """Download all subtitle tracks from a stream. Returns list of saved file paths."""
    saved = []
    for sub in stream.subtitles:
        if not sub.url:
            continue
        ext = "vtt" if ".vtt" in sub.url else "srt" if ".srt" in sub.url else "ass"
        filename = f"{sub.language}.{ext}"
        path = os.path.join(output_dir, filename)
        try:
            resp = requests.get(sub.url, timeout=15)
            resp.raise_for_status()
            os.makedirs(output_dir, exist_ok=True)
            with open(path, "wb") as f:
                f.write(resp.content)
            saved.append(path)
        except Exception as e:
            logger.warning("Failed to download subtitle %s: %s", sub.language, e)
    return saved


def download_subtitles_from_resolved(resolved: dict, output_dir: str) -> list[str]:
    """Download subtitle tracks from consumet-resolved source."""
    saved = []
    for sub in resolved.get("subtitles", []):
        url = sub.get("url", "")
        lang = sub.get("lang", "unknown")
        if not url:
            continue
        ext = "vtt" if ".vtt" in url else "srt" if ".srt" in url else "ass"
        filename = f"{lang}.{ext}"
        path = os.path.join(output_dir, filename)
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            os.makedirs(output_dir, exist_ok=True)
            with open(path, "wb") as f:
                f.write(resp.content)
            saved.append(path)
        except Exception as e:
            logger.warning("Failed to download subtitle %s: %s", lang, e)
    return saved
