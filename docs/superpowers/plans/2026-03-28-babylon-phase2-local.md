# Babylon Phase 2 — Local Alienware Hosting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Babylon from cloud hosting (UpCloud VPS + Scaleway S3 + Vercel) to local hosting on an Alienware M15 R2 connected via Ethernet to the home LAN. Zero monthly cost. Zero-touch operation after initial setup.

**Exactly two changes from Phase 1:**
1. **Storage:** Scaleway S3 → local disk (`D:\Babylon\media`)
2. **Hosting:** UpCloud VPS + Vercel → local Alienware (API :3000, Web :3001)

**Everything else is identical:** database schema, API routes, ingest pipeline logic (RSS polling, Nyaa scraping, qBittorrent, subtitle extraction, Jikan metadata), frontend UI, Android app.

**Host Machine:** Alienware M15 R2 — Intel i7-9750H, NVIDIA RTX 2070, 512GB SSD, 16GB RAM, Windows 10 22H2 + WSL2 Ubuntu, Ethernet to home router

---

## Scope

| Area | What Changes | What Stays |
|------|-------------|------------|
| `packages/api/src/lib/s3.ts` | Replaced by `local-storage.ts` (fs streams + Range requests) | All route handlers, DB schema, TMDB/Jikan clients |
| `packages/api/src/routes/stream.ts` | Streams from disk instead of S3 presigned URLs | Route structure, media/episode lookup logic |
| `packages/api/src/routes/upload.ts` | Accepts local path instead of S3 key | `CompleteUploadSchema`, DB writes |
| `packages/api/src/index.ts` | Reads `LOCAL_MEDIA_PATH` instead of Scaleway env vars | Everything else |
| `packages/api/src/app.ts` | Decorates `storage` instead of `s3` | All middleware, other decorations |
| `ingest/uploader.py` | Replaced by `mover.py` (shutil.move to local path) | — |
| `ingest/transcoder.py` | `h264_nvenc` instead of `libx264` / `-c copy` | Interface (transcode function signature) |
| `ingest/registrar.py` | Passes local relative path instead of S3 key | All API calls, SQLite access |
| `ingest/config.py` | `LOCAL_MEDIA_PATH` replaces Scaleway vars | qBittorrent, API, poll interval vars |
| `ingest/daemon.py` | Calls `mover.move_file()` instead of `uploader.upload_file()` | Main loop, RSS cycle, backlog cycle, subtitle extraction |
| `packages/web/` | `NEXT_PUBLIC_API_URL` points to LAN IP | All components, pages, API client |
| `deploy/` | New `PHASE2_LOCAL_SETUP.md` setup guide | Phase 1 scripts preserved |

---

## File Structure (new/modified files only)

```
babylon/
├── PHASE1_DEPRECATED.md                          # ← NEW: pivot explanation
├── deploy/
│   ├── PHASE2_LOCAL_SETUP.md                     # ← NEW: one-time Alienware setup checklist
│   ├── .env.phase2.example                       # ← NEW: Phase 2 env template
│   ├── post-receive                              # ← NEW: git hook for auto-deploy
│   └── babylon-ingest.service                    # ← MODIFIED: paths for WSL2
│
├── packages/api/src/
│   ├── index.ts                                  # ← MODIFIED: read LOCAL_MEDIA_PATH
│   ├── app.ts                                    # ← MODIFIED: decorate storage instead of s3
│   ├── lib/
│   │   ├── s3.ts                                 # ← UNTOUCHED (Phase 1 code preserved)
│   │   └── local-storage.ts                      # ← NEW: LocalStorageService
│   └── routes/
│       ├── stream.ts                             # ← MODIFIED: disk streaming with Range
│       └── upload.ts                             # ← MODIFIED: accept local path
│
├── ingest/
│   ├── daemon.py                                 # ← MODIFIED: mover instead of uploader
│   ├── mover.py                                  # ← NEW: local file move
│   ├── transcoder.py                             # ← MODIFIED: h264_nvenc
│   ├── registrar.py                              # ← MODIFIED: local path instead of S3 key
│   ├── config.py                                 # ← MODIFIED: LOCAL_MEDIA_PATH
│   └── uploader.py                               # ← UNTOUCHED (Phase 1 code preserved)
```

---

## Tasks

### Task 1: LocalStorageService (`packages/api/src/lib/local-storage.ts`)

**What:** Create a `LocalStorageService` that replaces the S3 client for all file operations.

**Interface:**
```typescript
export interface LocalStorageService {
  // Resolve a relative path to absolute disk path
  resolve(relativePath: string): string;
  // Check if a file exists
  exists(relativePath: string): boolean;
  // Get file size in bytes
  getFileSize(relativePath: string): number;
  // Build storage key (same convention as S3: anime/{id}/s{n}/e{n}/{filename})
  buildKey(type: 'movie' | 'series' | 'anime', mediaId: string, parts: {
    seasonNumber?: number;
    episodeNumber?: number;
    filename: string;
  }): string;
  buildSubtitleKey(parentId: string, language: string, format: string): string;
}

export function createLocalStorage(basePath: string): LocalStorageService;
```

**Implementation:**
- `resolve()` joins `basePath` with the relative path, validates no path traversal (`..`)
- `exists()` uses `fs.existsSync`
- `getFileSize()` uses `fs.statSync`
- `buildKey()` and `buildSubtitleKey()` — identical logic to the Phase 1 S3 client

**Tests (Vitest):**
- [ ] `buildKey` produces correct paths for movie, series, anime
- [ ] `buildSubtitleKey` produces correct paths
- [ ] `resolve` joins base path correctly
- [ ] `resolve` rejects path traversal attempts (`../../../etc/passwd`)
- [ ] `exists` returns true for existing file, false for missing
- [ ] `getFileSize` returns correct size

**Files:** `packages/api/src/lib/local-storage.ts`, `packages/api/tests/local-storage.test.ts`

---

### Task 2: Modify stream routes for local disk (`packages/api/src/routes/stream.ts`)

**What:** Replace S3 presigned URL generation with direct file streaming from disk, with full HTTP Range request support for seeking.

**Changes:**
- `GET /api/stream/:id` — instead of returning `{ streamUrl }`, stream the MP4 file directly from disk:
  - Read `s3Key` from DB (now a relative local path)
  - Resolve to absolute path via `storage.resolve()`
  - Parse `Range` header if present
  - Return `206 Partial Content` with `Content-Range` and `Accept-Ranges: bytes` headers
  - Return `200 OK` with full file if no Range header
  - Use `fs.createReadStream(path, { start, end })` for efficient partial reads
- `GET /api/stream/:id/subtitle` — instead of returning presigned URLs, stream the VTT file directly:
  - Resolve subtitle `s3Key` to disk path
  - Return file contents with `Content-Type: text/vtt`

**Tests (Vitest):**
- [ ] Stream route returns 200 with full file when no Range header
- [ ] Stream route returns 206 with correct Content-Range for Range requests
- [ ] Stream route returns 416 for invalid Range
- [ ] Stream route returns 404 when file not found on disk
- [ ] Subtitle route returns VTT content with correct Content-Type
- [ ] Subtitle route returns 404 when subtitle file missing

**Files:** `packages/api/src/routes/stream.ts`, `packages/api/tests/stream.test.ts`

---

### Task 3: Modify upload routes for local paths (`packages/api/src/routes/upload.ts`)

**What:** The upload/complete endpoint already works — it just stores `s3Key` in the DB. The only change is:

- `POST /api/upload/initiate` — no longer needed for S3 presigned URLs. Keep the route but have it return the expected local path (so the daemon's registrar can still call it if needed), or mark it as no-op.
- `POST /api/upload/complete` — no changes needed. It already accepts `s3Key` and stores it in the DB. In Phase 2, `s3Key` is semantically a local relative path. The registrar just passes a local path string instead.

**Tests:**
- [ ] upload/complete stores the provided path in the DB correctly
- [ ] upload/complete works for episodes with local path
- [ ] upload/complete works for movies with local path

**Files:** `packages/api/src/routes/upload.ts` (minimal changes), `packages/api/tests/upload.test.ts`

---

### Task 4: Wire up LocalStorageService in app.ts and index.ts

**What:** Replace the S3 client decoration with LocalStorageService.

**Changes to `app.ts`:**
```typescript
// Replace s3Config?: S3Config with:
localMediaPath?: string;

// Replace app.decorate('s3', s3) with:
if (options.localMediaPath) {
  const storage = createLocalStorage(options.localMediaPath);
  app.decorate('storage', storage);
}
```

**Changes to `index.ts`:**
```typescript
// Replace s3Config block with:
localMediaPath: process.env.LOCAL_MEDIA_PATH || 'D:/Babylon/media',
```

**Update FastifyInstance declaration:**
```typescript
declare module 'fastify' {
  interface FastifyInstance {
    storage: LocalStorageService;  // replaces s3: S3
    // ... rest unchanged
  }
}
```

**Tests:**
- [ ] App builds successfully with `localMediaPath` option
- [ ] `app.storage` is accessible in route handlers
- [ ] Health route still works

**Files:** `packages/api/src/app.ts`, `packages/api/src/index.ts`

---

### Task 5: Ingest daemon — mover.py (replaces uploader.py)

**What:** After transcoding, move the MP4 file from `PROCESSED_DIR` to `LOCAL_MEDIA_PATH/<relative_path>` instead of uploading to S3.

**Interface:**
```python
def move_file(source_path: str, relative_key: str) -> bool:
    """
    Move source_path to LOCAL_MEDIA_PATH/relative_key.
    Creates intermediate directories. Returns True on success.
    """

def build_episode_path(media_id, season, episode_num, filename) -> str:
    """Same convention as Phase 1 S3 keys: anime/{id}/s{n}/e{n}/{filename}"""

def build_subtitle_path(episode_id, language, fmt="vtt") -> str:
    """Same convention: subtitles/{episode_id}/{language}.{fmt}"""
```

**Implementation:**
- Uses `shutil.move()` for atomic move (same filesystem)
- Creates parent directories with `os.makedirs(exist_ok=True)`
- `LOCAL_MEDIA_PATH` read from config (maps to `/mnt/d/Babylon/media` in WSL2)

**Tests (pytest):**
- [ ] `move_file` creates directories and moves file
- [ ] `move_file` returns False if source doesn't exist
- [ ] `build_episode_path` matches Phase 1 S3 key convention
- [ ] `build_subtitle_path` matches Phase 1 S3 key convention

**Files:** `ingest/mover.py`, `ingest/tests/test_mover.py`

---

### Task 6: Ingest daemon — update transcoder.py for NVENC

**What:** Replace FFmpeg command with NVIDIA hardware-accelerated encoding.

**IMPORTANT:** Only the video encode command changes. The subtitle extraction step in `_process_episode()` (daemon.py) happens BEFORE transcoding and is completely untouched. Do NOT modify or remove subtitle extraction logic. The `-sn` flag in the FFmpeg command strips subtitle streams from the MP4 output because they've already been extracted to separate VTT files by `subtitle_extractor.py`.

**Change:**
```python
# Phase 1:
cmd = ["ffmpeg", "-y", "-i", input_path,
       "-c", "copy", "-sn", "-movflags", "+faststart", output_path]

# Phase 2:
cmd = ["ffmpeg", "-y", "-i", input_path,
       "-c:v", "h264_nvenc", "-preset", "p4", "-cq", "23",
       "-c:a", "aac", "-b:a", "192k",
       "-sn", "-movflags", "+faststart", output_path]
```

Performance: ~30-60 seconds per 24-min 1080p episode on RTX 2070 (vs 1+ hour CPU on VPS).

**Tests (pytest):**
- [ ] Transcode command includes `h264_nvenc` and `p4` preset
- [ ] Transcode still returns True on success (mock subprocess)
- [ ] Transcode returns False and cleans up on failure
- [ ] `-sn` flag is present (subtitles stripped — they're extracted separately)

**Files:** `ingest/transcoder.py`, `ingest/tests/test_transcoder.py`

---

### Task 7: Ingest daemon — update config.py and registrar.py

**What:**
- `config.py`: Add `LOCAL_MEDIA_PATH`, remove all `SCALEWAY_*` variables
- `registrar.py`: No change to API calls — just pass the local relative path where it previously passed an S3 key (the field name `s3_key` in the API is now semantically a local path, but the JSON key name doesn't change)

**Changes to `config.py`:**
```python
# Remove:
SCALEWAY_ACCESS_KEY, SCALEWAY_SECRET_KEY, SCALEWAY_BUCKET, SCALEWAY_REGION, SCALEWAY_ENDPOINT

# Add:
LOCAL_MEDIA_PATH: str = _require("LOCAL_MEDIA_PATH")  # e.g. /mnt/d/Babylon/media
```

**Changes to `registrar.py`:**
- No functional changes — it already passes `s3_key` as a string to the API. In Phase 2, that string is a local relative path instead of an S3 key. The API stores it the same way.

**Tests:**
- [ ] config loads `LOCAL_MEDIA_PATH` from environment
- [ ] config raises if `LOCAL_MEDIA_PATH` not set
- [ ] config no longer requires any `SCALEWAY_*` variables

**Files:** `ingest/config.py`, `ingest/tests/test_config.py`

---

### Task 8: Ingest daemon — update daemon.py to use mover

**What:** Replace `uploader.upload_file()` calls with `mover.move_file()` in `_process_episode()`.

**Changes in `_process_episode()`:**
```python
# Phase 1:
if not uploader.upload_file(mp4_path, s3_key):
    ...

# Phase 2:
if not mover.move_file(mp4_path, s3_key):
    ...
```

Same for subtitle files — replace `uploader.upload_file(sub_path, sub_key)` with `mover.move_file(sub_path, sub_key)`.

Import `mover` instead of `uploader` at the top.

**Tests:**
- [ ] `_process_episode` calls `mover.move_file` instead of `uploader.upload_file` (mock test)

**Files:** `ingest/daemon.py`

---

### Task 9: Frontend — update API URL for LAN access

**What:** The frontend API client reads `NEXT_PUBLIC_API_URL` to know where the API is. In Phase 2, this points to the Alienware's LAN IP.

**Changes:**
- `packages/web/src/lib/api.ts`: Change the fallback default from `https://api.internalrr.info/api` to `http://localhost:3000/api`
- The actual URL is set via `NEXT_PUBLIC_API_URL` env var at build time

**Tests:**
- [ ] API client uses env var when set
- [ ] API client falls back to localhost:3000 when env var not set

**Files:** `packages/web/src/lib/api.ts`

---

### Task 10: Frontend — update video player for direct streaming

**What:** The player currently expects a `streamUrl` (S3 presigned URL) from the API. In Phase 2, the API streams the file directly, so the player needs to point its `<video>` src at the stream endpoint URL itself.

**Changes:**
- `GET /api/stream/:id` now returns the file directly (not a JSON with `streamUrl`)
- The frontend player sets `<video src="/api/stream/{id}?episode_id={eid}">` instead of fetching a URL first
- The API returns proper `Accept-Ranges: bytes` headers so HTML5 `<video>` seeking works natively

**Files:** `packages/web/src/components/Player.tsx`, `packages/web/src/components/PlayerPage.tsx`

---

### Task 11: Environment and config files

**What:** Create Phase 2 environment template and PM2 ecosystem file.

**Files to create:**
- `deploy/.env.phase2.example` — all Phase 2 env vars documented
- `deploy/ecosystem.config.cjs` — PM2 process definitions for API + web
- `deploy/post-receive` — git hook for auto-deploy on push

**PM2 ecosystem:**
```javascript
module.exports = {
  apps: [
    {
      name: 'babylon-api',
      cwd: 'D:/Babylon/app/packages/api',
      script: 'dist/index.js',
      env: { NODE_ENV: 'production', PORT: '3000' },
    },
    {
      name: 'babylon-web',
      cwd: 'D:/Babylon/app/packages/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

**Post-receive hook (with error handling — a failed build must NOT reload the running server):**
```bash
#!/bin/bash
set -e
DEPLOY_DIR="/mnt/d/Babylon/app"
GIT_DIR="/mnt/d/Babylon/repo.git"

echo "=== Deploying to $DEPLOY_DIR ==="
git --work-tree=$DEPLOY_DIR --git-dir=$GIT_DIR checkout -f

cd $DEPLOY_DIR
echo "=== Installing dependencies ==="
pnpm install --frozen-lockfile || { echo "Install failed, aborting deploy"; exit 1; }

echo "=== Building ==="
pnpm build || { echo "Build failed, aborting deploy"; exit 1; }

echo "=== Reloading services ==="
pm2.cmd reload ecosystem.config.cjs
sudo systemctl restart babylon-ingest

echo "=== Deploy complete ==="
```

---

### Task 12: Setup guide (`deploy/PHASE2_LOCAL_SETUP.md`)

**What:** One-time setup checklist for the Alienware. After following it once, the machine is zero-touch forever.

**Sections:**
1. **Windows Configuration**
   - Auto-login via `netplwiz`
   - High Performance power plan
   - Disable sleep/hibernate/screen timeout
   - Lid close → Do Nothing
   - Disable USB selective suspend

2. **Network Static IP**
   - Find Ethernet MAC address (`ipconfig /all`)
   - Reserve IP in router admin panel (DHCP reservation)

3. **WSL2 Setup (do this early — requires restart)**
   - Install WSL2 Ubuntu from Microsoft Store
   - Enable systemd in WSL2: edit `/etc/wsl.conf`:
     ```ini
     [boot]
     systemd=true
     ```
   - **Restart WSL2 immediately** — from PowerShell: `wsl --shutdown`, then relaunch Ubuntu
   - Verify systemd works: `systemctl status` should show the system manager
   - Install Python 3.12: `sudo apt install python3.12 python3.12-venv python3-pip`
   - Install FFmpeg with NVENC: `sudo apt install ffmpeg` (NVENC works through WSL2's GPU passthrough)

4. **Windows Prerequisites**
   - Node.js 22 LTS (Windows installer)
   - pnpm (`npm install -g pnpm`)
   - PM2 (`npm install -g pm2`)
   - PM2 auto-start via **Task Scheduler** (NOT `pm2-startup` — unreliable on Windows 10):
     ```
     schtasks /create /tn "PM2 Startup" /tr "cmd /c pm2 resurrect" /sc onlogon /rl highest
     ```
   - qBittorrent (Windows native, configure WebUI on localhost:8080)
   - qBittorrent auto-start: place shortcut in `shell:startup` folder (Win+R → `shell:startup`)

4. **Directory Structure**
   ```
   D:\Babylon\
   ├── app\              # git working tree (code checkout)
   ├── media\            # transcoded MP4s + subtitles
   ├── data\             # babylon.db SQLite database
   ├── downloads\
   │   ├── raw\          # qBittorrent download target
   │   └── processed\    # FFmpeg output staging
   └── repo.git\         # bare git remote
   ```

5. **Git Remote Setup**
   - Initialize bare repo: `git init --bare D:\Babylon\repo.git` (via WSL2: `/mnt/d/Babylon/repo.git`)
   - Install post-receive hook
   - Add remote on dev machine: `git remote add alienware ssh://user@<LAN-IP>/mnt/d/Babylon/repo.git`
   - First push: `git push alienware master`

6. **WSL2 Ingest Daemon Setup**
   - Create Python venv in `/mnt/d/Babylon/app/ingest/`
   - Install requirements
   - Enable systemd in WSL2 (`/etc/wsl.conf` → `[boot] systemd=true`)
   - Install `babylon-ingest.service` with WSL2 paths
   - Enable and start service

7. **PM2 Setup**
   - Copy `.env.phase2` to `D:\Babylon\app\.env`
   - Start processes: `pm2 start ecosystem.config.cjs`
   - Save: `pm2 save`
   - Configure startup: PM2 Windows startup script or Task Scheduler

8. **Verification**
   - `curl http://localhost:3000/api/health` → `{"status":"ok"}`
   - Open `http://<LAN-IP>:3001` from another device on the network
   - Check ingest daemon: `sudo systemctl status babylon-ingest`
   - Test git push deploy from dev machine

---

## Execution Order

Tasks 1–4 (API changes) can be done in parallel.
Tasks 5–8 (daemon changes) can be done in parallel.
Task 9–10 (frontend changes) depend on Tasks 2–4.
Task 11–12 (config/setup) can be done anytime.

Recommended sequence:
1. **Tasks 1–4** in parallel — API local storage layer
2. **Tasks 5–8** in parallel — Daemon local move + NVENC
3. **Tasks 9–10** — Frontend pointing at local API
4. **Tasks 11–12** — Config files and setup guide
5. **End-to-end test** — Queue Solo Leveling, verify it downloads, transcodes, moves, registers, and plays in the frontend

---

## Disk Space — CRITICAL

The Alienware has a 512GB SSD shared with Windows. The math is tight:

- Windows + apps: ~100-150GB
- 80 watchlist titles × ~12 episodes × 400MB = **~384GB** for media alone
- Plus downloads temp space (~2-5GB during active ingest)
- **This WILL NOT FIT on a single 512GB SSD with Windows.**

**Before executing this plan, check actual free space on the Alienware.**

- If D: drive exists and has **300GB+ free**: proceed as planned
- If D: drive has **200-300GB free**: proceed but limit watchlist to ~40 titles initially, monitor disk
- If D: drive has **< 200GB free** or doesn't exist: **STOP. An external USB drive is required from day one.** The setup guide must configure the external drive as the media storage path before any ingest runs.

The setup guide's first step is a disk space check with explicit go/no-go criteria.
