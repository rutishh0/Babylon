"""
transcoder.py — FFmpeg MKV → MP4 transcoding wrapper (NVENC hardware encoding).

Command used:
  ffmpeg -i input.mkv -c:v h264_nvenc -preset p4 -cq 23
         -c:a aac -b:a 192k -sn -movflags +faststart output.mp4

  -c:v h264_nvenc   NVIDIA hardware encoder (requires GPU)
  -preset p4        balanced quality/speed preset
  -cq 23            constant-quality rate control
  -sn               strip subtitle streams (extracted separately as .vtt)
  -movflags +faststart  move moov atom to file start (progressive streaming)

Expected performance on the Alienware (RTX GPU + NVENC):
  ~30–90 seconds per 24-min 1080p episode with h264_nvenc preset p4.
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
    Transcode *input_path* (MKV) to *output_path* (MP4) using h264_nvenc + AAC.

    Returns True on success, False on failure.
    Raises no exceptions — errors are logged and False is returned.
    """
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",                          # overwrite output if exists
        "-i", input_path,
        "-c:v", "h264_nvenc",          # NVIDIA hardware encoder
        "-preset", "p4",               # balanced quality/speed
        "-cq", "23",                   # constant-quality rate control
        "-pix_fmt", "yuv420p",         # convert 10-bit sources to 8-bit for h264_nvenc
        "-c:a", "aac",                 # AAC audio encoding
        "-b:a", "192k",               # audio bitrate
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
            timeout=7200,  # 2-hour timeout — HEVC 10-bit decoding is slow
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
