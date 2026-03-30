# Babylon Phase 1.5 — Anime Streaming Library

A Python library for searching, streaming, and downloading anime episodes.
Combines the architecture of anipy-cli with the scraping logic of ani-cli.

## Features
- Search anime across multiple providers (AllAnime, AnimeKai)
- Get episode lists with sub/dub language support
- Extract streaming URLs (M3U8, MP4) at multiple quality levels
- Download episodes with HLS segment downloading or direct MP4
- FFmpeg remux/transcode support
- Provider abstraction layer — easy to add new sources

## Usage
```python
from babylon_anime import search, get_episodes, get_stream

results = search("Solo Leveling")
episodes = get_episodes(results[0])
stream = get_stream(episodes[0], quality="1080p")
print(stream.url)
```

## Integration with Babylon Ingest
This library replaces Nyaa torrent-based ingestion with direct streaming downloads.
