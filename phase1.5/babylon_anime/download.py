"""Episode download module — supports M3U8 (HLS) and direct MP4 downloads."""

import logging
import os
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    Download an episode stream to a file.

    Args:
        stream: Stream object with URL and format info
        output_path: Where to save the file
        progress_callback: Optional function called with progress 0.0-1.0
        use_ffmpeg: Force FFmpeg for all downloads

    Returns:
        True on success, False on failure
    """
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    if use_ffmpeg or stream.format not in ("m3u8", "mp4"):
        return _ffmpeg_download(stream, output_path)
    elif stream.format == "m3u8":
        return _m3u8_download(stream, output_path, progress_callback)
    else:
        return _mp4_download(stream, output_path, progress_callback)


def _mp4_download(
    stream: Stream,
    output_path: str,
    progress_callback: Optional[Callable[[float], None]] = None,
) -> bool:
    """Direct MP4 download with progress tracking."""
    try:
        headers = {}
        if stream.referer:
            headers["Referer"] = stream.referer

        with requests.get(stream.url, headers=headers, stream=True, timeout=30) as resp:
            resp.raise_for_status()
            total = int(resp.headers.get("content-length", 0))
            downloaded = 0

            with open(output_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if progress_callback and total > 0:
                        progress_callback(downloaded / total)

        logger.info("Downloaded MP4: %s (%.1f MB)", output_path, os.path.getsize(output_path) / 1e6)
        return True

    except Exception as e:
        logger.error("MP4 download failed: %s", e)
        if os.path.exists(output_path):
            os.remove(output_path)
        return False


def _m3u8_download(
    stream: Stream,
    output_path: str,
    progress_callback: Optional[Callable[[float], None]] = None,
) -> bool:
    """HLS M3U8 download — downloads segments in parallel then concatenates."""
    try:
        headers = {}
        if stream.referer:
            headers["Referer"] = stream.referer

        # Fetch the M3U8 playlist
        resp = requests.get(stream.url, headers=headers, timeout=15)
        resp.raise_for_status()

        # Extract segment URLs
        base_url = stream.url.rsplit("/", 1)[0]
        segments = []
        for line in resp.text.strip().split("\n"):
            line = line.strip()
            if line and not line.startswith("#"):
                if line.startswith("http"):
                    segments.append(line)
                else:
                    segments.append(f"{base_url}/{line}")

        if not segments:
            logger.warning("No segments found in M3U8, falling back to FFmpeg")
            return _ffmpeg_download(stream, output_path)

        total = len(segments)
        completed = [0]

        # Download segments to temp files
        with tempfile.TemporaryDirectory() as tmpdir:
            segment_files = [os.path.join(tmpdir, f"seg_{i:05d}.ts") for i in range(total)]

            def download_segment(args):
                idx, url, path = args
                for attempt in range(3):
                    try:
                        r = requests.get(url, headers=headers, timeout=30)
                        r.raise_for_status()
                        with open(path, "wb") as f:
                            f.write(r.content)
                        completed[0] += 1
                        if progress_callback:
                            progress_callback(completed[0] / total)
                        return True
                    except Exception:
                        if attempt == 2:
                            return False
                return False

            tasks = [(i, url, path) for i, (url, path) in enumerate(zip(segments, segment_files))]

            with ThreadPoolExecutor(max_workers=8) as pool:
                futures = [pool.submit(download_segment, task) for task in tasks]
                results = [f.result() for f in as_completed(futures)]

            if not all(results):
                logger.warning("Some segments failed, falling back to FFmpeg")
                return _ffmpeg_download(stream, output_path)

            # Concatenate all .ts files into the output
            with open(output_path, "wb") as outf:
                for seg_path in segment_files:
                    if os.path.exists(seg_path):
                        with open(seg_path, "rb") as sf:
                            outf.write(sf.read())

        logger.info("Downloaded M3U8: %s (%.1f MB, %d segments)", output_path, os.path.getsize(output_path) / 1e6, total)
        return True

    except Exception as e:
        logger.error("M3U8 download failed: %s", e)
        if os.path.exists(output_path):
            os.remove(output_path)
        return False


def _ffmpeg_download(stream: Stream, output_path: str) -> bool:
    """FFmpeg-based download — handles any stream format."""
    cmd = ["ffmpeg", "-y"]

    if stream.referer:
        cmd.extend(["-headers", f"Referer: {stream.referer}\r\n"])

    cmd.extend([
        "-i", stream.url,
        "-c", "copy",
        "-bsf:a", "aac_adtstoasc",
        output_path,
    ])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        if result.returncode == 0:
            logger.info("FFmpeg download complete: %s", output_path)
            return True
        else:
            logger.error("FFmpeg failed: %s", result.stderr[-500:])
            return False
    except subprocess.TimeoutExpired:
        logger.error("FFmpeg download timed out")
        return False
    except FileNotFoundError:
        logger.error("FFmpeg not found — install it to use this download method")
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
