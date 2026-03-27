"""
uploader.py — Upload files to Scaleway Object Storage via boto3.

Scaleway is S3-compatible. Configuration:
  SCALEWAY_ENDPOINT=https://s3.it-mil.scw.cloud
  SCALEWAY_REGION=it-mil
  SCALEWAY_BUCKET=Babylon

S3 key conventions (from spec §3):
  anime/{media_id}/s{season}/e{episode}/{filename}
  subtitles/{episode_id}/{language}.vtt
"""

import logging
import math
import os
from typing import Optional

import boto3
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import BotoCoreError, ClientError

import config

logger = logging.getLogger(__name__)

# Use multipart upload for files larger than 100 MB
MULTIPART_THRESHOLD = 100 * 1024 * 1024  # 100 MB in bytes
MULTIPART_CHUNKSIZE = 25 * 1024 * 1024   # 25 MB chunks


def _s3_client():
    """Create a configured boto3 S3 client for Scaleway."""
    return boto3.client(
        "s3",
        region_name=config.SCALEWAY_REGION,
        endpoint_url=config.SCALEWAY_ENDPOINT,
        aws_access_key_id=config.SCALEWAY_ACCESS_KEY,
        aws_secret_access_key=config.SCALEWAY_SECRET_KEY,
    )


def upload_file(local_path: str, s3_key: str) -> bool:
    """
    Upload *local_path* to *s3_key* in the configured Scaleway bucket.

    Uses multipart upload automatically for files > 100 MB.
    Returns True on success, False on failure.
    """
    client = _s3_client()
    transfer_config = TransferConfig(
        multipart_threshold=MULTIPART_THRESHOLD,
        multipart_chunksize=MULTIPART_CHUNKSIZE,
        use_threads=True,
        max_concurrency=4,
    )

    file_size = os.path.getsize(local_path)
    size_mb = file_size / (1024 * 1024)
    use_multipart = file_size > MULTIPART_THRESHOLD

    logger.info(
        "Uploading %s → s3://%s/%s (%.1f MB, multipart=%s)",
        os.path.basename(local_path), config.SCALEWAY_BUCKET, s3_key, size_mb, use_multipart,
    )

    try:
        client.upload_file(
            Filename=local_path,
            Bucket=config.SCALEWAY_BUCKET,
            Key=s3_key,
            Config=transfer_config,
        )
        logger.info("Upload complete: %s", s3_key)
        return True

    except (BotoCoreError, ClientError) as exc:
        logger.error("S3 upload failed for %s → %s: %s", local_path, s3_key, exc)
        return False


def build_episode_s3_key(media_id: str, season: int, episode_num: int, filename: str) -> str:
    """Return the S3 key for an anime episode MP4 file."""
    return f"anime/{media_id}/s{season}/e{episode_num}/{filename}"


def build_subtitle_s3_key(episode_id: str, language: str, fmt: str = "vtt") -> str:
    """Return the S3 key for a subtitle file."""
    return f"subtitles/{episode_id}/{language}.{fmt}"
