"""
transcoder.py — FFmpeg MKV → MP4 transcoding wrapper.

Command used:
  ffmpeg -i input.mkv -c:v libx264 -preset medium -crf 23
         -c:a aac -b:a 192k -sn -movflags +faststart output.mp4

  -sn              strip subtitle streams (extracted separately as .vtt)
  -movflags +faststart  move moov atom to file start (progressive streaming)

Expected performance on the 6-vCPU VPS:
  ~3–8 minutes per 24-min 1080p episode with libx264 preset medium.
"""

import json
import logging
import os
import subprocess
from typing import Optional

logger = logging.getLogger(__name__)


def get_duration(video_path: str) -> Optional[float]:
    """
    Return the duration of *video_path* in seconds using ffprobe.
    Returns None if duration cannot be determined.
    """
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_entries", "format=duration",
        video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
        data = json.loads(result.stdout)
        duration_str = data.get("format", {}).get("duration")
        if duration_str:
            return float(duration_str)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, json.JSONDecodeError, ValueError) as exc:
        logger.warning("Could not get duration of %s: %s", video_path, exc)
    return None


def transcode(input_path: str, output_path: str) -> bool:
    """
    Transcode *input_path* (MKV) to *output_path* (MP4) using libx264 + AAC.

    Returns True on success, False on failure.
    Raises no exceptions — errors are logged and False is returned.
    """
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",                          # overwrite output if exists
        "-i", input_path,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p",         # ensure 8-bit output for max compatibility
        "-c:a", "aac",
        "-b:a", "192k",
        "-sn",                         # no subtitle streams in output
        "-movflags", "+faststart",     # progressive streaming
        output_path,
    ]

    logger.info("Starting transcode: %s → %s", os.path.basename(input_path), os.path.basename(output_path))

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=3600,  # 1-hour timeout — plenty for a 24-min episode
        )
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        logger.info("Transcode complete: %s (%.1f MB)", os.path.basename(output_path), size_mb)
        return True

    except subprocess.CalledProcessError as exc:
        logger.error(
            "FFmpeg transcode failed for %s:\nstderr: %s",
            input_path,
            exc.stderr[-1000:],
        )
        # Clean up partial output
        if os.path.exists(output_path):
            os.remove(output_path)
        return False

    except subprocess.TimeoutExpired:
        logger.error("FFmpeg timed out transcoding %s (>1 hour)", input_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        return False
