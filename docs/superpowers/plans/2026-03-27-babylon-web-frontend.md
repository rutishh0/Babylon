# Babylon Web Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Netflix-like web frontend for Babylon, a personal streaming platform for anime, movies, and TV shows.

**Architecture:** Next.js 15 App Router with TypeScript. Dark theme, responsive across 3 breakpoints (>1200px desktop, 768-1200px tablet, <768px mobile). Communicates with the Babylon API at `https://api.internalrr.info/api` via REST. Video playback via HTML5 `<video>` with a fully custom controls overlay.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, next/font (Inter), deployed to Vercel.

---

## Reference

- **Spec:** `docs/superpowers/specs/2026-03-27-babylon-streaming-platform-design.md` — Section 6 (Frontend)
- **Shared types:** `packages/shared/src/types.ts` — all Zod schemas and response interfaces
- **API base URL:** `https://api.internalrr.info/api`
- **PIN header:** `X-Babylon-Pin`

### Key Types (from `@babylon/shared`)

```ts
MediaResponse, SeasonResponse, EpisodeResponse, MediaFileResponse,
ProgressResponse, SubtitleResponse, HomeScreenResponse, IngestStatus,
WatchlistEntry, MediaType, ListMediaQuery, UpdateProgressInput,
InitiateUploadInput, CompleteUploadInput, QueueIngestInput
```

### API Endpoints Summary

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/media` | List/search (params: `type`, `genre`, `q`, `sort`, `limit`, `offset`) |
| GET | `/media/:id` | Detail with seasons, episodes, progress |
| POST | `/media` | Create media entry |
| PATCH | `/media/:id` | Update metadata |
| DELETE | `/media/:id` | Delete media |
| GET | `/metadata/search` | Search TMDB/Jikan (params: `q`, `type`) |
| POST | `/metadata/apply/:id` | Pull metadata from TMDB/Jikan |
| POST | `/upload/initiate` | Get presigned S3 PUT URL |
| POST | `/upload/complete` | Confirm upload done |
| GET | `/stream/:id` | Get presigned video URL (param: `episode_id`) |
| GET | `/stream/:id/subtitle` | Get presigned subtitle URL (params: `episode_id`, `language`) |
| GET | `/progress` | Continue Watching list |
| PUT | `/progress/:mediaId` | Update watch position |
| DELETE | `/progress/:mediaId` | Clear progress |
| GET | `/library/home` | Home screen data (continue watching, recently added, genre rows) |
| GET | `/library/genres` | All genres with counts |
| GET | `/ingest/status` | Daemon status + queue |
| POST | `/ingest/queue` | Queue anime for download |
| GET | `/ingest/search` | Search Jikan for anime |
| GET | `/ingest/watchlist` | Get watchlist |
| POST | `/ingest/watchlist` | Add to watchlist |
| DELETE | `/ingest/watchlist/:title` | Remove from watchlist |
| POST | `/ingest/trigger` | Force poll cycle |

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0a0a0a` | Page background |
| `--card` | `#1a1a2e` | Card/panel backgrounds |
| `--accent` | `#e50914` | Progress bars, buttons, highlights |
| `--text` | `#ffffff` | Primary text |
| `--text-muted` | `#a0a0a0` | Secondary text, metadata |
| `--border` | `#2a2a3e` | Subtle borders |
| Radius | `6px` | Cards and posters |
| Card hover | `scale(1.05)` + shadow | Smooth 200ms transition |

---

## Task 1: Next.js Project Setup

**Goal:** Scaffold `packages/web/` with all config files, global styles, and environment variables.

- [ ] Create directory `packages/web/`
- [ ] Create `packages/web/package.json`:
  ```json
  {
    "name": "@babylon/web",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint"
    },
    "dependencies": {
      "next": "^15.0.0",
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "@babylon/shared": "*",
      "zustand": "^5.0.0"
    },
    "devDependencies": {
      "@types/node": "^22.0.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      "typescript": "^5.0.0",
      "tailwindcss": "^4.0.0",
      "@tailwindcss/postcss": "^4.0.0",
      "postcss": "^8.0.0"
    }
  }
  ```
- [ ] Create `packages/web/tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2017",
      "lib": ["dom", "dom.iterable", "esnext"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "plugins": [{ "name": "next" }],
      "paths": {
        "@/*": ["./src/*"]
      }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules"]
  }
  ```
- [ ] Create `packages/web/next.config.ts`:
  ```ts
  import type { NextConfig } from 'next';

  const nextConfig: NextConfig = {
    images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'image.tmdb.org' },
        { protocol: 'https', hostname: 's3.nl-ams.scw.cloud' },
        { protocol: 'https', hostname: '*.scw.cloud' },
        { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      ],
    },
    experimental: {
      typedRoutes: true,
    },
  };

  export default nextConfig;
  ```
- [ ] Create `packages/web/tailwind.config.ts`:
  ```ts
  import type { Config } from 'tailwindcss';

  const config: Config = {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
      extend: {
        colors: {
          bg: '#0a0a0a',
          card: '#1a1a2e',
          accent: '#e50914',
          'text-muted': '#a0a0a0',
          border: '#2a2a3e',
        },
        borderRadius: {
          card: '6px',
        },
      },
    },
    plugins: [],
  };

  export default config;
  ```
- [ ] Create `packages/web/postcss.config.mjs`:
  ```js
  const config = { plugins: { '@tailwindcss/postcss': {} } };
  export default config;
  ```
- [ ] Create `packages/web/.env.example`:
  ```
  NEXT_PUBLIC_API_URL=https://api.internalrr.info/api
  ```
- [ ] Create `packages/web/.env.local`:
  ```
  NEXT_PUBLIC_API_URL=https://api.internalrr.info/api
  ```
- [ ] Create `packages/web/src/app/globals.css`:
  ```css
  @import "tailwindcss";

  :root {
    --bg: #0a0a0a;
    --card: #1a1a2e;
    --accent: #e50914;
    --text: #ffffff;
    --text-muted: #a0a0a0;
    --border: #2a2a3e;
  }

  * {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
  }

  html,
  body {
    max-width: 100vw;
    overflow-x: hidden;
    background-color: var(--bg);
    color: var(--text);
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    height: 4px;
    width: 4px;
  }
  ::-webkit-scrollbar-track {
    background: var(--bg);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 2px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--accent);
  }
  ```

---

## Task 2: API Client Library

**Goal:** Create a fully-typed API client usable from both server and client components.

- [ ] Create `packages/web/src/lib/api.ts` with the following:
  - Import all response types from `@babylon/shared`
  - A `getPin()` helper that reads from `localStorage` (client-side safe, returns `''` on server)
  - A `request<T>()` wrapper that:
    - Prepends `process.env.NEXT_PUBLIC_API_URL` to the path
    - Attaches `X-Babylon-Pin` header when a PIN is set
    - Sets `Content-Type: application/json` for non-GET requests
    - Throws a typed `ApiError` (with `status` and `message`) on non-2xx responses
  - Export typed functions for every endpoint:

  ```ts
  // Media
  listMedia(query?: Partial<ListMediaQuery>): Promise<MediaResponse[]>
  getMedia(id: string): Promise<MediaResponse>
  createMedia(input: CreateMediaInput): Promise<MediaResponse>
  updateMedia(id: string, input: UpdateMediaInput): Promise<MediaResponse>
  deleteMedia(id: string): Promise<void>

  // Metadata
  searchMetadata(q: string, type?: MediaType): Promise<MetadataSearchResult[]>
  applyMetadata(id: string): Promise<MediaResponse>

  // Upload
  initiateUpload(input: InitiateUploadInput): Promise<{ uploadUrl: string; s3Key: string }>
  completeUpload(input: CompleteUploadInput): Promise<void>

  // Stream
  getStreamUrl(id: string, episodeId?: string): Promise<{ url: string }>
  getSubtitleUrl(id: string, episodeId: string, language: string): Promise<{ url: string }>

  // Progress
  getContinueWatching(): Promise<MediaResponse[]>
  updateProgress(mediaId: string, input: UpdateProgressInput): Promise<void>
  deleteProgress(mediaId: string): Promise<void>

  // Library
  getHomeScreen(): Promise<HomeScreenResponse>
  getGenres(): Promise<Array<{ genre: string; count: number }>>

  // Ingest
  getIngestStatus(): Promise<IngestStatus>
  queueIngest(input: QueueIngestInput): Promise<void>
  searchIngest(q: string): Promise<JikanSearchResult[]>
  getWatchlist(): Promise<WatchlistEntry[]>
  addToWatchlist(input: AddToWatchlistInput): Promise<void>
  removeFromWatchlist(title: string): Promise<void>
  triggerIngest(): Promise<void>
  ```

- [ ] Create `packages/web/src/lib/pin-store.ts` — Zustand store for PIN management:
  ```ts
  // Zustand store that:
  // - Stores pin in memory (and persists to localStorage via zustand/middleware persist)
  // - Exposes: pin, setPin(pin: string), clearPin()
  // - Initializes from localStorage on first access
  ```

- [ ] Create `packages/web/src/lib/utils.ts` — shared utility functions:
  ```ts
  // formatDuration(seconds: number): string  → "1h 23m" or "45m"
  // formatProgress(position: number, duration: number): number  → 0-100 percentage
  // formatFileSize(bytes: number): string  → "1.2 GB"
  // formatYear(year: number | null): string
  // getRatingColor(rating: number): string  → green/yellow/red based on score
  ```

---

## Task 3: Layout and Navigation

**Goal:** Root layout with Inter font, Navbar with responsive hamburger menu.

- [ ] Create `packages/web/src/app/layout.tsx`:
  - Use `next/font/google` to load `Inter` with `display: 'swap'`
  - Apply font CSS variable to `<html>`
  - Render `<Navbar />` above `{children}`
  - Set metadata: `title: 'Babylon'`, `description: 'Your personal streaming platform'`
  - Dark background via `className="bg-bg min-h-screen"`

- [ ] Create `packages/web/src/components/Navbar.tsx` (`'use client'`):
  - Logo: `BABYLON` in bold accent red (`#e50914`), links to `/`
  - Nav links (desktop): Home (`/`), Anime (`/anime`), Movies (`/movies`), TV Shows (`/tv`), Discover (`/discover`)
  - Right side: Search icon (links to `/search`), Upload icon (links to `/upload`), Ingest Status icon with active-count badge
  - Active link: underline or accent color highlight using `usePathname()`
  - Mobile (<768px): show only logo + hamburger icon; clicking opens a full-width dropdown with all links
  - Hamburger state managed with `useState`
  - Ingest badge: polls `GET /ingest/status` every 30 seconds; shows count of non-done queue items as a red dot

- [ ] Create `packages/web/src/components/IngestStatusBadge.tsx` (`'use client'`):
  - Small component rendering the count badge on the nav icon
  - Polls on an interval only when mounted

---

## Task 4: Home Screen

**Goal:** Hero banner + horizontal scroll rows for Continue Watching, Recently Added, and genre rows.

- [ ] Create `packages/web/src/app/page.tsx` (Server Component):
  - Fetch `GET /library/home` (returns `HomeScreenResponse`)
  - Pass data to client components: `<HeroBanner>`, `<MediaRow>` instances
  - Show `<ContinueWatchingRow>` only if `continueWatching.length > 0`
  - Map `genreRows` to individual `<MediaRow>` components

- [ ] Create `packages/web/src/components/HeroBanner.tsx` (`'use client'`):
  - Takes a `MediaResponse` (first item from `continueWatching`, or first from `recentlyAdded`)
  - Full-width backdrop image via `next/image` (fill layout, with blur placeholder)
  - Gradient overlay from transparent to `#0a0a0a` at bottom
  - Content area: title (clamp font size), year + rating badge, genre tags, description (truncated to 3 lines)
  - Resume button (if progress exists): red pill button, links to `/watch/[id]` with `?episode=episodeId` if series
  - Progress bar under resume button (thin, red on dark track)
  - "Watch Now" button for items without progress
  - Responsive: height `clamp(400px, 56vw, 700px)`

- [ ] Create `packages/web/src/components/MediaRow.tsx`:
  - Props: `title: string`, `items: MediaResponse[]`, `showProgress?: boolean`
  - Horizontal scrolling container with `overflow-x: auto; scrollbar-width: none`
  - Left/right arrow buttons that appear on hover (desktop only)
  - Renders `<MediaCard>` or `<ContinueWatchingCard>` depending on `showProgress`
  - Card count via CSS Grid: `grid-auto-flow: column; grid-auto-columns: minmax(150px, 1fr)` with responsive `minmax` values

- [ ] Create `packages/web/src/components/MediaCard.tsx`:
  - Props: `media: MediaResponse`
  - Links to `/media/[id]`
  - Poster image via `next/image` (aspect ratio 2:3), `blur` placeholder
  - Rounded corners (`border-radius: 6px`)
  - Title overlay on hover (fade in)
  - Hover: `transform: scale(1.05)` + box shadow, `transition: 200ms ease`
  - Rating badge (top-right, semi-transparent black pill)
  - "NEW" badge if `createdAt` within last 7 days

- [ ] Create `packages/web/src/components/ContinueWatchingCard.tsx`:
  - Props: `media: MediaResponse`
  - Landscape aspect ratio (16:9) using backdrop image, fallback to poster
  - Title at bottom
  - Thin progress bar at card bottom (red, percentage from `progress.positionSeconds / progress.durationSeconds`)
  - Episode info if series: "S1 E4" label
  - Hover: scale + shadow

---

## Task 5: Media Detail Page

**Goal:** Full detail view with metadata, season/episode list, edit modal.

- [ ] Create `packages/web/src/app/media/[id]/page.tsx` (Server Component):
  - Fetch `GET /media/:id` (returns `MediaResponse` with seasons + episodes + progress)
  - Pass to `<MediaDetail>` client component

- [ ] Create `packages/web/src/components/MediaDetail.tsx` (`'use client'`):
  - **Header section:**
    - Full-width backdrop with gradient overlay
    - Side-by-side layout >768px: poster (w-48, rounded-card shadow) + info column
    - Stacked layout <768px: poster centered above info
    - Info: title (large, bold), year, rating badge (colored: green ≥7, yellow ≥5, red <5), genre tags (pill chips), description
    - Buttons: "Play" / "Resume" (links to `/watch/[id]`), "Edit Metadata" (opens modal)
  - **Season tabs** (for `type !== 'movie'`):
    - Tab bar with season numbers (Season 1, Season 2, etc.)
    - Active tab underlined in accent red
    - Selected season's episodes rendered below
  - **Episode list:**
    - Each episode: thumbnail (16:9 `next/image`), episode number + title, duration (`formatDuration`), watched indicator (checkmark icon if `progress.completed`), progress bar if partially watched
    - Clicking an episode links to `/watch/[id]?episode=[episodeId]`
    - "Not uploaded yet" state if `episode.s3Key` is null (grayed out, not clickable)
  - **Movie file info:**
    - For `type === 'movie'`: file size, duration, format from `mediaFile`

- [ ] Create `packages/web/src/components/EditMetadataModal.tsx` (`'use client'`):
  - Modal overlay with form fields: title, description, year, rating, genres (comma-separated), posterUrl, backdropUrl
  - "Search TMDB/Jikan" button → calls `GET /metadata/search` → shows results dropdown → clicking a result pre-fills the form
  - Save: calls `PATCH /media/:id`, closes modal, refreshes data via `router.refresh()`
  - Cancel: closes without saving

---

## Task 6: Video Player

**Goal:** Full-screen custom HTML5 video player with all controls, subtitle support, and auto-progress saving.

- [ ] Create `packages/web/src/app/watch/[id]/page.tsx` (Server Component):
  - Extract `id` from params, `episodeId` from searchParams
  - Fetch `GET /media/:id` for title/episode info
  - Render `<PlayerPage>` client component with media data

- [ ] Create `packages/web/src/components/PlayerPage.tsx` (`'use client'`):
  - On mount: call `GET /stream/:id` (with optional `episode_id`) to get presigned URL
  - Call `GET /stream/:id/subtitle` for each available subtitle language
  - Render `<Player>` with the stream URL, subtitles list, and media metadata

- [ ] Create `packages/web/src/components/Player.tsx` (`'use client'`):
  - Full-screen black container (`position: fixed; inset: 0; background: #000`)
  - HTML5 `<video>` element filling the container (`object-fit: contain`)
  - Load subtitles via `<track>` elements with `kind="subtitles"` (VTT format)

  **Controls overlay** (fades out after 3s of inactivity, shows on mouse move / touch):
  - Top bar: Back arrow (navigate back), Show title + episode info (e.g., "Attack on Titan — S1 E3")
  - Bottom bar:
    - Progress scrubber: `<input type="range">` styled with red fill, shows buffered range
    - Current time / total duration display
    - Play/Pause button (SVG icon)
    - Skip back 10s button
    - Skip forward 10s button
    - Volume button + slider (hides on mobile)
    - Playback speed selector: `<select>` with options [0.5, 0.75, 1, 1.25, 1.5, 2]
    - CC button: opens subtitle language dropdown (or "Off")
    - Fullscreen button
  - Skip Intro button: floating above bottom bar, shown only when position is 60-210 seconds. Jumps to 210s.

  **Keyboard shortcuts** (attach to `document` on mount, remove on unmount):
  - `Space` — toggle play/pause
  - `ArrowLeft` — seek -10s
  - `ArrowRight` — seek +10s
  - `ArrowUp` — volume +10%
  - `ArrowDown` — volume -10%
  - `f` — toggle fullscreen
  - `m` — toggle mute
  - `Escape` — exit fullscreen or navigate back

  **Auto-save progress:**
  - `useEffect` with `setInterval` every 10 seconds
  - Calls `PUT /progress/:mediaId` with `{ episodeId?, positionSeconds: video.currentTime, durationSeconds: video.duration }`
  - Also saves on `video.pause` event and before `window.beforeunload`

  **Resume from saved position:**
  - On stream URL load, fetch `GET /media/:id` for progress
  - If `progress.positionSeconds > 30` and not completed: `video.currentTime = progress.positionSeconds`

  **Controls auto-hide:**
  - `mousemove` / `touchstart` → show controls → reset 3s timeout → hide controls
  - Controls hidden: cursor `none`, overlay opacity 0 (transition 300ms)
  - Controls always shown when paused

---

## Task 7: Search Page

**Goal:** Full-text search with type filters and instant debounced results.

- [ ] Create `packages/web/src/app/search/page.tsx` (`'use client'`):
  - Large search input at top (autofocused)
  - Filter chips below: All | Anime | Movies | TV Shows (active chip: red background)
  - Debounced search: `useEffect` + `setTimeout` 300ms on input change
  - Calls `GET /media?q=...&type=...` when query ≥ 2 characters
  - Results: CSS Grid of `<MediaCard>` components
    - Desktop: `repeat(auto-fill, minmax(160px, 1fr))`
    - Tablet: `repeat(auto-fill, minmax(140px, 1fr))`
    - Mobile: `repeat(auto-fill, minmax(120px, 1fr))`
  - Loading state: skeleton cards (pulsing gray boxes matching card dimensions)
  - Empty state: centered message "No results for '[query]'" with search icon
  - No query: "Search your library" placeholder state

---

## Task 8: Upload Page

**Goal:** Drag & drop upload with metadata search, season/episode inputs, progress tracking.

- [ ] Create `packages/web/src/app/upload/page.tsx` (`'use client'`):

  **Step 1 — File selection:**
  - Large drag & drop zone (dashed border, centered icon + text "Drag files here or click to browse")
  - `<input type="file" accept="video/*" multiple>` hidden, triggered on click
  - On file select: auto-detect season/episode from filename using regex patterns:
    - `S(\d+)E(\d+)` → season + episode
    - `- (\d+)` or `\[(\d+)\]` → episode only
    - Year: `(19|20)\d{2}` → year

  **Step 2 — Metadata search (per file):**
  - Auto-populate search field from parsed filename (strip resolution/group tags)
  - Type selector: Movie / Series / Anime
  - "Search TMDB/Jikan" button → calls `GET /metadata/search?q=...&type=...`
  - Results list: poster thumbnail, title, year, source badge (TMDB/Jikan)
  - Click result: creates media entry via `POST /media`, pre-fills season/episode fields

  **Step 3 — Season/Episode assignment** (for series/anime):
  - Number inputs for Season and Episode
  - Pre-filled from filename parse; user can override

  **Step 4 — Upload:**
  - "Upload" button: calls `POST /upload/initiate` → gets presigned S3 URL → `fetch(presignedUrl, { method: 'PUT', body: file })`
  - Progress bar per file: uses `XMLHttpRequest` with `upload.onprogress` event for byte-level progress
  - On complete: calls `POST /upload/complete`
  - Multiple concurrent uploads: each file has its own upload state (filename, progress %, status badge)
  - Status badges: Waiting | Uploading (XX%) | Complete | Failed (retry button)

---

## Task 9: Category Pages

**Goal:** Filtered media grids for Anime, Movies, TV Shows with sorting.

- [ ] Create `packages/web/src/app/anime/page.tsx` (Server Component):
  - Fetch `GET /media?type=anime&sort=created_at&limit=100`
  - Render `<CategoryGrid title="Anime" items={media} />`

- [ ] Create `packages/web/src/app/movies/page.tsx` (Server Component):
  - Same pattern with `type=movie`

- [ ] Create `packages/web/src/app/tv/page.tsx` (Server Component):
  - Same pattern with `type=series`

- [ ] Create `packages/web/src/components/CategoryGrid.tsx` (`'use client'`):
  - Props: `title: string`, `items: MediaResponse[]`
  - Page title + item count (e.g., "Anime (47)")
  - Sort controls (client-side re-sort, no refetch):
    - Sort by: Recently Added | Title A–Z | Rating (desc) | Year (desc)
    - Active sort: underlined/bold
  - CSS Grid: `repeat(auto-fill, minmax(160px, 1fr))` with `gap-4`
  - Renders `<MediaCard>` for each item
  - Empty state: "Nothing here yet. Upload some content or use Discover."

---

## Task 10: Discover Page

**Goal:** Search anime via Jikan and queue downloads.

- [ ] Create `packages/web/src/app/discover/page.tsx` (`'use client'`):

  **Layout:**
  - Search bar at top: placeholder "Search anime to add to Babylon..."
  - Debounced search: 400ms, calls `GET /ingest/search?q=...` (Jikan results)
  - Results grid: `repeat(auto-fill, minmax(220px, 1fr))`

  **Anime result card:**
  - Poster image (Jikan provides MAL CDN URLs via `cdn.myanimelist.net`, already in `next/image` remotePatterns)
  - Title (bold)
  - Year + episode count (e.g., "2021 · 24 episodes")
  - Genre tags (first 3 only)
  - Synopsis (3-line truncate)
  - "Already in Library" badge (green chip) if `inLibrary === true` from API response — clicking the badge navigates to `/media/[libraryId]`
  - "Add to Babylon" button (red, full width):
    - Disabled + spinner while requesting
    - Calls `POST /ingest/queue` with `{ title, nyaaQuery: title }`
    - On success: show toast "Queued for download!" and disable button permanently
    - On error: show toast with error message

- [ ] Create `packages/web/src/components/Toast.tsx` (`'use client'`):
  - Global toast container (fixed bottom-right)
  - `useToast()` hook: `toast(message, type: 'success' | 'error' | 'info')`
  - Auto-dismiss after 4 seconds
  - Slide-in animation from right

---

## Task 11: Ingest Status Panel

**Goal:** Slide-out panel showing ingest queue with live updates.

- [ ] Create `packages/web/src/components/IngestStatus.tsx` (`'use client'`):

  **Trigger:** Icon button in navbar (gear/download icon)
  - When clicked: panel slides in from the right (fixed, full height, w-80)
  - Overlay darkens the rest of the page

  **Panel content:**
  - Header: "Ingest Status" + close button (X)
  - Daemon status indicator: green dot "Running" / gray dot "Idle" (from `status.running`)
  - Last poll time: "Last checked: 2 minutes ago" (format relative time)
  - "Force Poll" button → `POST /ingest/trigger`

  **Current task** (if `status.currentTask !== null`):
  - Title + state badge
  - Progress bar (red, percentage)
  - State badges: `searching` (blue), `downloading` (yellow), `transcoding` (orange), `uploading` (purple), `done` (green), `failed` (red)

  **Queue list** (from `status.queue`):
  - Each item: title, state badge, progress bar (if downloading)
  - Empty state: "Queue is empty"

  **Polling:**
  - `setInterval` every 10 seconds while panel is open
  - Clear interval on panel close

  **Active count badge** (shown on nav icon):
  - Count of queue items where `state !== 'done' && state !== 'failed'`
  - Red circle badge, hidden when count is 0

---

## Task 12: Loading and Error States

**Goal:** Consistent loading skeletons and error boundaries across all pages.

- [ ] Create `packages/web/src/app/loading.tsx` — global loading UI (skeleton of home page)
- [ ] Create `packages/web/src/app/error.tsx` (`'use client'`) — global error boundary with "Try again" button
- [ ] Create `packages/web/src/components/Skeleton.tsx` — reusable skeleton components:
  - `<MediaCardSkeleton>` — poster-shaped pulsing gray box
  - `<HeroBannerSkeleton>` — full-width pulsing banner
  - `<EpisodeListSkeleton>` — stacked row skeletons
- [ ] Add `loading.tsx` to `/media/[id]/`, `/watch/[id]/`, `/search/`, `/discover/`

---

## Task 13: Vercel Deployment Config

**Goal:** Configure the project for Vercel deployment.

- [ ] Create `packages/web/vercel.json`:
  ```json
  {
    "framework": "nextjs",
    "buildCommand": "cd ../.. && pnpm --filter @babylon/web build",
    "outputDirectory": "packages/web/.next",
    "installCommand": "pnpm install"
  }
  ```
- [ ] Add `NEXT_PUBLIC_API_URL` to Vercel environment variables (documented in plan, set manually in dashboard)
- [ ] Ensure `packages/web/.gitignore` excludes `.next/`, `node_modules/`, `.env.local`

---

## Design Implementation Notes

### Tailwind Class Patterns

Use the custom Tailwind tokens consistently:

| Element | Classes |
|---------|---------|
| Page background | `bg-bg` |
| Card | `bg-card rounded-card` |
| Accent button | `bg-accent hover:bg-red-700 text-white` |
| Text muted | `text-text-muted` |
| Progress bar | `bg-accent` on `bg-[#333]` track |
| Border | `border-border` |
| Hover card scale | `hover:scale-105 transition-transform duration-200` |

### Responsive Breakpoints

```ts
// Tailwind defaults (use as-is):
// sm: 640px
// md: 768px   ← mobile/tablet breakpoint
// lg: 1024px
// xl: 1200px  ← tablet/desktop breakpoint
```

### Server vs Client Components

| Component | Type | Reason |
|-----------|------|--------|
| `page.tsx` (data-fetching pages) | Server | Fetch data at request time, no interactivity |
| `Navbar.tsx` | Client | `usePathname()`, hamburger state, PIN access |
| `HeroBanner.tsx` | Client | Resume button depends on progress, potential animations |
| `MediaRow.tsx` | Server | Static layout, children handle interactions |
| `MediaCard.tsx` | Server | No interactivity needed |
| `ContinueWatchingCard.tsx` | Server | Static rendering is fine |
| `MediaDetail.tsx` | Client | Season tabs, modal state, router |
| `EditMetadataModal.tsx` | Client | Form state, API calls |
| `Player.tsx` | Client | Video, intervals, keyboard events |
| `PlayerPage.tsx` | Client | Presigned URL fetch (needs localStorage PIN) |
| `CategoryGrid.tsx` | Client | Sort state |
| `IngestStatus.tsx` | Client | Polling interval, panel state |
| `Toast.tsx` | Client | Global state, timers |

### Image Handling

All `next/image` usage must include:
- `sizes` prop for responsive images: `"(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 14vw"` for cards
- `placeholder="blur"` with `blurDataURL` (a tiny base64 LQIP or the default gray)
- `fill` layout for full-bleed images (backdrop, hero) — parent must be `position: relative`

### Video Player Styling Notes

- The `<video>` element itself should have no browser-default controls (`controls` attribute absent)
- Use `pointer-events: none` on the video when controls are being interacted with
- The progress scrubber (`<input type="range">`) needs custom CSS to show red fill:
  ```css
  input[type="range"]::-webkit-slider-thumb { background: #e50914; }
  input[type="range"]::-webkit-slider-runnable-track { background: linear-gradient(to right, #e50914 var(--progress), #333 var(--progress)); }
  ```
  Use a CSS custom property `--progress` updated via `style` prop on the input element.

---

## File Structure Summary

```
packages/web/
├── .env.example
├── .env.local
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx                    # Root layout, Inter font, Navbar
    │   ├── loading.tsx                   # Global loading skeleton
    │   ├── error.tsx                     # Global error boundary
    │   ├── page.tsx                      # Home screen
    │   ├── anime/
    │   │   └── page.tsx                  # Anime category grid
    │   ├── movies/
    │   │   └── page.tsx                  # Movies category grid
    │   ├── tv/
    │   │   └── page.tsx                  # TV Shows category grid
    │   ├── discover/
    │   │   ├── page.tsx                  # Discover + Jikan search
    │   │   └── loading.tsx
    │   ├── search/
    │   │   ├── page.tsx                  # Search page
    │   │   └── loading.tsx
    │   ├── upload/
    │   │   └── page.tsx                  # Upload page
    │   ├── media/
    │   │   └── [id]/
    │   │       ├── page.tsx              # Media detail
    │   │       └── loading.tsx
    │   └── watch/
    │       └── [id]/
    │           ├── page.tsx              # Player page (server wrapper)
    │           └── loading.tsx
    ├── components/
    │   ├── CategoryGrid.tsx              # Filterable/sortable grid
    │   ├── ContinueWatchingCard.tsx      # Landscape card with progress
    │   ├── EditMetadataModal.tsx         # Metadata edit modal
    │   ├── HeroBanner.tsx                # Home hero banner
    │   ├── IngestStatus.tsx              # Slide-out ingest panel
    │   ├── IngestStatusBadge.tsx         # Nav icon badge
    │   ├── MediaCard.tsx                 # Poster card
    │   ├── MediaDetail.tsx               # Detail page content
    │   ├── MediaRow.tsx                  # Horizontal scroll row
    │   ├── Navbar.tsx                    # Top navigation
    │   ├── Player.tsx                    # Custom HTML5 video player
    │   ├── PlayerPage.tsx                # Player client wrapper
    │   ├── Skeleton.tsx                  # Loading skeleton components
    │   └── Toast.tsx                     # Toast notification system
    └── lib/
        ├── api.ts                        # Typed API client
        ├── pin-store.ts                  # Zustand PIN store
        └── utils.ts                     # Shared utilities
```

---

## Implementation Order

Implement tasks in this order to minimize blocking dependencies:

1. **Task 1** — Project setup (no dependencies)
2. **Task 2** — API client (depends on Task 1; needed by everything else)
3. **Task 3** — Layout + Navbar (depends on Tasks 1-2; required for all pages to render)
4. **Task 4** — Home screen (depends on Tasks 1-3)
5. **Task 5** — Media detail (depends on Tasks 1-3)
6. **Task 6** — Video player (depends on Tasks 1-3, 5)
7. **Task 7** — Search page (depends on Tasks 1-3)
8. **Task 9** — Category pages (depends on Tasks 1-3)
9. **Task 10** — Discover page (depends on Tasks 1-3; Toast component)
10. **Task 11** — Ingest status (depends on Tasks 1-3; Navbar integration)
11. **Task 8** — Upload page (depends on Tasks 1-3; most complex standalone)
12. **Task 12** — Loading/error states (final polish pass, depends on all pages)
13. **Task 13** — Vercel deployment config (final step)
