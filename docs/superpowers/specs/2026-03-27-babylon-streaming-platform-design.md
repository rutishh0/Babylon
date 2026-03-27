# Babylon — Personal Streaming Platform

**Date:** 2026-03-27
**Status:** Approved (v2 — VPS consolidation + automated ingest)
**Author:** Rutishkrishna + Claude

---

## 1. Overview

Babylon is a personal Netflix-like streaming platform for hosting and watching anime, movies, and TV shows. Media files are stored on Scaleway Object Storage and streamed to a responsive web frontend and a native Android app.

The primary ingest method is an automated Python daemon running on a dedicated VPS that monitors Nyaa/SubsPlease RSS feeds, downloads matching anime, transcodes to MP4, uploads to Scaleway S3, and registers in the library — fully hands-off. A CLI tool and web upload remain available for manual movie/TV show uploads.

**Single user, no auth complexity.** Optional PIN protection.

---

## 2. Architecture

### System Components

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Web Frontend │  │ Android App  │  │   CLI Tool   │
│ Next.js      │  │ Kotlin       │  │ Node.js      │
│ Vercel       │  │ ExoPlayer    │  │ Local        │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────────┬────┴────┬────────────┘
                    │  HTTPS  │
                    ▼         ▼
┌─────────────────────────────────────────────────┐
│  UpCloud VPS (212.147.228.229 — Frankfurt)      │
│  api.internalrr.info                            │
│  6 vCPU • 16GB RAM • 320GB SSD • Ubuntu LTS    │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │ Nginx (:80/:443 → :3000)           │        │
│  │ Let's Encrypt SSL via Certbot       │        │
│  └──────────────┬──────────────────────┘        │
│                 ▼                                │
│  ┌─────────────────────────────────────┐        │
│  │ Babylon API (Fastify • :3000)       │        │
│  │ TypeScript • Drizzle ORM            │        │
│  └──┬──────────────┬──────────────┬────┘        │
│     │              │              │              │
│  ┌──┴───┐   ┌─────┴─────┐  ┌────┴──────┐       │
│  │SQLite│   │ S3 Client │  │TMDB/Jikan │       │
│  │local │   │ presigned │  │ metadata  │       │
│  └──────┘   └───────────┘  └───────────┘       │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │ Ingest Daemon (Python • systemd)    │        │
│  │ RSS poll → qBittorrent → FFmpeg     │        │
│  │ → boto3 upload → API registration   │        │
│  └──┬──────────────┬──────────────────┘        │
│     │              │                            │
│  ┌──┴────────┐  ┌──┴──────────┐                │
│  │qBittorrent│  │  FFmpeg     │                │
│  │ nox :8080 │  │  transcode  │                │
│  └───────────┘  └─────────────┘                │
└─────────────────────────────────────────────────┘
          │              │              │
   ┌──────┴──┐    ┌──────┴──┐    ┌─────┴────┐
   │Scaleway │    │  Nyaa   │    │TMDB/Jikan│
   │S3 Milan │    │  RSS    │    │ APIs     │
   └─────────┘    └─────────┘    └──────────┘
```

### Tech Stack

| Component | Technology | Hosting |
|-----------|-----------|---------|
| Backend API | Fastify + TypeScript + Drizzle ORM + SQLite | UpCloud VPS |
| Web Frontend | Next.js (React) + TypeScript | Vercel |
| Android App | Kotlin + Jetpack Compose + ExoPlayer (Media3) | GitHub Actions APK |
| CLI Tool | Node.js + TypeScript + Commander | Local install (npm) |
| Ingest Daemon | Python 3 + qbittorrent-api + boto3 + FFmpeg | UpCloud VPS (systemd) |
| Media Storage | Scaleway Object Storage (S3-compatible) | Scaleway Milan (it-mil) |
| Metadata | TMDB API v4 (movies/TV) + Jikan API (anime/MAL) | External |
| Database | SQLite via Drizzle ORM | VPS local disk |
| Reverse Proxy | Nginx + Let's Encrypt (Certbot) | UpCloud VPS |
| Torrent Client | qBittorrent-nox | UpCloud VPS |
| Transcoding | FFmpeg (libx264 + AAC) | UpCloud VPS |

### Key Design Decisions

- **VPS consolidation:** API, ingest daemon, qBittorrent, and FFmpeg all run on the same UpCloud VPS. No need for separate Render.com hosting — saves cost and simplifies deployment.
- **Presigned URLs for streaming:** The API generates time-limited S3 URLs. Clients stream directly from Scaleway — the API server never proxies video bytes.
- **Automated ingest as primary path:** Anime is ingested automatically via RSS/Nyaa. Manual upload (CLI/web) is secondary, used for movies and TV shows.
- **SQLite over Postgres:** Single-user app with simple queries. SQLite is zero-config, lives on VPS local disk. No database server to manage.
- **TypeScript monorepo:** Backend, frontend, and CLI share types and validation schemas. One language (except Android and ingest daemon).
- **Domain + SSL:** `api.internalrr.info` points to VPS. Nginx terminates SSL via Let's Encrypt. All client traffic is HTTPS.

### VPS Details

| Property | Value |
|----------|-------|
| Provider | UpCloud |
| Hostname | ubuntu-6cpu-16gb-de-fra1 |
| OS | Ubuntu (latest LTS) |
| Public IP | 212.147.228.229 |
| Domain | api.internalrr.info |
| Specs | 6 vCPU, 16GB RAM, 320GB SSD |
| Region | Frankfurt (DE-FRA1) |

---

## 3. Data Model

### Media

The top-level entity representing a movie, series, or anime.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (ULID) | Primary key |
| title | TEXT | Display title |
| type | TEXT | `movie`, `series`, `anime` |
| description | TEXT | Synopsis |
| poster_url | TEXT | S3 key for poster image |
| backdrop_url | TEXT | S3 key for backdrop image |
| genres | TEXT | JSON array of genre strings |
| rating | REAL | Numeric rating (e.g., 8.5) |
| year | INTEGER | Release year |
| source | TEXT | `tmdb`, `jikan`, `manual`, `ingest` |
| external_id | TEXT | TMDB ID or MAL ID |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### Season

For series and anime only.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (ULID) | Primary key |
| media_id | TEXT | FK → Media |
| season_number | INTEGER | Season number |
| title | TEXT | Season title (optional) |

### Episode

Individual episodes within a season.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (ULID) | Primary key |
| season_id | TEXT | FK → Season |
| episode_number | INTEGER | Episode number |
| title | TEXT | Episode title |
| duration | INTEGER | Duration in seconds |
| thumbnail_url | TEXT | S3 key for thumbnail |
| s3_key | TEXT | S3 object key for video file |
| file_size | INTEGER | File size in bytes |
| format | TEXT | File format (mkv, mp4, etc.) |
| original_filename | TEXT | Original uploaded filename |

### MediaFile

For movies — single file per media.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (ULID) | Primary key |
| media_id | TEXT | FK → Media |
| s3_key | TEXT | S3 object key |
| file_size | INTEGER | File size in bytes |
| duration | INTEGER | Duration in seconds |
| format | TEXT | File format |
| original_filename | TEXT | Original filename |

### Subtitle

Linked to either a MediaFile (movie) or Episode (series/anime).

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (ULID) | Primary key |
| media_file_id | TEXT | FK → MediaFile (nullable) |
| episode_id | TEXT | FK → Episode (nullable) |
| language | TEXT | Language code (en, ja, etc.) |
| label | TEXT | Display label ("English", "日本語") |
| s3_key | TEXT | S3 object key |
| format | TEXT | `srt`, `vtt`, `ass` |

### WatchProgress

Tracks playback position and completion.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (ULID) | Primary key |
| media_id | TEXT | FK → Media |
| episode_id | TEXT | FK → Episode (nullable, for series) |
| position_seconds | REAL | Current playback position |
| duration_seconds | REAL | Total duration |
| completed | INTEGER | 0 or 1 |
| last_watched_at | TEXT | ISO timestamp |

### S3 Key Conventions

```
movies/{media_id}/{filename}
movies/{media_id}/poster.jpg
movies/{media_id}/backdrop.jpg
anime/{media_id}/s{season}/e{episode}/{filename}
anime/{media_id}/poster.jpg
series/{media_id}/s{season}/e{episode}/{filename}
series/{media_id}/poster.jpg
subtitles/{media_file_id|episode_id}/{language}.{format}
```

---

## 4. API Design

Base URL: `https://api.internalrr.info/api`

All endpoints return JSON. Optional PIN protection via `X-Babylon-Pin` header. Rate limiting via `@fastify/rate-limit` (100 requests/minute per IP, stricter on auth-sensitive endpoints).

### Media

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/media` | List/search media. Query params: `type`, `genre`, `q` (search), `sort`, `limit`, `offset` |
| GET | `/media/:id` | Full media detail including seasons, episodes, watch progress |
| POST | `/media` | Create new media entry |
| PATCH | `/media/:id` | Update metadata |
| DELETE | `/media/:id` | Delete media + associated S3 files |

### Metadata Fetch

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/metadata/search` | Search TMDB/Jikan. Query params: `q`, `type` (movie, series, anime) |
| POST | `/metadata/apply/:id` | Pull metadata from TMDB/Jikan for existing media entry |

### Upload (Manual — for movies/TV shows)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload/initiate` | Returns presigned S3 PUT URL(s). Body: filename, content type, media_id, type |
| POST | `/upload/complete` | Confirm upload complete. Body: s3_key, media_id, episode info (optional) |
| POST | `/upload/bulk` | CLI bulk upload orchestration. Body: array of files with metadata |

### Streaming

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stream/:id` | Returns presigned S3 GET URL for video. Query param: `episode_id` (optional) |
| GET | `/stream/:id/subtitle` | Returns presigned URL for subtitle. Query params: `episode_id`, `language` |

### Watch Progress

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/progress` | "Continue Watching" list, ordered by last_watched_at |
| PUT | `/progress/:mediaId` | Update watch position. Body: episode_id (optional), position_seconds, duration_seconds |
| DELETE | `/progress/:mediaId` | Clear progress for a media item |

### Library (Home Screen)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/library/home` | Aggregated home screen data: continue watching, recently added, genre rows |
| GET | `/library/genres` | All genres with media counts |

### Ingest Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ingest/watchlist` | Return full watchlist |
| POST | `/ingest/watchlist` | Add show: `{ "title": "...", "aliases": ["..."] }` |
| DELETE | `/ingest/watchlist/:title` | Remove show by title |
| GET | `/ingest/status` | Daemon status: active downloads, queue, progress %, last poll time |
| POST | `/ingest/trigger` | Force an immediate poll cycle |
| GET | `/ingest/search` | Search for anime to add. Query: `q`. Returns Jikan metadata immediately (poster, synopsis, episode count, year). Nyaa availability is **not** checked here — it's slow and unreliable for real-time UI |
| POST | `/ingest/queue` | Queue anime for download: `{ "title": "...", "nyaa_query": "..." }`. Adds to watchlist, triggers immediate backlog pull. Nyaa search happens here (async, server-side) — not during the search step |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (for Nginx upstream checks) |

---

## 5. Ingest Daemon

### Overview

Python-based daemon running as a systemd service on the VPS. Automatically discovers, downloads, transcodes, and uploads anime to the Babylon library.

### Watchlist Format

```json
[
  {
    "title": "Attack on Titan",
    "aliases": ["Shingeki no Kyojin"],
    "mode": "rss",
    "season": 4,
    "added_at": "2026-03-27T00:00:00Z"
  },
  {
    "title": "Quanzhi Fashi",
    "aliases": ["Full-Time Magister", "Quan Zhi Fa Shi"],
    "mode": "backlog",
    "season": 1,
    "added_at": "2026-03-27T00:00:00Z"
  }
]
```

Each entry has:
- `title` — primary display/search title
- `aliases` — alternative search terms (critical for Chinese donghua with inconsistent English translations)
- `mode` — `rss` (currently airing, poll SubsPlease RSS) or `backlog` (finished, search for batch torrents)
- `season` — season number for S3 key organization
- `added_at` — timestamp for ordering

### Pipeline Flow

#### RSS Mode (Airing Shows)

```
Every 5 minutes:
1. Fetch https://nyaa.si/?page=rss&u=subsplease&q=1080p+-batch
2. For each RSS item:
   a. Case-insensitive match <title> against watchlist titles + aliases
   b. Skip if title+episode already in ingest_seen table (SQLite)
   c. Extract magnet link from <link>
   d. Send magnet to qBittorrent-nox (localhost:8080)
   e. Poll qBittorrent API until download = 100%
   f. Extract soft subtitles: FFmpeg extracts embedded subtitle tracks to .vtt files
   g. Transcode: FFmpeg .mkv → .mp4 (libx264, AAC) — subtitles NOT burned in
   h. Upload .mp4 + .vtt subtitle files to Scaleway S3 via boto3
   i. Call POST /api/media + POST /api/upload/complete on localhost:3000
   j. Register extracted subtitles via API (language detected from MKV track metadata)
   k. Trigger Jikan metadata fetch via POST /api/metadata/apply/:id
   l. Add to seen table in SQLite
   m. Delete local .mkv, .mp4, and .vtt files
```

#### Backlog Mode (Finished Shows)

```
For each watchlist entry with mode=backlog (after one RSS poll cycle with no match):
1. Search Nyaa: https://nyaa.si/?page=rss&q={TITLE}+1080p+Batch&u=subsplease
2. Try each alias if primary title returns no results
3. If no SubsPlease batch found:
   a. Retry without uploader filter: https://nyaa.si/?page=rss&q={TITLE}+1080p+Batch
   b. Pick the most-seeded result
4. If still nothing found:
   a. Log to ingest_failed table in SQLite with title and timestamp
   b. Skip to next watchlist entry
5. If batch torrent found:
   a. Add torrent to qBittorrent
   b. Set ALL files to priority 0 (do not download)
   c. Identify episode files, sort by episode number
   d. Skip non-episode files (OVAs, specials, NCED/NCOP)
   e. For each episode sequentially:
      i.   Set file priority to normal (enable download)
      ii.  Wait for download to complete
      iii. Extract soft subtitles from .mkv to .vtt files
      iv.  Transcode .mkv → .mp4 (subtitles NOT burned in)
      v.   Upload .mp4 + .vtt subtitle files to S3
      vi.  Register in API (media + subtitles)
      vii. Delete local .mkv, .mp4, and .vtt files
      viii.Set file priority back to 0
   f. Remove torrent from qBittorrent when all episodes processed
```

### Filename Parsing (Episode Detection)

The daemon must extract episode numbers from various batch torrent naming patterns:

| Pattern | Example | Parsed as |
|---------|---------|-----------|
| `S01E03` | `[SubsPlease] Show S01E03 (1080p).mkv` | Episode 3 |
| `- NN` | `[SubsPlease] Show - 03 (1080p).mkv` | Episode 3 |
| `Episode NN` | `Episode 01.mkv` | Episode 1 |
| `ENN` | `Show E12 [1080p].mkv` | Episode 12 |
| Bare `NN` | `03.mkv` | Episode 3 |

Non-episode files to skip: files containing `NCED`, `NCOP`, `OVA`, `Special`, `PV`, `Preview`, `Trailer`, `Menu`, `Extra`.

### Disk Space Safety

- Before starting any download, check disk usage via `shutil.disk_usage()`
- If disk usage exceeds **85%**, pause the ingest queue and log a warning
- Resume when disk usage drops below **75%** (after cleanup of processed files)
- Each episode cycle (download → transcode → upload → delete) needs ~2.5GB free at peak

### State Storage

**SQLite (shared with API — `/opt/babylon/data/babylon.db`):**

The `seen` tracking uses a SQLite table instead of a flat JSON file. With 80 shows × multiple seasons × ~12 episodes, this grows to 1000+ entries and is read every 5 minutes. SQLite handles this efficiently with indexed lookups.

| Table | Columns | Purpose |
|-------|---------|---------|
| `ingest_seen` | title, episode, torrent_hash, processed_at | Prevents re-downloading. Indexed on (title, episode) |
| `ingest_failed` | title, reason, failed_at | Titles not found on Nyaa for manual review |

**JSON files (in `/opt/babylon/ingest/`):**

| File | Purpose |
|------|---------|
| `watchlist.json` | Shows to monitor/download (managed via API endpoints) |
| `status.json` | Current daemon state (written by daemon, read by API for `/ingest/status`) |

### Jikan Rate Limiting

Jikan API allows 3 requests/second. The daemon inserts a 400ms delay between Jikan calls when processing batches.

### Subtitle Extraction

SubsPlease MKVs always contain soft (embedded) subtitle tracks. These must be extracted before transcoding — never burned in (hardsubbing loses flexibility for the player's subtitle toggle).

**Extraction step (before transcode):**
```bash
# Probe subtitle tracks
ffprobe -v quiet -print_format json -show_streams -select_streams s input.mkv

# Extract each subtitle track to .vtt
ffmpeg -i input.mkv -map 0:s:0 -c:s webvtt subtitle_eng.vtt
ffmpeg -i input.mkv -map 0:s:1 -c:s webvtt subtitle_jpn.vtt  # if multiple tracks
```

- Language is read from the MKV track metadata (`language` tag)
- Output format is `.vtt` (WebVTT) — natively supported by HTML5 `<video>` and ExoPlayer
- If language tag is missing, default to "eng" for the first track
- Each extracted subtitle file is uploaded to S3 alongside the video and registered in the Subtitle table

### Transcoding

- Command: `ffmpeg -i input.mkv -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -sn -movflags +faststart output.mp4`
- `-sn` strips subtitle streams from the MP4 (they're extracted separately as .vtt)
- `-movflags +faststart` enables streaming before full download (progressive playback)
- 6 vCPU with libx264: ~3-8 minutes per 24-min 1080p episode
- Full 24-episode season: ~1.5-3 hours (background process, acceptable)

---

## 6. Frontend (Next.js)

### Screens

1. **Home** — Hero banner (current/featured watch), horizontal scroll rows: Continue Watching, Recently Added, genre-based rows (Anime, Movies, TV Shows)
2. **Detail Page** — Poster + backdrop, metadata (title, year, rating, genres, description), season tabs for series/anime, episode list with thumbnails/progress/watched status, Edit button for metadata override
3. **Video Player** — Full-screen with overlay controls: progress scrubber, play/pause, skip forward/back (10s), playback speed selector, subtitle toggle (CC), skip intro button, fullscreen toggle. Shows title + episode info at top.
4. **Search** — Full-text search with type/genre filters, instant results
5. **Upload** — Drag & drop zone, filename-based metadata search (TMDB/Jikan), season/episode assignment, upload progress, concurrent uploads. Used for manual movie/TV show uploads.
6. **Category Pages** — Filtered views for Anime, Movies, TV Shows
7. **Discover** — Search anime by title (queries Jikan for metadata). Shows anime cards with poster, synopsis, episode count, year, and library status ("Already in your library" if matched by title in SQLite). Click "Download to Babylon" to queue — Nyaa availability is checked server-side at queue time (not during search, since Nyaa RSS is too slow for real-time UI). Shows toast: "Queued for download" or "Not found on Nyaa — added to watchlist for future RSS monitoring".
8. **Ingest Status** — Live-updating panel showing the ingest queue: pending downloads, current state per item (searching / downloading / transcoding / uploading / done), progress percentage. Polls `GET /ingest/status` every 10 seconds while panel is open. Accessible from nav bar.

### Responsive Design

| Breakpoint | Target | Behavior |
|------------|--------|----------|
| >1200px | Desktop/laptop | 6-7 cards per row, large hero, side-by-side detail layout |
| 768-1200px | Tablet/small laptop | 4-5 cards per row, slightly smaller hero |
| <768px | Mobile browser | 2-3 cards per row, stacked detail layout, hamburger nav, larger touch targets |

**Implementation:**
- CSS Grid with `auto-fill` + `minmax()` for card rows — natural reflow
- `clamp()` for fluid typography
- Hero banner scales height proportionally
- Video player controls enlarge on touch devices
- Navigation collapses to hamburger menu below 768px

### Design Language

- Dark theme (background #0a0a0a, cards #1a1a2e)
- Accent color: #e50914 (progress bars, highlights)
- Smooth transitions and hover states
- Netflix-style poster cards with rounded corners
- Progress bars on "Continue Watching" cards

---

## 7. Android App (Kotlin)

### Tech Stack

| Library | Purpose |
|---------|---------|
| Jetpack Compose | Declarative UI |
| Media3 ExoPlayer | Video playback with hardware decoding |
| Retrofit + OkHttp | REST API client |
| Coil | Async image loading |
| Room | Local SQLite cache |

### Screens

Same as web: Home, Detail, Player, Search, Upload, Category, Discover, Ingest Status.

### Navigation

Bottom navigation bar: Home, Search, Library, Discover.

### Key Features

- **ExoPlayer** — hardware-accelerated decoding, native subtitle support (SRT, VTT, ASS), picture-in-picture mode, background audio
- **Gestures** — swipe to scrub, double-tap left/right to skip 10s, pinch to zoom
- **Upload** — Android file picker + share intent (share a file from file manager directly to Babylon)
- **Offline resilience** — metadata + posters cached locally via Room DB, watch progress synced when back online (queue updates, push on reconnect)
- **Landscape lock** — auto-rotate to landscape when player opens
- **Discover** — same Jikan + Nyaa search as web, queue downloads from phone

### Screen Adaptation

Jetpack Compose's `WindowSizeClass` API handles adaptive layouts natively across phones, tablets, and foldables.

---

## 8. CLI Tool

### Commands

```bash
# Upload (primary use: movies and TV shows)
babylon upload <file-or-dir> [options]
  --type <movie|series|anime>    Media type
  --search <query>               Search TMDB/Jikan for metadata
  --title <title>                Manual title
  --season <n>                   Season number (series/anime)
  --episode <n>                  Episode number (series/anime)
  --year <year>                  Release year
  --genre <genre>                Genre(s)

# Library management
babylon list [--type <type>] [--genre <genre>]
babylon search <query>
babylon info <media-id>
babylon delete <media-id>

# Ingest management
babylon ingest status             Show ingest daemon status
babylon ingest watchlist           List watchlist
babylon ingest add <title>         Add to watchlist
babylon ingest remove <title>      Remove from watchlist
babylon ingest trigger             Force immediate poll

# Configuration
babylon config set-url <api-url>
babylon config set-pin <pin>
```

### Filename Parsing

Auto-detects season/episode from common naming patterns:

| Pattern | Example | Parsed as |
|---------|---------|-----------|
| `S01E03` | `Show.Name.S01E03.720p.mkv` | Season 1, Episode 3 |
| `[nn]` | `[SubGroup] Show - 03 [1080p].mkv` | Episode 3 |
| `- nn` | `Show Name - 12.mkv` | Episode 12 |
| Year detection | `Movie.2024.1080p.mkv` | Year 2024 |

### Upload Mechanics

- Files >100MB use S3 multipart upload (chunked for reliability and resumability)
- Subtitle files (`.srt`, `.vtt`, `.ass`) alongside video files are auto-detected and uploaded as linked subtitles
- Progress bar in terminal for each file
- Concurrent uploads (configurable, default 3)

---

## 9. Security & Configuration

### Authentication

- Optional PIN protection via `BABYLON_PIN` environment variable
- API middleware checks `X-Babylon-Pin` header on every request
- No sessions, no JWT, no user management

### Rate Limiting

- `@fastify/rate-limit` plugin
- Global: 100 requests/minute per IP
- PIN-protected endpoints with wrong PIN: 10 attempts/minute per IP (prevents brute-force)
- Streaming endpoints: 200 requests/minute (higher to allow seeking/subtitle fetches)

### S3 Security

- Bucket is private — no public access
- All access via presigned URLs generated by the API
- Streaming URLs expire after 4 hours
- Upload URLs expire after 1 hour

### CORS

- API allows requests only from the Vercel frontend domain and Android app
- Configurable via `ALLOWED_ORIGINS` env var

### SSL/TLS

- Nginx terminates HTTPS on the VPS
- Let's Encrypt certificate via Certbot with auto-renewal
- Domain: `api.internalrr.info`
- HTTP (port 80) redirects to HTTPS (port 443)

### qBittorrent Security

- qBittorrent-nox WebUI bound to `127.0.0.1:8080` only (not exposed to internet)
- Default credentials changed on setup
- Only the ingest daemon (localhost) communicates with it

### Environment Variables (VPS `/opt/babylon/.env`)

```
# Scaleway Object Storage
SCALEWAY_ACCESS_KEY=<access key>
SCALEWAY_SECRET_KEY=<secret key>
SCALEWAY_BUCKET=Babylon
SCALEWAY_REGION=it-mil
SCALEWAY_ENDPOINT=https://s3.it-mil.scw.cloud

# TMDB Metadata
TMDB_API_KEY=<api key>
TMDB_READ_ACCESS_TOKEN=<bearer token>

# App Config
BABYLON_PIN=<optional pin>
DATABASE_URL=file:///opt/babylon/data/babylon.db
ALLOWED_ORIGINS=https://your-app.vercel.app
PORT=3000

# Ingest Daemon
QBITTORRENT_HOST=http://127.0.0.1:8080
QBITTORRENT_USER=admin
QBITTORRENT_PASS=<changed from default>
DOWNLOAD_DIR=/downloads/raw
PROCESSED_DIR=/downloads/processed
INGEST_STATE_DIR=/opt/babylon/ingest
INGEST_POLL_INTERVAL=300
```

**Note:** TMDB v4 API uses the Bearer read access token. Jikan API requires no key. Credentials are in `.env` on the VPS, never committed to git.

---

## 10. Project Structure

```
babylon/
├── packages/
│   ├── api/                    # Fastify backend
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers (media, upload, stream, progress, library, ingest)
│   │   │   ├── services/       # Business logic
│   │   │   ├── db/             # Drizzle schema + migrations
│   │   │   ├── lib/            # S3 client, TMDB client, Jikan client
│   │   │   └── index.ts        # Server entry point
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App router pages (home, detail, player, search, upload, discover, ingest)
│   │   │   ├── components/     # UI components (cards, player, nav, etc.)
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   └── lib/            # API client, types
│   │   └── package.json
│   │
│   ├── cli/                    # CLI tool
│   │   ├── src/
│   │   │   ├── commands/       # Upload, list, search, config, ingest commands
│   │   │   ├── lib/            # S3 upload, filename parser, API client
│   │   │   └── index.ts        # CLI entry point
│   │   └── package.json
│   │
│   └── shared/                 # Shared TypeScript types + validation
│       ├── src/
│       │   ├── types.ts        # Media, Episode, Progress, Ingest types
│       │   └── validation.ts   # Zod schemas
│       └── package.json
│
├── ingest/                     # Python ingest daemon
│   ├── daemon.py               # Main daemon loop
│   ├── rss_poller.py           # RSS fetch + parse + match
│   ├── downloader.py           # qBittorrent API integration
│   ├── transcoder.py           # FFmpeg wrapper
│   ├── uploader.py             # boto3 S3 upload
│   ├── registrar.py            # Babylon API client (register media)
│   ├── filename_parser.py      # Episode number extraction
│   ├── config.py               # Environment config loader
│   ├── watchlist.json          # Pre-populated watchlist (80 titles)
│   ├── requirements.txt        # Python dependencies
│   ├── babylon-ingest.service  # systemd unit file
│   └── README.md               # Setup instructions
│
├── deploy/                     # VPS deployment configs
│   ├── nginx/
│   │   └── babylon.conf        # Nginx site config
│   ├── setup.sh                # VPS initial setup script
│   └── .env.example            # Environment variable template
│
├── android/                    # Kotlin Android app
│   ├── app/src/main/
│   │   ├── java/.../babylon/
│   │   │   ├── ui/             # Compose screens (including Discover)
│   │   │   ├── data/           # Repository, API service, Room DB
│   │   │   ├── player/         # ExoPlayer wrapper
│   │   │   └── model/          # Data classes
│   │   └── res/
│   └── build.gradle.kts
│
├── .github/
│   └── workflows/
│       └── build-android.yml   # GitHub Actions: build APK on push
├── package.json                # Workspace root
├── turbo.json                  # Turborepo config
└── .env.example
```

**Monorepo with Turborepo** — `packages/shared` is consumed by api, web, and cli. `ingest/` is standalone Python. Android is separate (Kotlin/Gradle).

---

## 11. Deployment

| Component | Platform | Method |
|-----------|----------|--------|
| API | UpCloud VPS | Node.js process (PM2 or systemd), behind Nginx |
| Ingest Daemon | UpCloud VPS | Python systemd service |
| qBittorrent | UpCloud VPS | qbittorrent-nox systemd service |
| Web | Vercel | Git push auto-deploy |
| CLI | npm | `npm install -g @babylon/cli` (or local link) |
| Android | GitHub Actions | CI builds APK on push, downloadable from Actions artifacts |

### VPS Setup (api.internalrr.info)

Services running on the VPS:

| Service | Port | Exposed |
|---------|------|---------|
| Nginx | 80, 443 | Yes (public) |
| Babylon API (Fastify) | 3000 | No (behind Nginx) |
| qBittorrent-nox WebUI | 8080 | No (localhost only) |
| Ingest Daemon | — | No (background service) |

**Nginx config** (`/etc/nginx/sites-available/babylon`):
- SSL termination with Let's Encrypt cert
- Proxy pass `https://api.internalrr.info/` → `http://127.0.0.1:3000/`
- HTTP → HTTPS redirect
- WebSocket support for future live status updates

**systemd services:**
- `babylon-api.service` — Fastify API (Node.js)
- `babylon-ingest.service` — Python ingest daemon
- `qbittorrent-nox.service` — torrent client

**Directory layout on VPS:**

```
/opt/babylon/
├── api/                    # Built Fastify API
├── ingest/                 # Python daemon + state files
├── data/
│   └── babylon.db          # SQLite database
└── .env                    # Environment variables

/downloads/
├── raw/                    # qBittorrent download destination
└── processed/              # FFmpeg output (before S3 upload)
```

### Android APK via GitHub Actions

- Workflow triggers on push to `android/` directory or manual dispatch
- Uses `actions/setup-java` (JDK 17) and Gradle cache for fast builds
- Runs `./gradlew assembleRelease` to produce the APK
- Uploads APK as a GitHub Actions artifact — downloadable from the Actions tab
- API base URL (`https://api.internalrr.info`) injected via GitHub Actions secret at build time

### Vercel Web Setup

- Connect Git repo, set root directory to `packages/web`
- Environment variable: `NEXT_PUBLIC_API_URL=https://api.internalrr.info`
- Auto-deploy on push

---

## 12. Pre-Populated Watchlist

All 80 titles, seeded on first run. All set to `mode: "backlog"` (finished/older shows):

1. GOSICK
2. Nichijou: My Ordinary Life
3. No Game No Life
4. KonoSuba: God's Blessing on This Wonderful World! (Season 1)
5. Quanzhi Fashi / Full-Time Magister (Season 1)
6. Gabriel DropOut
7. KonoSuba: God's Blessing on This Wonderful World! (Season 2)
8. Quanzhi Fashi / Full-Time Magister (Season 2)
9. Asobi Asobase
10. Quanzhi Fashi / Full-Time Magister (Season 3)
11. Arifureta: From Commonplace to World's Strongest (Season 1)
12. High School Prodigies Have It Easy Even in Another World!
13. Assassin's Pride
14. The Daily Life of the Immortal King (Season 1)
15. Quanzhi Fashi / Full-Time Magister (Season 4)
16. The Misfit of Demon King Academy (Season 1)
17. By the Grace of the Gods (Season 1)
18. Combatants Will Be Dispatched!
19. Tsukimichi: Moonlit Fantasy (Season 1)
20. Quanzhi Fashi / Full-Time Magister (Season 5)
21. The Daily Life of the Immortal King (Season 2)
22. Spare Me, Great Lord! (Season 1)
23. Arifureta: From Commonplace to World's Strongest (Season 2)
24. The Greatest Demon Lord Is Reborn as a Typical Nobody
25. I've Somehow Gotten Stronger When I Improved My Farm-Related Skills
26. The Daily Life of the Immortal King (Season 3)
27. The Eminence in Shadow (Season 1)
28. Farming Life in Another World
29. The Misfit of Demon King Academy (Season 2 Part 1)
30. By the Grace of the Gods (Season 2)
31. The Aristocrat's Otherworldly Adventure: Serving Gods Who Go Too Far
32. KonoSuba: An Explosion on This Wonderful World! (Spinoff)
33. I Got a Cheat Skill in Another World and Became Unrivaled in the Real World, Too
34. Quanzhi Fashi / Full-Time Magister (Season 6)
35. Am I Actually the Strongest?
36. My Unique Skill Makes Me OP Even at Level 1
37. Shangri-La Frontier (Season 1)
38. A Playthrough of a Certain Dude's VRMMO Life
39. The Eminence in Shadow (Season 2)
40. The Demon Sword Master of Excalibur Academy
41. The Vexations of a Shut-In Vampire Princess
42. The Daily Life of the Immortal King (Season 4)
43. Tales of Wedding Rings (Season 1)
44. Tsukimichi: Moonlit Fantasy (Season 2)
45. Hokkaido Gals Are Super Adorable!
46. The Foolish Angel Dances with the Devil
47. The Weakest Tamer Began a Journey to Pick Up Trash
48. Mission: Yozakura Family
49. Chillin' in Another World with Level 2 Super Cheat Powers
50. KonoSuba: God's Blessing on This Wonderful World! (Season 3)
51. The Misfit of Demon King Academy (Season 2 Part 2)
52. Failure Frame: I Became the Strongest and Annihilated Everything With Low-Level Spells
53. Quanzhi Fashi / Full-Time Magister (Season 7)
54. Let This Grieving Soul Retire (Part 1)
55. Loner Life in Another World
56. The Healer Who Was Banished From His Party, Is, in Fact, the Strongest
57. Shangri-La Frontier (Season 2)
58. Arifureta: From Commonplace to World's Strongest (Season 3)
59. The Daily Life of a Middle-Aged Online Shopper in Another World
60. I'm a Noble on the Brink of Ruin, So I Might as Well Try Mastering Magic
61. Left My A-Rank Party to Help My Former Students Reach the Dungeon Depths!
62. The Shiunji Family Children
63. The Unaware Atelier Meister
64. I'm the Evil Lord of an Intergalactic Empire!
65. Tales of Wedding Rings (Season 2)
66. A Gatherer's Adventure in Isekai
67. Let This Grieving Soul Retire (Part 2)
68. Chitose Is in the Ramune Bottle
69. Dad is a Hero, Mom is a Spirit, I'm a Reincarnator
70. Hero Without a Class
71. Li'l Miss Vampire Can't Suck Right
72. My Gift Lvl 9999 Unlimited Gacha
73. My Status as an Assassin Obviously Exceeds the Hero's
74. Pass the Monster Meat, Milady!
75. The Daily Life of the Immortal King (Season 5)
76. The Demon King's Daughter Is Too Kind
77. There Was a Cute Girl in the Hero's Party, So I Tried Confessing to Her
78. Easygoing Territory Defense by the Optimistic Lord
79. Noble Reincarnation: Born Blessed, So I'll Obtain Ultimate Power
80. Hell Mode: The Hardcore Gamer Dominates in Another World with Garbage Balancing

**Chinese donghua titles** (require alias-based search + non-SubsPlease fallback):
- Quanzhi Fashi / Full-Time Magister (Seasons 1-7)
- The Daily Life of the Immortal King (Seasons 1-5)
- Spare Me, Great Lord! (Season 1)

---

## 13. Implementation Order

| Phase | What | Depends on |
|-------|------|------------|
| 1 | `packages/shared/` — shared types + Zod schemas | Nothing |
| 2 | `packages/api/` — Fastify API with all endpoints | Phase 1 |
| 3 | `ingest/` — Python daemon with full pipeline | Phase 2 (API must exist) |
| 4 | `deploy/` — VPS setup: Nginx, SSL, systemd, qBittorrent, FFmpeg | Phases 2-3 |
| 5 | `packages/web/` — Next.js frontend including Discover + Ingest Status | Phase 2 |
| 6 | `packages/cli/` — CLI tool | Phase 2 |
| 7 | `android/` + `.github/workflows/` — Kotlin app + GitHub Actions APK | Phase 2 |
