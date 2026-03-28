# Babylon Phase 1 — Retrospective

**Date:** 2026-03-28
**Status:** Deprecated — superseded by Phase 2 (local Alienware hosting)

---

## 1. What Was Built

Babylon is a personal anime/media streaming platform built as a TypeScript monorepo (pnpm + Turborepo) with a Python ingest daemon.

### Plan 1: Backend Foundation (`packages/shared` + `packages/api`)

- **packages/shared**: Zod validation schemas + TypeScript types for all API contracts (media CRUD, upload, progress, ingest, watchlist)
- **packages/api**: Fastify 5 HTTP server with:
  - Drizzle ORM + better-sqlite3 (8 tables: media, season, episode, mediaFile, subtitle, watchProgress, ingestSeen, ingestFailed)
  - Scaleway S3 presigned URL generation for upload/stream
  - TMDB + Jikan (MAL) metadata clients with rate limiting
  - PIN authentication middleware, CORS, rate limiting (100 req/min)
  - 8 route groups: health, media, metadata, upload, stream, progress, library, ingest
  - Watchlist manager (filesystem IPC with Python daemon via JSON files)

### Plan 2: Ingest Pipeline + VPS Deployment (`ingest/` + `deploy/`)

- **ingest/**: Python 3.12 daemon with 10 modules:
  - `daemon.py` — main loop: RSS polling + backlog batch processing
  - `rss_poller.py` — SubsPlease RSS polling + Nyaa HTML scraping (upgraded from RSS-only during Phase 1)
  - `downloader.py` — qBittorrent WebUI integration (add magnet, wait for metadata, selective file priority, wait for completion)
  - `filename_parser.py` — 5-pattern regex episode extraction (38 unit tests) + vN version suffix support
  - `subtitle_extractor.py` — ffprobe subtitle stream detection + ffmpeg WebVTT extraction
  - `transcoder.py` — ffmpeg MKV→MP4 transcoding (modified to remux-only `-c copy` at end of Phase 1)
  - `uploader.py` — boto3 multipart S3 upload to Scaleway
  - `registrar.py` — Babylon API client + direct SQLite access for ingest_seen/ingest_failed
  - `disk_monitor.py` — disk space checks (pause at 85%, resume at 75%)
  - `config.py` — environment variable loader
  - `backlog_scan.py` — dry-run scan script (all 80 titles found on Nyaa)
- **deploy/**: VPS provisioning
  - `setup.sh` — idempotent Ubuntu LTS setup (Node 22, Python 3.12, ffmpeg, qBittorrent-nox, nginx, certbot)
  - `babylon-api.service` + `babylon-ingest.service` — systemd units
  - `nginx/babylon.conf` — reverse proxy (SSL, 2GB body limit, WebSocket-ready)
  - `.env.example` — all environment variables documented

### Plan 3: Web Frontend (`packages/web`)

- Next.js 15 App Router with React 19
- Pages: Home (hero banner, continue watching, recently added, genre rows), Anime/Movies/TV catalogs, Media detail, Video player, Search, Upload, Discover (Jikan search + queue to ingest)
- Components: Navbar, MediaCard, HeroBanner, MediaRow, Player, EditMetadataModal, IngestStatus panel (portal-based sidebar with watchlist display)
- Zustand state management, Tailwind CSS 4
- API client (`src/lib/api.ts`) with PIN auth header injection

### Plan 4: CLI Tool (`packages/cli`)

- Commander.js CLI with `babylon` binary
- Upload, search, and library management commands
- Never deployed or used in practice

### Plan 5: Android App (`android/`)

- Kotlin Android app (React Native was NOT used — native Android with Gradle)
- 12 tasks implemented: project setup, data layer (Room + Retrofit), Hilt DI, dark theme + navigation, shared UI components, home screen, detail screen, ExoPlayer video player with PiP, search, upload with presigned S3, discover + ingest status
- GitHub Actions workflow for APK builds
- Never deployed to a device with a running backend

---

## 2. Current Deployment State

| Component | Status | Location |
|-----------|--------|----------|
| **API** (`packages/api`) | Running on VPS | UpCloud VPS 212.147.228.229, systemd `babylon-api` |
| **Web** (`packages/web`) | Deployed on Vercel | babylon-web-lime.vercel.app, auto-deploys from GitHub |
| **Ingest daemon** (`ingest/`) | Running on VPS | systemd `babylon-ingest`, actively searching Nyaa |
| **qBittorrent** | Running on VPS | localhost:8080 on VPS |
| **CLI** (`packages/cli`) | Never deployed | Code exists, untested |
| **Android** (`android/`) | Never deployed | APK builds via GitHub Actions, never connected to live backend |
| **Database** | Empty | No media successfully ingested end-to-end |

---

## 3. Known Issues at Time of Deprecation

1. **Scaleway S3 account out of credits** — All S3 uploads fail with `AccessDenied`. The ingest pipeline works up to the upload step, then crashes. No media files were ever successfully stored in S3.

2. **Backlog crawler was working but never completed a full cycle** — The Nyaa HTML scraper (upgraded from RSS-based search during Phase 1) successfully found all 80 watchlist titles. qBittorrent downloads succeeded. Subtitle extraction succeeded. Transcoding hit two issues:
   - OOM kill: systemd MemoryMax=512M was too low for HEVC 10-bit decode (fixed to 4G)
   - Timeout: libx264 medium preset took >1 hour per HEVC 10-bit episode (switched to remux `-c copy`, then to `fast` preset)
   - Final state: remux mode working, but S3 upload blocks completion

3. **qBittorrent auth** — Default password was randomized on first run. Had to restart qBittorrent, login with temp password, and set permanent password. IP ban mechanism triggered during debugging.

4. **Filename parser missed vN suffix** — `S02E11v2` broke `\b` word boundary in regex (fixed).

5. **Next.js image domains** — `myanimelist.net` was missing from `remotePatterns` (only `cdn.myanimelist.net` was listed). Fixed.

6. **Turbo cache missing .next output** — `turbo.json` only had `dist/**` in outputs, missing `.next/**`. Caused "routes-manifest.json not found" on Vercel when Turbo replayed from cache. Fixed.

7. **Ingest panel clipped by navbar stacking context** — Fixed with `createPortal` to render outside the nav.

8. **Watchlist not shown in ingest panel** — Panel only read daemon queue (always empty when idle), not the persistent watchlist. Fixed to fetch both.

---

## 4. Environment Variables

All variables used across the system (secrets redacted):

### API / Web (VPS + Vercel)
| Variable | Purpose |
|----------|---------|
| `SCALEWAY_ACCESS_KEY` | S3 authentication |
| `SCALEWAY_SECRET_KEY` | S3 authentication |
| `SCALEWAY_BUCKET` | S3 bucket name (`Babylon`) |
| `SCALEWAY_REGION` | S3 region (`it-mil`) |
| `SCALEWAY_ENDPOINT` | S3 endpoint URL |
| `TMDB_API_KEY` | TMDB metadata API key |
| `TMDB_READ_ACCESS_TOKEN` | TMDB v4 read access token |
| `BABYLON_PIN` | Optional PIN for API auth (blank = disabled) |
| `DATABASE_URL` | SQLite file path (`file:///opt/babylon/data/babylon.db`) |
| `ALLOWED_ORIGINS` | CORS whitelist (Vercel URL + localhost) |
| `PORT` | API listen port (`3000`) |
| `NEXT_PUBLIC_API_URL` | Frontend → API base URL (Vercel env var) |

### Ingest Daemon (VPS)
| Variable | Purpose |
|----------|---------|
| `QBITTORRENT_HOST` | qBittorrent WebUI URL |
| `QBITTORRENT_USER` | qBittorrent username |
| `QBITTORRENT_PASS` | qBittorrent password |
| `DOWNLOAD_DIR` | Raw MKV download path |
| `PROCESSED_DIR` | Transcoded MP4 output path |
| `INGEST_STATE_DIR` | Watchlist/status/trigger file directory |
| `INGEST_POLL_INTERVAL` | Seconds between poll cycles (`300`) |
| `BABYLON_API_URL` | API URL for registrar calls |

---

## 5. External Service Dependencies

| Service | Purpose | Status | Cost |
|---------|---------|--------|------|
| **Scaleway Object Storage** (Milan) | Media file storage via S3 API | Account out of credits, all operations fail | Pay-as-you-go |
| **Vercel** (Hobby) | Next.js frontend hosting | Live, auto-deploys from GitHub | Free tier |
| **UpCloud VPS** (Frankfurt) | API + ingest daemon hosting | Running, 6 CPU / 16GB / 320GB | $112/month |
| **TMDB API** | Movie/TV metadata (posters, descriptions, genres) | Active, free tier | Free |
| **Jikan API** (MyAnimeList) | Anime metadata via MAL proxy | Active, rate-limited 3 req/s | Free |
| **GitHub** | Source code + Android CI/CD | Active | Free |
| **IONOS** | Domain `internalrr.info` DNS management | Active, `api` A record → VPS IP | ~$1/month |

---

## 6. Git Commit History

```
64c1a1d fix(ingest): handle vN version suffix in episode filenames and add yuv420p
af8fd06 fix(ingest): wait for torrent metadata before listing files
39fd0f7 feat(ingest): replace RSS-based batch search with HTML scraper
26b7a45 fix: render ingest panel via portal to escape navbar stacking context
40dd0de fix: show watchlist in ingest panel and widen sidebar
6d8316e fix: add myanimelist.net to Next.js image remotes
6b7df21 fix: add .next to turbo build outputs so Vercel cache restores Next.js build
b78e1e2 fix: return plain array from GET /api/media (frontend expects array, not paginated wrapper)
2b60e28 fix: point shared package main to dist for production
976bbf7 fix: add next to root devDeps for Vercel monorepo detection
927d4ab Init
a8ae7fe feat(web): implement full Next.js 15 web frontend for Babylon streaming platform
6ec9603 feat(android): Task 12 - GitHub Actions workflow to build release APK
ed4dddb feat(android): Task 11 - Discover and Ingest status screens
19fba0b feat(android): Task 10 - Upload screen with file picker and presigned S3 upload flow
2229ad2 feat(android): Task 9 - Search screen with debounced query and filter chips
7165b7d feat(android): Task 8 - ExoPlayer video player with custom controls and PiP
8674649 feat(android): Task 7 - Detail screen with metadata, season tabs, and episode list
7ad34bc feat(android): Task 6 - Home screen with hero banner and content rows
f79ea3d feat(android): Task 5 - Shared UI components
893816c feat(android): Task 4 - Dark theme, navigation routes, and single activity
1747b34 feat(android): Task 3 - Hilt DI modules and Application class
8ae1d34 feat(android): Task 2 - Data layer with API models, Room DB, and repository
9ef4ea6 feat(cli): add @babylon/cli package with full CLI implementation
7ce5b1f feat(android): Task 1 - Android project setup
ab7ed18 feat(deploy): add Nginx config and .env.example (Task 14)
6ec41ad feat(deploy): add idempotent VPS setup script (Task 13)
cebacd2 feat: add systemd service files for API + ingest daemon
f90f99c feat: add main ingest daemon loop (daemon.py)
31a5d29 feat: add pre-populated watchlist.json with all 80 titles
18b76b9 feat(ingest): add disk space monitor module (Task 9)
88e9276 feat(ingest): add API registrar module (Task 8)
05f4f84 feat(ingest): add S3 uploader module (Task 7)
7d00afd feat(ingest): add FFmpeg transcoder module (Task 6)
5f3e2d0 feat(ingest): add subtitle extractor module (Task 5)
646848d feat(ingest): Task 4 — qBittorrent integration module
6bf4b02 feat(ingest): Task 3 — RSS poller module
84dd7ee feat(ingest): Task 2 — filename parser + tests (38/38 passing)
cfc99c7 feat(ingest): Task 1 — Python project setup
daea804 feat: add ingest management routes
ca6fd78 feat: add library routes
5579958 feat: add watch progress routes
2863762 feat: add streaming routes
247a2bd feat: add upload routes
766c054 feat: add metadata search + apply routes
17a7c1a feat: add media CRUD routes
8734404 fix: use SCALEWAY_* env vars
94199a7 feat: add TMDB + Jikan API clients
be478fa feat: add S3 client with presigned URL helpers
f151e18 fix: enable disableRateLimit in test helper
dcb4e4f feat: add Fastify server bootstrap
319433c feat: add API project with Drizzle SQLite schema
bdb158a feat: add shared types + Zod validation schemas
b616a3c chore: initialize monorepo with pnpm + Turborepo
```

---

## 7. What Worked, What Didn't, What Was Never Executed

### Worked
- **Monorepo structure** — pnpm + Turborepo worked well for shared types across API/web/CLI
- **Drizzle ORM + SQLite** — Zero-hassle schema, migrations, and WAL mode for concurrent daemon+API access
- **Nyaa HTML scraper** — After replacing the RSS-based search, found all 80 watchlist titles with uploader priority (Judas > Ember > ASW > SubsPlease)
- **qBittorrent integration** — Selective file priority for episode-by-episode batch downloading worked perfectly
- **Subtitle extraction** — ffmpeg successfully extracted 15 subtitle tracks per Judas episode (eng, fre, ger, ita, spa, por, rus, ara, chi, tha, may, vie, ind)
- **Next.js frontend on Vercel** — Deployed and functional with working Discover page, IngestStatus panel, navigation
- **VPS setup** — Automated provisioning script, systemd services, nginx reverse proxy all worked
- **Filename parser** — Robust regex patterns with 38+ test cases, handled edge cases like vN suffix

### Didn't Work
- **Scaleway S3** — Account ran out of credits before any files were uploaded. The entire pipeline works except the final S3 upload step.
- **FFmpeg transcoding HEVC 10-bit** — Far too slow on VPS: 1+ hour per 24-min episode with libx264 medium preset. The 512MB systemd memory limit caused OOM kills. Even with `fast` preset and 4GB memory, HEVC decode was the bottleneck. Switched to remux (`-c copy`) which was instant but still blocked by S3 failure.
- **RSS-only Nyaa search** — The original feedparser-based approach found zero results for backlog titles. Had to replace with HTML scraping + BeautifulSoup4.

### Never Executed
- **CLI tool** (`packages/cli`) — Code written, never used against a live API
- **Android app** — All 12 tasks implemented, GitHub Actions builds APKs, but never connected to a running backend with actual media content
- **End-to-end media playback** — No media was ever successfully ingested, uploaded, and streamed through the frontend player
- **Watch progress tracking** — API routes exist, never tested with real playback
- **TMDB metadata application** — The `apply_metadata` call in the daemon was never reached (pipeline fails at S3 upload before metadata step)
