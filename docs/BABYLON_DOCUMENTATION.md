# Babylon -- Complete Documentation

> Definitive reference for the Babylon anime streaming platform.
> Last updated: 2026-03-31

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Frontend (packages/web/)](#4-frontend-packagesweb)
5. [Anime Server (phase1.5/)](#5-anime-server-phase15)
6. [Control Panel (control-panel/)](#6-control-panel-control-panel)
7. [Deployment](#7-deployment)
8. [Development Workflow](#8-development-workflow)
9. [Troubleshooting](#9-troubleshooting)
10. [Phase History](#10-phase-history)

---

## 1. Overview

Babylon is a personal anime streaming platform designed for LAN use. It searches anime from the AllAnime aggregator, downloads episodes as MP4 files to local disk, and serves them through a Crunchyroll-inspired web UI accessible from any device on the home network.

### Architecture at a Glance

```
 Browser (any device on LAN)
    |
    | HTTP :3001
    v
 Next.js 15 Frontend (packages/web/)
    |
    | /api/anime/* rewrite
    v
 Flask Anime Server (phase1.5/)  :5000
    |
    |--- AllAnime GraphQL API (api.allanime.day)   [search, episodes, streams]
    |--- Local Disk (B:\Babylon\media)             [download, playback]
    |--- SQLite (B:\Babylon\data\phase15.db)       [library, download history]
    |
    v
 Fastify API Server (packages/api/)  :3000         [legacy Phase 1, progress tracking]
    |
    |--- SQLite (B:\Babylon\data\babylon.db)        [Phase 1 DB via Drizzle ORM]
```

### Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js | 15.x |
| UI Framework | React | 19.x |
| CSS | Tailwind CSS | 4.x |
| Component Library | shadcn/ui (Radix primitives) | latest |
| State Management | Zustand | 5.x |
| Carousel | Embla Carousel | 8.x |
| Icons | Lucide React | 0.400+ |
| Anime Server | Flask (Python) | -- |
| API Server | Fastify (Node.js) | -- |
| ORM | Drizzle ORM (legacy) | -- |
| Database | SQLite | 3.x |
| Process Manager | PM2 | latest |
| Desktop Control Panel | customtkinter (Python) | 5.2+ |
| Build System | pnpm + Turborepo | -- |
| Language | TypeScript 5 (frontend), Python 3.12+ (backend) | -- |

---

## 2. Architecture

### 2.1 System Components

#### Frontend -- `packages/web/`

The web UI is a Next.js 15 application using React 19, Tailwind CSS 4, and shadcn/ui components. It is a Crunchyroll-inspired dark-themed interface for browsing, searching, downloading, and watching anime. The frontend communicates with the Flask anime server through Next.js API rewrites -- all requests to `/api/anime/*` are transparently proxied to `http://localhost:5000/api/*`.

**Key dependencies:**
- `@radix-ui/*` -- Accessible UI primitives (dialog, dropdown, tabs, progress, etc.)
- `embla-carousel-react` -- Touch-friendly carousel for hero banners and anime rows
- `zustand` -- Lightweight state management for the download queue
- `lucide-react` -- Icon set
- `class-variance-authority` + `clsx` + `tailwind-merge` -- Utility-first styling

#### Anime Server -- `phase1.5/`

A Flask Python server that acts as the backbone of the system. It provides:
- **Search** via the AllAnime GraphQL API
- **Episode listing** and **stream URL resolution** (decrypting AllAnime's hex-encoded URLs)
- **Download management** with background threads, progress tracking, and SQLite persistence
- **Library** browsing by scanning the media directory and reconciling with the database
- **Video streaming** with HTTP Range header support for seeking

The server runs on port 5000 using `pythonw.exe` (windowless) under PM2.

#### API Server -- `packages/api/`

A Fastify Node.js server from Phase 1 that still runs on port 3000. It uses Drizzle ORM with SQLite (`B:\Babylon\data\babylon.db`) and primarily handles legacy progress tracking functionality. Its `/api/health` endpoint is used as a health check by the control panel and monitoring scripts.

#### Control Panel -- `control-panel/`

A standalone desktop application built with Python's `customtkinter` library. Provides a GUI dashboard for managing the Alienware server: starting/stopping services, viewing logs, monitoring disk usage, and performing maintenance operations. Can be run as a Python script or compiled to a standalone `.exe` with PyInstaller.

#### Ingest Daemon -- `ingest/` (Phase 1, Deprecated)

A Python daemon that was designed to monitor Nyaa for new torrent releases, download via qBittorrent's WebUI API, transcode with FFmpeg, and ingest into the library. This was part of the Phase 1 cloud architecture and is no longer the primary content acquisition method. Phase 1.5 replaces it with direct AllAnime streaming downloads.

### 2.2 Data Flow

#### Search Flow

```
User types query in search bar
  --> Browser sends GET /api/anime/search?q=...
    --> Next.js rewrites to http://localhost:5000/api/search?q=...
      --> Flask calls AllAnimeProvider.search()
        --> GraphQL POST to api.allanime.day with SEARCH_GQL
        --> Queries both "sub" and "dub" translation types
        --> Deduplicates by anime ID, merges language availability
        --> Sorts by relevance (exact > starts-with > contains > words)
      <-- Returns JSON array of AnimeSearchResult[]
    <-- Proxied back through Next.js
  <-- Frontend renders search results as AnimeCard grid
```

#### Download Flow

```
User selects episodes on Discover page, clicks "Download"
  --> Browser sends POST /api/anime/download
      Body: { anime_id, episodes: [1,2,3], lang, quality, title, cover_url, ... }
    --> Next.js rewrites to http://localhost:5000/api/download
      --> Flask persists anime metadata to SQLite (upsert_anime)
      --> Creates download_job row in SQLite
      --> Spawns background thread (run_downloads)
        --> For each episode:
          1. Resolve stream URL via AllAnimeProvider.get_streams()
          2. Prioritize type=player sources (direct MP4 URLs)
          3. Download MP4 to B:\Babylon\media\{SafeTitle}\{SafeTitle} - E{NN}.mp4
          4. Download subtitles to B:\Babylon\media\{SafeTitle}\subs\
          5. Record in downloaded_episode table
          6. Update download_job progress
      <-- Returns { job_id, db_job_id, message }
    <-- Frontend adds job to Zustand download store, starts polling
```

#### Playback Flow

```
User clicks episode on anime detail page
  --> Browser navigates to /watch/{animeId}?ep={N}
    --> Player component calls buildLocalStreamUrl(animeId, epNum)
      --> Returns /api/anime/library/{animeId}/stream/{epNum}
    --> <video> element loads that URL
      --> Next.js rewrites to http://localhost:5000/api/library/{id}/stream/{ep}
        --> Flask looks up file_path from downloaded_episode table
        --> Serves file with Range header support (HTTP 206 Partial Content)
        --> Chunked streaming: 8192-byte chunks for range requests
      <-- Video streams to browser with seeking support
```

#### Library Reconciliation Flow

```
Flask server starts
  --> db.init_db() creates tables if missing
  --> library.reconcile_with_db("B:/Babylon/media")
    --> Scans all subdirectories of media path
    --> Parses episode numbers from "Title - E01.mp4" filename pattern
    --> For each anime directory with video files:
      1. upsert_anime() with directory name as ID and title
      2. insert_downloaded_episode() for each .mp4/.ts/.mkv file
      3. Skips duplicates (UNIQUE constraint on anime_id + episode_number + language)
    --> Logs: "Reconcile: scanned N anime dirs, added M new episodes"
```

### 2.3 Network Topology

```
                        Home Router (192.168.1.1)
                       /            |             \
                      /             |              \
     Alienware M15 R3           Personal          Phone / Tablet
     192.168.1.140              Laptop            (any WiFi device)
     (Ethernet, static IP)      (WiFi)            (WiFi)
     MAC: C0-3E-BA-7F-5E-60
     |
     |-- Port 3000: Fastify API (babylon-api)
     |-- Port 3001: Next.js Web UI (babylon-web)
     |-- Port 5000: Flask Anime Server (babylon-anime)
     |-- Port 8080: qBittorrent WebUI (legacy)
     |
     B: drive (476GB SSD)
     |-- B:\Babylon\media\       (downloaded anime)
     |-- B:\Babylon\data\        (SQLite databases)
     |-- B:\Babylon\app\         (git repo / source code)
```

All services are LAN-only. There are no internet-facing endpoints, no DNS records, no reverse proxies. Any device on the home WiFi can access the frontend at `http://192.168.1.140:3001`.

---

## 3. Directory Structure

### Alienware Server Layout (`B:\Babylon\`)

```
B:\Babylon\
|
+-- app\                              # Git repo (source code)
|   +-- packages\
|   |   +-- web\                      # Next.js frontend (port 3001)
|   |   |   +-- src\
|   |   |   |   +-- app\              # Next.js App Router pages
|   |   |   |   +-- components\       # React components
|   |   |   |   +-- lib\              # API client, utilities
|   |   |   |   +-- stores\           # Zustand state stores
|   |   |   +-- next.config.ts        # Rewrites, image domains
|   |   |   +-- package.json
|   |   +-- api\                      # Fastify API (port 3000)
|   |       +-- src\
|   |       +-- dist\                 # Compiled JS (production)
|   |
|   +-- phase1.5\                     # Flask anime server (port 5000)
|   |   +-- babylon_anime\            # Anime provider library
|   |   |   +-- providers\
|   |   |   |   +-- allanime.py       # AllAnime GraphQL provider
|   |   |   |   +-- animekai.py       # AnimeKai provider (secondary)
|   |   |   |   +-- base.py           # BaseProvider abstract class
|   |   |   |   +-- __init__.py       # Provider registry
|   |   |   +-- models.py             # Data models (SearchResult, Episode, Stream, etc.)
|   |   |   +-- search.py             # Multi-provider search
|   |   |   +-- episodes.py           # Episode listing
|   |   |   +-- stream.py             # Stream resolution + quality selection
|   |   |   +-- download.py           # MP4/M3U8/FFmpeg download logic
|   |   |   +-- __init__.py           # Public API exports
|   |   +-- server.py                 # Flask server (all API routes)
|   |   +-- db.py                     # SQLite persistence layer
|   |   +-- library.py                # Disk scanner + DB reconciliation
|   |   +-- start.bat                 # Local dev launcher
|   |   +-- test_quick.py             # Quick integration test
|   |   +-- requirements.txt          # Python dependencies
|   |   +-- web\                      # Static HTML (unused fallback)
|   |
|   +-- control-panel\                # Desktop management app
|   |   +-- panel.py                  # Main application (customtkinter)
|   |   +-- run.bat                   # Launch with auto-venv
|   |   +-- build.bat                 # Compile to .exe
|   |   +-- requirements.txt          # Python deps
|   |
|   +-- ingest\                       # Phase 1 Nyaa daemon (deprecated)
|   |   +-- daemon.py
|   |   +-- requirements.txt
|   |
|   +-- deploy\                       # Deployment configuration
|   |   +-- ecosystem.config.cjs      # PM2 process definitions
|   |   +-- PHASE2_LOCAL_SETUP.md     # Full Alienware setup guide
|   |   +-- autopull.bat              # Git polling auto-deploy
|   |   +-- post-receive              # Git hook for push-to-deploy
|   |   +-- alienware-bootstrap.ps1   # PowerShell bootstrap script
|   |   +-- setup.sh                  # Linux setup script
|   |   +-- babylon-api.service       # systemd service (unused on Windows)
|   |   +-- babylon-ingest-wsl2.service # WSL2 ingest daemon service
|   |   +-- nginx\                    # Nginx configs (unused on Windows)
|   |
|   +-- restart-clean.bat             # Wipe media + DB, pull, build, start
|   +-- restart-fly.bat               # Keep media, wipe DB, pull, build, start
|   +-- CR\                           # Crunchyroll clone reference material
|   +-- package.json                  # Root monorepo package
|   +-- pnpm-workspace.yaml           # pnpm workspace config
|   +-- turbo.json                    # Turborepo pipeline config
|   +-- tsconfig.base.json            # Shared TypeScript config
|
+-- media\                            # Downloaded anime episodes
|   +-- {Anime Title}\                # One folder per anime
|   |   +-- {Title} - E01.mp4         # Episode files
|   |   +-- {Title} - E02.mp4
|   |   +-- subs\                     # Subtitle files
|   |       +-- English.vtt
|   |       +-- Japanese.ass
|   +-- {Another Anime}\
|       +-- ...
|
+-- data\                             # SQLite databases
|   +-- phase15.db                    # Phase 1.5 library + download history
|   +-- babylon.db                    # Phase 1 legacy database
|
+-- downloads\                        # Temporary download staging (Phase 1)
    +-- raw\                          # Raw torrent downloads
    +-- processed\                    # Post-FFmpeg processed files
```

### Development Laptop Layout (Source Code)

The same git repo is checked out on the development laptop. The working directory is wherever you cloned it (e.g., `C:\Users\Rutishkrishna\Desktop\Sefl Projects\Babylon`). Code changes are pushed to `origin master` and pulled on the Alienware.

---

## 4. Frontend (`packages/web/`)

### 4.1 Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | **Home** -- HeroCarousel of featured library anime + genre-grouped AnimeCarousel rows |
| `/anime` | `app/anime/page.tsx` | **Library** -- Grid of all downloaded anime with filter chips for genre/status |
| `/anime/[id]` | `app/anime/[id]/page.tsx` | **Anime Detail** -- Hero banner with cover art, description, genre badges, episode grid with download status indicators, "Start Watching" button |
| `/discover` | `app/discover/page.tsx` | **Discover** -- AllAnime search + episode selection + batch download controls + persistent download queue sidebar |
| `/watch/[id]` | `app/watch/[id]/page.tsx` | **Player** -- HTML5 video player for downloaded episodes with episode selector, keyboard shortcuts, progress tracking |
| `/search` | `app/search/page.tsx` | **Search** -- Large search input with recent search history (localStorage) + AllAnime results |
| `/settings` | `app/settings/page.tsx` | **Settings** -- Service status indicators, storage path info, network configuration |
| `/history` | `app/history/page.tsx` | **History** -- Watch history pulled from localStorage |
| `/media/[id]` | `app/media/[id]/page.tsx` | **Media Detail** -- Legacy Phase 1 media detail page |
| `/movies` | `app/movies/page.tsx` | **Movies** -- Movie category page (legacy) |
| `/tv` | `app/tv/page.tsx` | **TV** -- TV category page (legacy) |
| `/upload` | `app/upload/page.tsx` | **Upload** -- Manual media upload (legacy) |

### 4.2 Key Components

| Component | File | Description |
|-----------|------|-------------|
| `Header` | `components/Header.tsx` | Top navigation bar -- Babylon logo/branding, nav links (Home, Anime, Discover), search icon, download queue dropdown with active job count badge, user avatar |
| `Footer` | `components/Footer.tsx` | Bottom bar with links and branding |
| `HeroCarousel` | `components/HeroCarousel.tsx` | Auto-playing full-width carousel of featured anime from the library with backdrop images, title, description, and action buttons |
| `AnimeCard` | `components/AnimeCard.tsx` | Poster card showing cover image, title, native title, language badges (SUB/DUB), year. Links to anime detail page |
| `AnimeCarousel` | `components/AnimeCarousel.tsx` | Horizontal scrolling row of AnimeCards with left/right navigation arrows. Used on the home page for genre groups |
| `EpisodeGrid` | `components/EpisodeGrid.tsx` | Grid of episode tiles with download status indicators (downloaded, downloading, available). Supports batch selection for downloads |
| `HeroBanner` | `components/HeroBanner.tsx` | Full-width hero section for anime detail pages with gradient overlay on cover art |
| `PlayerPage` | `components/PlayerPage.tsx` | Video player wrapper with episode selector sidebar |
| `Player` | `components/Player.tsx` | HTML5 video player with custom controls |
| `MediaCard` | `components/MediaCard.tsx` | Legacy Phase 1 media card |
| `MediaRow` | `components/MediaRow.tsx` | Legacy Phase 1 horizontal media row |
| `MediaDetail` | `components/MediaDetail.tsx` | Legacy Phase 1 media detail view |
| `CategoryGrid` | `components/CategoryGrid.tsx` | Grid layout for media items by category |
| `ContinueWatchingCard` | `components/ContinueWatchingCard.tsx` | Card showing partially watched anime with progress bar |
| `Navbar` | `components/Navbar.tsx` | Alternative navigation component |
| `Toast` | `components/Toast.tsx` | Toast notification overlay |
| `Skeleton` | `components/Skeleton.tsx` | Loading placeholder skeletons |
| `EditMetadataModal` | `components/EditMetadataModal.tsx` | Modal for editing anime metadata |
| `IngestStatus` | `components/IngestStatus.tsx` | Phase 1 ingest daemon status display |
| `IngestStatusBadge` | `components/IngestStatusBadge.tsx` | Compact ingest status indicator |

#### shadcn/ui Primitives (`components/ui/`)

| Component | Based On |
|-----------|----------|
| `button.tsx` | Radix Slot + CVA variants |
| `badge.tsx` | Custom badge with variants |
| `avatar.tsx` | `@radix-ui/react-avatar` |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` |
| `dialog.tsx` | `@radix-ui/react-dialog` |
| `tabs.tsx` | `@radix-ui/react-tabs` |
| `progress.tsx` | `@radix-ui/react-progress` |
| `select.tsx` | `@radix-ui/react-select` |
| `slider.tsx` | `@radix-ui/react-slider` |
| `input.tsx` | Standard input with theme styling |
| `tooltip.tsx` | `@radix-ui/react-tooltip` |
| `separator.tsx` | `@radix-ui/react-separator` |

### 4.3 State Management

#### Download Store (`stores/download-store.ts`)

A Zustand store that manages the download queue across all pages.

```typescript
interface DownloadStore {
  queue: Record<string, DownloadJob>;   // jobId -> job status
  initialized: boolean;                  // has initial fetch completed
  initialize: () => Promise<void>;       // fetch existing jobs from server
  addJob: (jobId: string, job: DownloadJob) => void;
  updateJob: (jobId: string, updates: Partial<DownloadJob>) => void;
  pollJob: (jobId: string) => void;      // poll every 2s until complete
  activeCount: () => number;             // count of non-complete jobs
}
```

**Behavior:**
- On mount, `initialize()` fetches all existing download jobs from `GET /api/anime/download/status`
- Any active (non-complete) jobs start polling automatically at 2-second intervals
- The `addJob` method is called after a successful `POST /api/anime/download` to immediately show the new job in the UI
- `activeCount()` drives the badge number on the download icon in the Header

#### localStorage Persistence

| Key | Data | Used By |
|-----|------|---------|
| Watch history | Episode progress, timestamps | `/history`, Player |
| Recent searches | Last N search queries | `/search` |

### 4.4 API Client (`lib/anime-api.ts`)

All Flask API communication goes through this module. Every function calls `animeRequest<T>(path)` which prepends `/api/anime` and handles error extraction.

#### `animeRequest<T>(path, options?): Promise<T>`

Internal helper. Prepends `/api/anime` to the path, makes a `fetch` call, and throws an `Error` with the server's error message on non-2xx responses.

#### `searchAnime(q: string): Promise<AnimeSearchResult[]>`

Search for anime by title.

```
GET /api/anime/search?q={query}

Response: [
  {
    "id": "RjlXBMB5dttbGash5",
    "title": "Solo Leveling",
    "native_title": "Ore dake Level Up na Ken",
    "provider": "allanime",
    "languages": ["sub", "dub"],
    "year": 2024,
    "episode_count": 12,
    "cover_url": "https://wp.youtube-anime.com/aln.youtube-anime.com/mcovers/...",
    "description": "In a world where hunters...",
    "genres": ["Action", "Adventure", "Fantasy"],
    "status": "Finished Airing"
  }
]
```

#### `getEpisodes(animeId: string, lang?: string): Promise<EpisodeItem[]>`

Get available episodes for an anime.

```
GET /api/anime/episodes?id={animeId}&lang={sub|dub}

Response: [
  { "anime_id": "RjlXBMB5dttbGash5", "number": 1, "provider": "allanime", "language": "sub" },
  { "anime_id": "RjlXBMB5dttbGash5", "number": 2, "provider": "allanime", "language": "sub" }
]
```

#### `getStreamUrl(animeId, epNum, lang?, quality?): Promise<StreamInfo>`

Resolve a streaming URL for a specific episode. Used for preview/direct streaming (not downloads).

```
GET /api/anime/stream?anime_id={id}&ep={num}&lang={sub|dub}&quality={best|720|1080}

Response: {
  "url": "https://..../video.mp4",
  "quality": "1080",
  "format": "mp4",
  "referer": "https://allmanga.to",
  "provider_name": "Yt-mp4",
  "subtitles": [
    { "url": "https://..../English.vtt", "language": "English" }
  ]
}
```

#### `startDownload(params): Promise<{ job_id: string }>`

Start a batch download job.

```
POST /api/anime/download
Content-Type: application/json

Body: {
  "anime_id": "RjlXBMB5dttbGash5",
  "episodes": [1, 2, 3, 4, 5],
  "lang": "sub",
  "quality": "best",
  "title": "Solo Leveling",
  "cover_url": "https://...",
  "genres": ["Action", "Fantasy"],
  "description": "In a world where...",
  "year": 2024,
  "episode_count": 12,
  "status": "Finished Airing"
}

Response: {
  "job_id": "1",
  "db_job_id": 42,
  "message": "Started downloading 5 episodes"
}
```

#### `getDownloadStatus(jobId?: string): Promise<Record<string, DownloadJob>>`

Poll download progress. If `jobId` is provided, returns that specific job. Otherwise returns all jobs.

```
GET /api/anime/download/status
GET /api/anime/download/status?job_id=1

Response (all jobs): {
  "1": {
    "status": "downloading",
    "progress": 2,
    "total": 5,
    "current": 3,
    "completed": [1, 2],
    "errors": [],
    "title": "Solo Leveling"
  }
}
```

**Job status values:** `starting`, `downloading`, `complete`

#### `getLibrary(): Promise<LibraryAnime[]>`

Get all downloaded anime in the library.

```
GET /api/anime/library

Response: [
  {
    "id": "RjlXBMB5dttbGash5",
    "title": "Solo Leveling",
    "cover_url": "https://...",
    "description": "...",
    "genres": ["Action", "Fantasy"],
    "year": 2024,
    "episode_count": 12,
    "status": "Finished Airing",
    "languages": ["sub"],
    "episode_count_downloaded": 5
  }
]
```

#### `getLibraryAnime(animeId: string): Promise<LibraryAnimeDetail>`

Get anime detail with all downloaded episodes.

```
GET /api/anime/library/{animeId}

Response: {
  "id": "RjlXBMB5dttbGash5",
  "title": "Solo Leveling",
  "cover_url": "https://...",
  ...
  "episodes": [
    {
      "episode_number": 1,
      "file_path": "B:/Babylon/media/Solo Leveling/Solo Leveling - E01.mp4",
      "file_size": 314572800,
      "language": "sub",
      "downloaded_at": "2026-03-30 14:22:01"
    }
  ]
}
```

#### `buildLocalStreamUrl(animeId: string, epNum: number): string`

Build the URL for streaming a downloaded episode. Returns `/api/anime/library/{animeId}/stream/{epNum}`. This is used as the `src` for HTML5 `<video>` elements.

### 4.5 Design System

#### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#000000` | Page background (pure black) |
| `--foreground` | `#ffffff` | Primary text |
| `--card` | `#141519` | Card backgrounds, popovers, sidebar |
| `--primary` / `--accent` | `#F47521` | Crunchyroll orange -- buttons, links, highlights, ring focus |
| `--secondary` / `--muted` | `#23252b` | Secondary backgrounds, muted areas |
| `--muted-foreground` | `#a0a0a0` | Secondary/dimmed text |
| `--border` / `--input` | `#2a2c32` | Borders, input outlines |
| `--ring` | `#F47521` | Focus ring color |
| `--destructive` | oklch red | Error states, delete actions |
| `--radius` | `0.625rem` | Default border radius (10px) |

The entire theme is dark-mode only. The CSS variables are defined identically for both `:root` and `.dark` scopes.

#### Typography and Layout

- System font stack (no custom fonts loaded)
- Responsive breakpoints: mobile-first with `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- Tailwind CSS 4 with `tw-animate-css` for enter/exit animations

#### Next.js Configuration (`next.config.ts`)

```typescript
// API rewrite: all /api/anime/* requests proxy to Flask on port 5000
rewrites: [
  { source: '/api/anime/:path*', destination: 'http://localhost:5000/api/:path*' }
]

// Allowed image domains for <Image> component
remotePatterns: [
  'image.tmdb.org',         // TMDB posters (Phase 1)
  's3.nl-ams.scw.cloud',    // Scaleway S3 (Phase 1)
  'cdn.myanimelist.net',     // MAL images
  'wp.youtube-anime.com',   // AllAnime CDN (primary)
  'img.bunnyccdn.co',       // BunnyCDN (AllAnime alt)
  '*.allanime.day',         // AllAnime direct
]

// Images are unoptimized (no Next.js Image Optimization API)
images: { unoptimized: true }
```

---

## 5. Anime Server (`phase1.5/`)

### 5.1 Flask API Endpoints

The server runs at `http://0.0.0.0:5000` and accepts requests from `localhost:3001` and `192.168.1.140:3001` (CORS).

#### `GET /api/search`

Search for anime by title via AllAnime.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | -- | Search query string |

**Response:** `200 OK` -- JSON array of search results.

```json
[
  {
    "id": "RjlXBMB5dttbGash5",
    "title": "Solo Leveling",
    "native_title": "Ore dake Level Up na Ken",
    "provider": "allanime",
    "languages": ["sub", "dub"],
    "year": 2024,
    "episode_count": 12,
    "cover_url": "https://wp.youtube-anime.com/aln.youtube-anime.com/mcovers/...",
    "description": "In a world where hunters must battle...",
    "genres": ["Action", "Adventure", "Fantasy"],
    "status": "Finished Airing"
  }
]
```

**Errors:** `400` if `q` is missing, `500` on provider failure.

#### `GET /api/episodes`

List available episodes for an anime.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `id` | string | Yes | -- | AllAnime show ID |
| `lang` | string | No | `"sub"` | `"sub"` or `"dub"` |

**Response:** `200 OK` -- JSON array of episodes.

```json
[
  { "anime_id": "RjlXBMB5dttbGash5", "number": 1, "provider": "allanime", "language": "sub" },
  { "anime_id": "RjlXBMB5dttbGash5", "number": 2, "provider": "allanime", "language": "sub" }
]
```

#### `GET /api/stream`

Resolve a streaming URL for a specific episode.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `anime_id` | string | Yes | -- | AllAnime show ID |
| `ep` | string | Yes | -- | Episode number |
| `lang` | string | No | `"sub"` | `"sub"` or `"dub"` |
| `quality` | string | No | `"best"` | `"best"`, `"worst"`, `"1080"`, `"720"`, etc. |

**Response:** `200 OK`

```json
{
  "url": "https://delivery.allanime.day/.../video.mp4",
  "quality": "1080",
  "format": "mp4",
  "referer": "https://allmanga.to",
  "provider_name": "Yt-mp4",
  "subtitles": [
    { "url": "https://.../English.vtt", "language": "English" }
  ]
}
```

**Errors:** `400` if required params missing, `404` if no streams found, `500` on failure.

#### `POST /api/download`

Start a batch download job for one or more episodes.

**Request body (JSON):**

```json
{
  "anime_id": "RjlXBMB5dttbGash5",
  "episodes": [1, 2, 3],
  "lang": "sub",
  "quality": "best",
  "title": "Solo Leveling",
  "cover_url": "https://...",
  "description": "...",
  "genres": ["Action"],
  "year": 2024,
  "episode_count": 12,
  "status": "Finished Airing"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `anime_id` | string | Yes | AllAnime show ID |
| `episodes` | number[] | Yes | Episode numbers to download |
| `lang` | string | No | `"sub"` (default) or `"dub"` |
| `quality` | string | No | `"best"` (default) |
| `title` | string | No | Display title for file naming |
| `cover_url` | string | No | Cover image URL (persisted to DB) |
| `description` | string | No | Description (persisted to DB) |
| `genres` | string[] | No | Genre list (persisted to DB) |
| `year` | number | No | Air year (persisted to DB) |
| `episode_count` | number | No | Total episode count (persisted to DB) |
| `status` | string | No | Airing status (persisted to DB) |

**Response:** `200 OK`

```json
{
  "job_id": "1",
  "db_job_id": 42,
  "message": "Started downloading 3 episodes"
}
```

**Notes:**
- `job_id` is an in-memory counter (resets on server restart)
- `db_job_id` is the persistent SQLite row ID
- The download runs in a background `threading.Thread(daemon=True)`
- Anime metadata is upserted to the `anime` table before downloading begins
- Each episode is downloaded sequentially within the job

#### `GET /api/download/status`

Get download job status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `job_id` | string | No | Specific job ID. If omitted, returns all jobs. |

**Response (single job):** `200 OK`

```json
{
  "status": "downloading",
  "progress": 2,
  "total": 5,
  "current": 3,
  "completed": [1, 2],
  "errors": [],
  "title": "Solo Leveling",
  "db_job_id": 42
}
```

**Response (all jobs):** `200 OK`

```json
{
  "1": { "status": "complete", "progress": 5, "total": 5, ... },
  "2": { "status": "downloading", "progress": 1, "total": 3, ... }
}
```

**Fallback behavior:** If the in-memory `_downloads` dict is empty (server restarted), falls back to reading from the `download_job` SQLite table.

#### `GET /api/library`

List all downloaded anime with episode counts.

**Response:** `200 OK`

```json
[
  {
    "id": "RjlXBMB5dttbGash5",
    "title": "Solo Leveling",
    "cover_url": "https://...",
    "description": "...",
    "genres": ["Action", "Fantasy"],
    "year": 2024,
    "episode_count": 12,
    "status": "Finished Airing",
    "languages": ["sub"],
    "downloaded_count": 5,
    "created_at": "2026-03-30 14:22:01"
  }
]
```

**Notes:**
- Only includes anime that have at least 1 downloaded episode (INNER JOIN)
- Deduplicates by normalized title -- prefers entries with `cover_url` (from AllAnime metadata) over disk-scanned entries (which only have directory name)
- Title normalization: lowercase, strip punctuation, collapse whitespace

#### `GET /api/library/<anime_id>`

Get anime detail with all downloaded episodes.

**Response:** `200 OK`

```json
{
  "id": "RjlXBMB5dttbGash5",
  "title": "Solo Leveling",
  "cover_url": "https://...",
  "description": "...",
  "genres": ["Action", "Fantasy"],
  "year": 2024,
  "episode_count": 12,
  "status": "Finished Airing",
  "languages": ["sub"],
  "created_at": "2026-03-30 14:22:01",
  "episodes": [
    {
      "id": 1,
      "anime_id": "RjlXBMB5dttbGash5",
      "episode_number": 1.0,
      "file_path": "B:/Babylon/media/Solo Leveling/Solo Leveling - E01.mp4",
      "file_size": 314572800,
      "language": "sub",
      "quality": "best",
      "downloaded_at": "2026-03-30 14:22:01"
    }
  ]
}
```

**Errors:** `404` if anime ID not found.

#### `GET /api/library/<anime_id>/stream/<ep_num>`

Stream a downloaded episode file. Supports HTTP Range requests for video seeking.

**Headers:**
- `Range: bytes=0-` -- Standard HTTP range request

**Response (full file):** `200 OK`, `Content-Type: video/mp4`

**Response (range request):** `206 Partial Content`
- `Content-Range: bytes {start}-{end}/{total}`
- `Accept-Ranges: bytes`
- `Content-Length: {chunk_length}`

**Streaming implementation:**
- Reads file in 8192-byte chunks via a Python generator
- Supports arbitrary byte ranges for seeking
- Returns `416 Range Not Satisfiable` if start >= file_size
- Falls back to `send_file()` with conditional=True for non-range requests

**Errors:** `404` if episode not found in DB or file missing from disk.

### 5.2 AllAnime Provider (`babylon_anime/providers/allanime.py`)

#### Configuration

| Constant | Value | Purpose |
|----------|-------|---------|
| `API_URL` | `https://api.allanime.day/api` | GraphQL API endpoint |
| `BASE_URL` | `https://allanime.day` | Base URL for clock endpoints |
| `REFERER` | `https://allmanga.to` | Required Referer header for API requests |
| `ALLANIME_COVER_BASE` | `https://wp.youtube-anime.com/aln.youtube-anime.com/` | CDN base for relative cover URLs |

#### GraphQL Queries

| Query | Purpose | Key Fields |
|-------|---------|------------|
| `SEARCH_GQL` | Search anime by title | `_id`, `name`, `englishName`, `thumbnail`, `genres`, `status`, `availableEpisodesDetail` |
| `EPISODES_GQL` | Get available episode numbers | `availableEpisodesDetail` (dict with `sub` and `dub` arrays) |
| `STREAMS_GQL` | Get stream source URLs | `sourceUrls` (array of `{sourceUrl, sourceName, type}`) |
| `INFO_GQL` | Get detailed anime info | All metadata + `score`, `altNames` |

#### URL Decryption

AllAnime encrypts stream source URLs using a hex substitution cipher (derived from the `ani-cli` open-source project). The cipher is NOT XOR -- it is a static lookup table mapping 2-character hex pairs to ASCII characters.

```python
# Example encrypted URL starts with "--" prefix
encrypted = "--0c0d0f0e7a5957..."

# Step 1: Strip leading dashes
hex_str = "0c0d0f0e7a5957..."

# Step 2: Split into 2-char pairs and substitute
pairs = ["0c", "0d", "0f", "0e", "7a", "59", "57", ...]
result = "4567" + "B" + "ao" + ...  # --> "https://..."
```

The `_SUBST_TABLE` contains 70+ entries mapping hex pairs to characters (letters, digits, URL-safe symbols).

#### Source Priority

When resolving streams, sources are sorted by type:

1. **`type=player`** (highest priority) -- These decode to direct downloadable MP4 URLs (e.g., `Yt-mp4`). These are the only reliable source for actual video downloads.

2. **`/apivtwo/clock` endpoints** (fallback) -- AllAnime internal API that sometimes returns direct links. May return M3U8 playlists or MP4 URLs with subtitle tracks.

3. **`type=iframe`** (skipped) -- HTML pages with embedded JavaScript players (mp4upload, ok.ru, streamwish, etc.). These cannot be directly downloaded and are ignored.

#### Search Behavior

- Queries both `sub` and `dub` translation types in separate GraphQL calls
- Deduplicates results by anime ID, merging language availability
- Prefers English title (`englishName`), falls back to Japanese romanized name (`name`)
- Relative cover URLs (e.g., `mcovers/a_tbs/...`) are prepended with the CDN base
- Results are sorted by relevance:
  1. Exact title match
  2. Starts with query
  3. Contains query as substring
  4. All query words present
  5. Everything else

#### Cover URL Fix

AllAnime sometimes returns relative paths for cover images (e.g., `mcovers/a_tbs/dhw/xxx.webp`). The `_fix_cover_url()` function prepends the CDN base URL:

```
Relative: mcovers/a_tbs/dhw/xxx.webp
Fixed:    https://wp.youtube-anime.com/aln.youtube-anime.com/mcovers/a_tbs/dhw/xxx.webp
```

### 5.3 Provider Architecture

The provider system is designed for multiple anime sources via a plugin pattern.

#### BaseProvider (`providers/base.py`)

Abstract base class that all providers must implement:

```python
class BaseProvider(ABC):
    NAME: str = ""
    BASE_URL: str = ""

    @abstractmethod
    def search(self, query: str) -> list[SearchResult]: ...

    @abstractmethod
    def get_episodes(self, anime_id: str, lang: LanguageType) -> list[Episode]: ...

    @abstractmethod
    def get_streams(self, anime_id: str, episode: Episode) -> list[Stream]: ...

    def get_info(self, anime_id: str) -> Optional[dict]:  # optional
        return None
```

Every provider gets a `requests.Session` with:
- Automatic retries (3 attempts with backoff on 500/502/503/504)
- Firefox User-Agent header
- HTTP and HTTPS adapter mounting

#### Provider Registry (`providers/__init__.py`)

```python
_PROVIDERS = {
    "allanime": AllAnimeProvider,   # Primary, actively used
    "animekai": AnimeKaiProvider,   # Secondary, available
}
DEFAULT_PROVIDER = "allanime"
```

#### Available Providers

| Provider | Status | Description |
|----------|--------|-------------|
| `allanime` | Active (default) | AllAnime GraphQL API scraping |
| `animekai` | Available | AnimeKai provider (secondary source) |

### 5.4 Download Manager (`babylon_anime/download.py`)

Supports three download strategies:

#### Direct MP4 Download (`_mp4_download`)

Used for `type=player` sources that return direct MP4 URLs.

- Streams response body in 8192-byte chunks
- Tracks progress via `Content-Length` header
- Sets `Referer` header if provided by stream
- Deletes partial file on failure

#### HLS M3U8 Download (`_m3u8_download`)

Used for M3U8 playlist sources from clock endpoints.

1. Fetches the M3U8 playlist
2. Extracts segment URLs (resolving relative paths)
3. Downloads segments in parallel (8 workers via `ThreadPoolExecutor`)
4. Each segment retries up to 3 times
5. Concatenates all `.ts` segments into final output file
6. Falls back to FFmpeg if segment download fails

#### FFmpeg Download (`_ffmpeg_download`)

Fallback for any format. Runs `ffmpeg` as a subprocess:

```
ffmpeg -y -headers "Referer: ..." -i {stream_url} -c copy -bsf:a aac_adtstoasc {output_path}
```

- 1-hour timeout
- Copy codec (no transcoding)
- AAC bitstream filter for ADTS-to-ASC conversion

#### Subtitle Download (`download_subtitles`)

Downloads all subtitle tracks from a stream to a `subs/` subdirectory. Detects format by URL extension (`.vtt`, `.srt`, `.ass`).

### 5.5 Library System

#### SQLite Database (`db.py`)

**Location:** `B:\Babylon\data\phase15.db`

**Connection management:**
- Thread-local connections (`threading.local()`)
- WAL journal mode for concurrent reads
- Foreign keys enabled

**Schema:**

```sql
CREATE TABLE anime (
    id              TEXT PRIMARY KEY,       -- AllAnime ID or directory name
    title           TEXT NOT NULL,
    cover_url       TEXT,
    description     TEXT,
    genres          TEXT,                    -- JSON array string
    year            INTEGER,
    episode_count   INTEGER,
    status          TEXT,                    -- "Finished Airing", "Currently Airing", etc.
    languages       TEXT,                    -- JSON array string
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE downloaded_episode (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    anime_id        TEXT NOT NULL,           -- FK -> anime.id
    episode_number  REAL NOT NULL,           -- float for 1.5-type episodes
    file_path       TEXT NOT NULL,           -- absolute path on disk
    file_size       INTEGER,                 -- bytes
    language        TEXT DEFAULT 'sub',
    quality         TEXT,
    downloaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (anime_id) REFERENCES anime(id),
    UNIQUE(anime_id, episode_number, language)
);

CREATE TABLE download_job (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    anime_id            TEXT NOT NULL,
    title               TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'queued',  -- queued|downloading|complete
    total_episodes      INTEGER NOT NULL,
    completed_episodes  TEXT DEFAULT '[]',               -- JSON array of episode numbers
    errors              TEXT DEFAULT '[]',               -- JSON array of error strings
    current_episode     REAL,                            -- currently downloading
    progress            INTEGER DEFAULT 0,               -- episodes completed so far
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key operations:**

| Function | Description |
|----------|-------------|
| `init_db()` | Create tables if not exists |
| `upsert_anime(data)` | INSERT OR UPDATE anime metadata (COALESCE preserves existing non-null fields) |
| `insert_downloaded_episode(...)` | Record a downloaded episode (raises on duplicate) |
| `get_downloaded_episode(anime_id, ep_num)` | Look up episode by ID + number |
| `get_library()` | All anime with >= 1 downloaded episode, deduplicated by normalized title |
| `get_anime_detail(anime_id)` | Anime metadata + all downloaded episodes |
| `create_job(anime_id, title, total)` | Create download job, returns row ID |
| `update_job(job_id, **kwargs)` | Update job fields (status, progress, errors, etc.) |
| `get_job(job_id)` | Get single job with parsed JSON fields |
| `get_all_jobs()` | Get all jobs ordered by created_at DESC |

#### Disk Scanner (`library.py`)

On server startup, `reconcile_with_db(media_path)` scans the media directory:

1. Lists all subdirectories in `B:\Babylon\media`
2. For each subdirectory, finds files matching `.mp4`, `.ts`, `.mkv`
3. Parses episode numbers from filename pattern `E(\d+)` (e.g., `Solo Leveling - E01.mp4` -> episode 1)
4. Upserts anime with directory name as both ID and title
5. Inserts downloaded episodes (silently skips duplicates via UNIQUE constraint)

This ensures the database always reflects what is actually on disk, even if the DB was deleted (restart-fly.bat) or episodes were manually added/removed.

### 5.6 Data Models (`babylon_anime/models.py`)

```python
class LanguageType(Enum):
    SUB = "sub"
    DUB = "dub"

class Quality(Enum):
    Q360 = "360"
    Q480 = "480"
    Q720 = "720"
    Q1080 = "1080"
    BEST = "best"
    WORST = "worst"

@dataclass
class SearchResult:
    id: str
    title: str
    provider: str
    native_title: Optional[str]     # Japanese romanized name
    languages: list[LanguageType]
    year: Optional[int]
    episode_count: Optional[int]
    cover_url: Optional[str]
    description: Optional[str]
    genres: list[str]
    status: Optional[str]           # "AIRING", "FINISHED", etc.

@dataclass
class Episode:
    anime_id: str
    number: float                   # float for 1.5-type episodes
    provider: str
    language: LanguageType
    title: Optional[str]

@dataclass
class Subtitle:
    url: str
    language: str
    label: Optional[str]

@dataclass
class Stream:
    url: str
    quality: Optional[str]          # "1080", "720", etc.
    format: str                     # "m3u8" or "mp4"
    referer: Optional[str]
    subtitles: list[Subtitle]
    provider_name: str              # which source served this

@dataclass
class Anime:
    id: str
    title: str
    provider: str
    languages: list[LanguageType]
    year: Optional[int]
    episode_count: Optional[int]
    cover_url: Optional[str]
    description: Optional[str]
    genres: list[str]
    status: Optional[str]
    alt_titles: list[str]
```

---

## 6. Control Panel (`control-panel/`)

### 6.1 Overview

The Babylon Control Panel is a standalone desktop application for managing the Alienware server. It is built with Python's `customtkinter` library for a modern dark-themed UI and provides service management, monitoring, and maintenance capabilities.

**Version:** 1.3.0

### 6.2 Configuration Constants

```python
BABYLON_ROOT   = Path(r"B:\Babylon\app")
MEDIA_PATH     = Path(r"B:\Babylon\media")
DATA_PATH      = Path(r"B:\Babylon\data")
DOWNLOADS_RAW  = Path(r"B:\Babylon\downloads\raw")
DOWNLOADS_PROCESSED = Path(r"B:\Babylon\downloads\processed")
PM2_LOG_DIR    = Path(r"C:\Users\rutis\.pm2\logs")

API_HOST = "localhost"
API_PORT = 3000
WEB_PORT = 3001
ANIME_PORT = 5000
LAN_WEB_URL = "http://192.168.1.140:3001"
```

### 6.3 Service Monitoring

The panel monitors three services:

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| `babylon-api` | 3000 | `http://localhost:3000/api/health` |
| `babylon-web` | 3001 | `http://localhost:3001` |
| `babylon-anime` | 5000 | `http://localhost:5000/api/health` |

Health checks use both port connectivity (`socket.create_connection`) and HTTP GET requests. The panel refreshes status every 5 seconds (`REFRESH_INTERVAL_MS = 5000`).

### 6.4 Panel Sections

| Section | Features |
|---------|----------|
| **Dashboard** | Service status indicators (green/red), anime count, disk usage, LAN IP, git branch/commit info |
| **Services** | Per-service start/stop/restart via PM2 commands, Pull & Rebuild button (git pull + pnpm build + pm2 reload) |
| **Downloads** | Browse downloaded library, clear all downloads |
| **Storage** | Disk usage breakdown by directory (media, data, downloads), clean temp files |
| **Logs** | Live PM2 log viewer, polled every 2 seconds (`LOG_POLL_INTERVAL_MS = 2000`) |
| **Settings** | Maintenance actions: Update (git pull), Rebuild (pnpm build), Restart Clean (wipe + rebuild), Restart Fly (keep media + rebuild) |

### 6.5 Theme Colors

| Constant | Hex | Usage |
|----------|-----|-------|
| `CLR_BG` | `#1a1a2e` | Main background |
| `CLR_SIDEBAR` | `#16213e` | Sidebar background |
| `CLR_CARD` | `#1f2937` | Card backgrounds |
| `CLR_CARD_BORDER` | `#374151` | Card borders |
| `CLR_ACCENT` | `#7c3aed` | Purple accent (buttons, highlights) |
| `CLR_ACCENT_HOVER` | `#6d28d9` | Button hover state |
| `CLR_GREEN` | `#22c55e` | Service online / success |
| `CLR_RED` | `#ef4444` | Service offline / error |
| `CLR_YELLOW` | `#eab308` | Warnings |
| `CLR_TEXT` | `#e2e8f0` | Primary text |
| `CLR_TEXT_DIM` | `#94a3b8` | Secondary text |

### 6.6 Technical Notes

- **Panel switching** uses `grid_remove()` / `grid()` instead of `tkraise()` because `tkraise` does not work reliably with customtkinter's scrollable frames
- **Thread safety:** All data gathering (service checks, disk scans, PM2 commands) runs in background threads. UI updates are dispatched to the main tkinter thread
- **Hidden subprocesses:** The `CREATE_NO_WINDOW = 0x08000000` creation flag is used for all `subprocess.run` calls to prevent CMD windows from flashing on screen
- **PM2 interaction:** All service management commands route through `pm2 start/stop/restart` using the ecosystem config path
- **LAN IP detection:** Uses a UDP socket connection to `8.8.8.8:80` (no actual data sent) to determine the machine's LAN-facing IP address

### 6.7 Building and Running

#### Run from Source

```cmd
cd control-panel
run.bat
```

The `run.bat` script automatically creates a Python venv if missing, installs dependencies, and launches `panel.py`.

#### Compile to Executable

```cmd
cd control-panel
build.bat
```

Produces `dist\Babylon Control Panel.exe` via PyInstaller (`--onefile --windowed`).

#### Dependencies (`requirements.txt`)

```
customtkinter>=5.2.0
psutil>=5.9.0
requests>=2.31.0
pyinstaller>=6.0.0
```

---

## 7. Deployment

### 7.1 Alienware Server Hardware

| Spec | Value |
|------|-------|
| Model | Alienware M15 R3 |
| CPU | Intel Core i7-10750H (6C/12T) |
| GPU | NVIDIA GeForce RTX 2070 (8GB) |
| RAM | 16 GB DDR4 |
| Storage | B: drive -- 476 GB SSD (dedicated Babylon partition) |
| OS | Windows 10 Home, Build 19045 |
| Network | Ethernet, static IP `192.168.1.140`, MAC `C0-3E-BA-7F-5E-60` |
| Role | Headless server -- lid closed, no monitor, boots to desktop automatically |

### 7.2 Windows Configuration

The Alienware is configured as a headless always-on server:

| Setting | Value | Why |
|---------|-------|-----|
| Auto-login | Enabled (via `netplwiz`) | Boots to desktop without password prompt |
| Power plan | High Performance | Prevents throttling |
| Display timeout | Never | No display attached |
| Sleep | Never | Must stay on 24/7 |
| Lid close action | Do nothing | Lid stays closed |
| Hibernate | Disabled (`powercfg /hibernate off`) | Prevents unexpected shutdown |
| USB selective suspend | Disabled | Prevents USB device disconnects |

### 7.3 PM2 Services (`deploy/ecosystem.config.cjs`)

```javascript
module.exports = {
  apps: [
    {
      name: 'babylon-api',
      cwd: 'B:/Babylon/app',
      script: 'packages/api/dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        LOCAL_MEDIA_PATH: 'B:/Babylon/media',
        DATABASE_URL: 'file:B:/Babylon/data/babylon.db',
        ALLOWED_ORIGINS: 'http://localhost:3001,http://192.168.1.140:3001',
        INGEST_STATE_DIR: 'B:/Babylon/app/ingest',
      },
      node_args: '--experimental-vm-modules',
      windowsHide: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'babylon-web',
      cwd: 'B:/Babylon/app/packages/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'http://localhost:3000/api',
      },
      windowsHide: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'babylon-anime',
      cwd: 'B:/Babylon/app/phase1.5',
      script: 'venv/Scripts/pythonw.exe',
      args: 'server.py',
      env: {
        FLASK_ENV: 'production',
      },
      windowsHide: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
```

**Key details:**
- All three services use `windowsHide: true` to prevent CMD windows from appearing
- The Flask server runs via `pythonw.exe` (windowless Python) from a local venv
- Each service allows up to 10 restarts with a 5-second delay between attempts
- `--experimental-vm-modules` flag is required for the Fastify API's ESM imports

### 7.4 Environment Variables

#### babylon-api (Fastify)

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `3000` | API server port |
| `LOCAL_MEDIA_PATH` | `B:/Babylon/media` | Downloaded media root |
| `DATABASE_URL` | `file:B:/Babylon/data/babylon.db` | Drizzle ORM SQLite path |
| `ALLOWED_ORIGINS` | `http://localhost:3001,http://192.168.1.140:3001` | CORS allowed origins |
| `INGEST_STATE_DIR` | `B:/Babylon/app/ingest` | Ingest daemon state directory |

#### babylon-web (Next.js)

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production mode |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api` | Fastify API base URL |

#### babylon-anime (Flask)

| Variable | Value | Description |
|----------|-------|-------------|
| `FLASK_ENV` | `production` | Production mode |
| `DOWNLOAD_OUTPUT` | `B:/Babylon/media` (default in code) | Download destination directory |
| `DOWNLOAD_DB` | `B:/Babylon/data/phase15.db` (default in code) | SQLite database path |

### 7.5 Maintenance Scripts

#### `restart-clean.bat` -- Full Reset

Stops everything, wipes all media and database, pulls latest code, rebuilds, and starts fresh. Use when you want a completely clean slate.

```
Step 1: pm2 stop all
Step 2: Delete B:\Babylon\media\ (rm + recreate)
Step 3: Delete B:\Babylon\data\phase15.db
Step 4: git pull origin master
Step 5: pnpm build
Step 6: pm2 start all && pm2 save
```

#### `restart-fly.bat` -- Soft Reset

Keeps downloaded media but resets the database. Use when the database is corrupted or you want to re-scan the library from disk.

```
Step 1: pm2 stop all
Step 2: Delete B:\Babylon\data\phase15.db
Step 3: git pull origin master
Step 4: pnpm build
Step 5: pm2 start all && pm2 save
```

After a fly restart, the Flask server's startup `reconcile_with_db()` call will re-scan the media directory and rebuild the database from the files on disk.

#### `deploy/autopull.bat` -- Auto-Deploy Polling

Runs in a loop, checking for new commits every 60 seconds:

```
Loop:
  1. git fetch origin master
  2. Compare local HEAD vs origin/master
  3. If different:
     - git pull origin master
     - pnpm install --frozen-lockfile
     - pnpm build (continue on failure, keep old version)
     - pm2 reload all
  4. Sleep 60 seconds
```

Start this in a terminal on the Alienware for hands-free deployment whenever you push to `origin master`.

#### `deploy/post-receive` -- Git Hook Deploy

A post-receive hook installed in `B:\Babylon\repo.git\hooks\` for push-to-deploy via a bare git repository on the Alienware. Triggers on `git push alienware master`.

### 7.6 Auto-Start on Boot

PM2 processes are resurrected on Windows login via a scheduled task:

```powershell
schtasks /create /tn "PM2 Startup" /tr "cmd /c pm2 resurrect" /sc onlogon /rl highest /f
```

Combined with Windows auto-login (no password prompt), the Alienware boots up, logs in, and PM2 resurrects all saved processes automatically.

### 7.7 Accessing from Other Devices

| Service | URL | Notes |
|---------|-----|-------|
| Web UI (primary) | `http://192.168.1.140:3001` | Full Babylon interface |
| Fastify API health | `http://192.168.1.140:3000/api/health` | Returns `{"status":"ok"}` |
| Flask API | `http://192.168.1.140:5000/api/library` | Direct Flask access (bypassing Next.js) |
| qBittorrent WebUI | `http://192.168.1.140:8080` | Legacy torrent client |

All URLs are LAN-only. Replace `192.168.1.140` with the Alienware's actual static IP if different.

---

## 8. Development Workflow

### 8.1 Making Changes

The standard development cycle:

1. **Edit code** on your personal laptop (the development machine)
2. **Push to GitHub:** `git push origin master`
3. **Deploy to Alienware** -- one of three methods:
   - **Control Panel:** Click "Pull & Rebuild" in the Services panel
   - **AutoPull:** If `autopull.bat` is running, it picks up the change within 60 seconds
   - **Manual:**
     ```cmd
     cd /d B:\Babylon\app
     git pull origin master
     pnpm build
     pm2 restart all
     ```

### 8.2 Adding New Anime Sources (Providers)

To add a new anime source:

1. **Create a new provider** in `phase1.5/babylon_anime/providers/`:

```python
# phase1.5/babylon_anime/providers/newprovider.py

from .base import BaseProvider
from ..models import SearchResult, Episode, Stream, LanguageType

class NewProvider(BaseProvider):
    NAME = "newprovider"
    BASE_URL = "https://example.com"

    def search(self, query: str) -> list[SearchResult]:
        # Implement search logic
        ...

    def get_episodes(self, anime_id: str, lang: LanguageType = LanguageType.SUB) -> list[Episode]:
        # Implement episode listing
        ...

    def get_streams(self, anime_id: str, episode: Episode) -> list[Stream]:
        # Implement stream resolution
        ...

    def get_info(self, anime_id: str) -> dict | None:
        # Optional: return detailed metadata
        ...
```

2. **Register in the provider registry** (`phase1.5/babylon_anime/providers/__init__.py`):

```python
from .newprovider import NewProvider

_PROVIDERS: dict[str, type[BaseProvider]] = {
    "allanime": AllAnimeProvider,
    "animekai": AnimeKaiProvider,
    "newprovider": NewProvider,  # Add here
}
```

3. **Test locally:**

```cmd
cd phase1.5
python -c "from babylon_anime.providers import get_provider; p = get_provider('newprovider'); print(p.search('naruto'))"
```

### 8.3 Testing Locally

#### Flask Server (standalone)

```cmd
cd phase1.5
start.bat
```

Or manually:

```cmd
cd phase1.5
python server.py
```

Runs at `http://localhost:5000`. Test with:

```
http://localhost:5000/api/search?q=naruto
http://localhost:5000/api/library
```

#### Quick Integration Test

```cmd
cd phase1.5
python test_quick.py
```

Tests search + stream resolution end-to-end.

#### Next.js Frontend (dev mode)

```cmd
cd packages/web
pnpm dev
```

Runs at `http://localhost:3000` (dev) or the configured port. Note: the Flask server must also be running for API calls to work (Next.js rewrites `/api/anime/*` to `localhost:5000`).

#### Full Stack (PM2)

```cmd
pm2 start deploy/ecosystem.config.cjs
```

### 8.4 Project Structure Conventions

- **Monorepo:** pnpm workspaces + Turborepo
- **Packages:** `packages/web` (frontend), `packages/api` (API), `packages/shared` (shared types)
- **Python code:** `phase1.5/` is a standalone Flask project with its own venv and requirements.txt
- **No test framework:** Manual testing via `test_quick.py` and browser verification
- **Deployment config:** All deployment-related files live in `deploy/`
- **Maintenance scripts:** Root-level `.bat` files for common operations

---

## 9. Troubleshooting

### Common Issues

#### PM2 EPERM / Stale Pipe Error

**Symptom:** `pm2 start` or `pm2 restart` fails with EPERM or stale pipe errors.

**Fix:**
1. Open an **Administrator** Command Prompt
2. Run `pm2 kill`
3. Close the admin prompt
4. Open a **regular** Command Prompt (not admin)
5. Run `pm2 start deploy/ecosystem.config.cjs && pm2 save`

PM2 creates pipes tied to the user session. Running as admin creates pipes that regular user sessions cannot access.

#### Services Show Offline in Control Panel

**Symptom:** All three services show red in the control panel even though PM2 shows them running.

**Fix:**
```cmd
pm2 start deploy\ecosystem.config.cjs
pm2 save
```

If PM2 itself is not running:
```cmd
pm2 resurrect
```

#### Library Shows Duplicates

**Symptom:** Same anime appears multiple times in the library with slightly different titles.

**Cause:** Disk-scanned entries (using directory name as ID) coexist with AllAnime entries (using AllAnime ID). The deduplication logic in `get_library()` normalizes titles but edge cases can slip through.

**Fix:**
```cmd
del B:\Babylon\data\phase15.db
pm2 restart babylon-anime
```

The server will re-scan the media directory and rebuild the database. If you then re-download from AllAnime, the metadata (cover, genres, etc.) will be re-attached.

#### Broken / Missing Cover Images

**Symptom:** Anime cards show broken image icons or placeholder backgrounds.

**Causes:**
1. AllAnime CDN returns relative URLs without the base prefix
2. CDN endpoint is temporarily down
3. The specific cover URL has moved

**Fix:** The `_fix_cover_url()` function in `allanime.py` handles relative-to-absolute conversion. If images are still broken, check if the CDN base URL (`wp.youtube-anime.com`) is accessible.

#### Download Fails -- "No Streams Found"

**Symptom:** Download job reports `Ep N: no streams` for all episodes.

**Causes:**
1. AllAnime has removed the anime or the specific episode
2. Only `iframe` sources are available (which are skipped)
3. The hex substitution cipher has changed

**Diagnosis:**
```python
# In phase1.5 directory
from babylon_anime import get_episodes, get_stream
from babylon_anime.models import LanguageType, Episode

eps = get_episodes("ANIME_ID")
print(f"Found {len(eps)} episodes")

if eps:
    stream = get_stream(eps[0])
    print(f"Stream: {stream}")
```

Check if `type=player` sources are available in the GraphQL response.

#### "Cannot read properties of null" in Frontend

**Symptom:** React error boundary shows this error, typically on anime detail or library pages.

**Cause:** The API returned data in an unexpected shape -- usually a field that the frontend expects to be an object/array is `null`.

**Fix:** Check the Flask API response for the failing endpoint. Common culprits:
- `genres` or `languages` stored as `null` instead of `"[]"` in SQLite
- `cover_url` is `null` and the frontend tries to use it as a string
- The anime ID contains special characters that break URL encoding

#### CMD Windows Flashing on Screen

**Symptom:** Brief command prompt windows appear and disappear on the Alienware desktop.

**Cause:** A subprocess call is not using the `CREATE_NO_WINDOW` flag, or a service is not configured with `windowsHide: true`.

**Fix:**
- Verify `windowsHide: true` in `ecosystem.config.cjs` for all three services
- Verify the Flask server uses `pythonw.exe` (not `python.exe`)
- Check the control panel uses `CREATE_NO_WINDOW = 0x08000000` for all `subprocess.run` calls

#### Flask Server Crashes on Startup

**Symptom:** `babylon-anime` service keeps restarting in PM2 logs.

**Common causes:**
1. Python venv is missing or corrupted -- recreate with `python -m venv venv && venv\Scripts\pip install -r requirements.txt`
2. Port 5000 is already in use -- check with `netstat -ano | findstr :5000`
3. SQLite database is locked -- delete `phase15.db` and restart

#### Next.js API Rewrites Not Working

**Symptom:** Frontend shows network errors, but Flask is running fine at `http://localhost:5000`.

**Cause:** The Next.js rewrite rule only works in production if the Next.js server and Flask server are on the same machine. The rewrite destination `http://localhost:5000` is relative to the Next.js server.

**Fix:** Verify the rewrite in `next.config.ts`:
```typescript
async rewrites() {
  return [
    { source: '/api/anime/:path*', destination: 'http://localhost:5000/api/:path*' }
  ];
}
```

After changing Next.js config, rebuild: `pnpm build` in `packages/web`.

#### Disk Space Running Low

**Symptom:** Downloads fail or the system becomes sluggish.

**Check:**
```powershell
Get-PSDrive B
```

**Management options:**
1. Delete unwatched anime from `B:\Babylon\media\` and restart Flask to re-scan
2. Clean temp files from `B:\Babylon\downloads\raw` and `B:\Babylon\downloads\processed`
3. Use the Control Panel's Storage section to see per-directory breakdown

---

## 10. Phase History

### Phase 1 -- Cloud Architecture (Deprecated)

**Dates:** Early 2026-03 to 2026-03-28

**Architecture:**
- **Hosting:** UpCloud VPS (Helsinki) at $112/month
- **Storage:** Scaleway Object Storage (S3-compatible, Amsterdam)
- **Frontend:** Vercel (serverless deployment)
- **DNS:** IONOS -- `api.internalrr.info` A record pointing to VPS

**Ingest Pipeline:**
1. Python daemon monitors Nyaa.si for new releases from trusted encoders (Judas, Ember, ASW, SubsPlease, etc.)
2. Sends torrents to qBittorrent via WebUI API
3. qBittorrent downloads to raw directory
4. FFmpeg transcodes to web-friendly MP4 (NVENC on VPS would have been CPU-only)
5. Upload to Scaleway S3
6. Register in SQLite database via Fastify API

**Why it failed:**
- Scaleway credits ran out, blocking the entire S3 upload step
- UpCloud VPS cost $112/month for a machine that mostly sat idle
- Upload bandwidth from VPS to S3 was a bottleneck
- End-to-end pipeline was never completed

**What remains:**
- `ingest/daemon.py` -- Nyaa monitoring code (still in repo, deprecated)
- `packages/api/` -- Fastify server still runs for legacy progress tracking
- Phase 1 database schema at `B:\Babylon\data\babylon.db`
- TMDB integration code in the API (unused by Phase 1.5)

### Phase 1.5 -- AllAnime Streaming (Current)

**Dates:** 2026-03-28 onward

**Key change:** Instead of downloading from Nyaa torrents, directly scrape AllAnime's GraphQL API for stream URLs and download MP4 files. This eliminates the entire torrent + transcode pipeline.

**What it provides:**
- Search anime by title via AllAnime
- Browse available episodes (sub/dub)
- Resolve stream URLs (decrypt AllAnime's hex cipher, prioritize `type=player` sources)
- Download episodes directly as MP4 to local disk
- SQLite library management with disk reconciliation
- Crunchyroll-inspired frontend with browsing, searching, downloading, and playback

**Limitations:**
- Depends on AllAnime's availability and URL structure
- Stream quality limited to what AllAnime provides (usually 1080p from Yt-mp4 sources)
- No torrent-based batch downloading for higher quality encodes
- Single-threaded episode downloads within a job (sequential, not parallel)

### Phase 2 -- Local Hosting (Current)

**Dates:** 2026-03-28 onward (concurrent with Phase 1.5)

**Key change:** Move all services from cloud infrastructure to the local Alienware laptop.

**What changed from Phase 1:**
1. **Storage:** Scaleway S3 -> local `B:\Babylon\media` on the Alienware's SSD
2. **Hosting:** UpCloud VPS + Vercel -> all three services on the Alienware via PM2

**What stayed the same:** Database schema, API routes (mostly), frontend UI structure, monorepo layout.

**Benefits:**
- Zero monthly cost (no VPS, no S3, no Vercel)
- No upload bandwidth bottleneck (everything is local)
- NVENC hardware transcoding available if needed (RTX 2070)
- LAN access is faster than internet round-trip
- Full control over the hardware

**External services to decommission:**
- [ ] Vercel project `babylon-web`
- [ ] Scaleway Object Storage
- [ ] UpCloud VPS ($112/month)
- [ ] IONOS DNS `api.internalrr.info` A record

---

## Appendix A: File Naming Convention

Downloaded episodes follow this pattern:

```
{SafeTitle} - E{NN}.{ext}
```

Where:
- `{SafeTitle}` = anime title with non-alphanumeric characters (except space, dash, underscore) replaced by underscores
- `{NN}` = zero-padded episode number (2 digits, e.g., `01`, `02`, `12`)
- `{ext}` = `mp4` for direct downloads, `ts` for M3U8/HLS downloads

**Examples:**
```
Solo Leveling - E01.mp4
Solo Leveling - E02.mp4
Ore dake Level Up na Ken - E01.mp4
```

Subtitles are stored in a `subs/` subdirectory:
```
{AnimeDir}/subs/{Language}.{ext}
```

Where `{ext}` is `vtt`, `srt`, or `ass` depending on the source.

## Appendix B: TypeScript Types Reference

These are the primary types used in the frontend API client (`lib/anime-api.ts`):

```typescript
interface AnimeSearchResult {
  id: string;
  title: string;
  native_title: string | null;
  provider: string;
  languages: string[];
  year: number | null;
  episode_count: number | null;
  cover_url: string | null;
  description: string | null;
  genres: string[];
  status: string | null;
}

interface EpisodeItem {
  anime_id: string;
  number: number;
  provider: string;
  language: string;
}

interface StreamInfo {
  url: string;
  quality: string | null;
  format: string;
  referer: string | null;
  provider_name: string;
  subtitles: Array<{ url: string; language: string }>;
}

interface DownloadJob {
  status: string;       // "starting" | "downloading" | "complete"
  progress: number;     // episodes completed
  total: number;        // total episodes in job
  current: number | null; // currently downloading episode number
  completed: number[];  // completed episode numbers
  errors: string[];     // error messages
  title: string;        // anime title
}

interface LibraryAnime {
  id: string;
  title: string;
  cover_url: string | null;
  description: string | null;
  genres: string[];
  year: number | null;
  episode_count: number | null;
  status: string | null;
  languages: string[];
  episode_count_downloaded: number;
}

interface DownloadedEpisode {
  episode_number: number;
  file_path: string;
  file_size: number | null;
  language: string;
  downloaded_at: string;
}

interface LibraryAnimeDetail extends LibraryAnime {
  episodes: DownloadedEpisode[];
}
```

## Appendix C: Quick Reference Commands

### Service Management

```cmd
:: Start all services
pm2 start deploy\ecosystem.config.cjs

:: Save process list (for resurrect on reboot)
pm2 save

:: Restart all services
pm2 restart all

:: View logs
pm2 logs
pm2 logs babylon-anime --lines 50

:: Check status
pm2 status

:: Stop everything
pm2 stop all

:: Kill PM2 daemon (nuclear option)
pm2 kill
```

### Git Operations

```cmd
:: Pull latest on Alienware
cd /d B:\Babylon\app
git pull origin master

:: Push from dev machine
git push origin master

:: Push to Alienware bare repo (if configured)
git push alienware master
```

### Build

```cmd
:: Full build (from repo root)
cd /d B:\Babylon\app
pnpm install --frozen-lockfile
pnpm build

:: Frontend only
cd /d B:\Babylon\app\packages\web
pnpm build

:: Flask server (no build needed -- Python)
:: Just restart the PM2 process
pm2 restart babylon-anime
```

### Database

```cmd
:: View database (requires sqlite3 CLI)
sqlite3 B:\Babylon\data\phase15.db

:: Common queries
.tables
SELECT title, COUNT(*) as eps FROM anime a JOIN downloaded_episode de ON de.anime_id = a.id GROUP BY a.id;
SELECT * FROM download_job ORDER BY created_at DESC LIMIT 5;

:: Reset database (Flask will re-scan media on restart)
del B:\Babylon\data\phase15.db
pm2 restart babylon-anime
```

### Health Checks

```cmd
:: From the Alienware itself
curl http://localhost:3000/api/health
curl http://localhost:5000/api/library
curl http://localhost:3001

:: From another device on the LAN
curl http://192.168.1.140:3000/api/health
curl http://192.168.1.140:5000/api/search?q=naruto
```
