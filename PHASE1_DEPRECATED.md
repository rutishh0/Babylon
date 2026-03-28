# Phase 1 — Deprecated

**Date:** 2026-03-28
**Reason:** Pivoting from cloud hosting (UpCloud VPS + Scaleway S3 + Vercel) to local hosting on an Alienware M15 R2 connected to the home LAN.

## What Changed

Phase 2 makes exactly two changes:

1. **Storage:** Scaleway Object Storage → local disk on the Alienware (`D:\Babylon\media`)
2. **Hosting:** UpCloud VPS + Vercel → local Alienware on home WiFi (API on port 3000, web on port 3001)

Everything else — the database schema, API routes, ingest pipeline, frontend UI, Android app — is identical.

## Why

- Scaleway account ran out of credits, blocking the entire ingest pipeline at the S3 upload step
- UpCloud VPS costs $112/month for a machine that sits idle most of the time
- The Alienware M15 R2 (i7-9750H, RTX 2070, 16GB RAM) is more powerful than the VPS and already owned
- NVENC hardware transcoding on the RTX 2070 is 10x faster than CPU transcoding on the VPS
- Local disk eliminates upload latency and S3 costs entirely

## Phase 1 Code

All Phase 1 code remains in the repository exactly as-is. Nothing is deleted. Files marked with a deprecation comment block at the top:

- `packages/api/src/index.ts`
- `ingest/daemon.py`
- `packages/web/src/app/layout.tsx`

## Phase 1 Documentation

- Full retrospective: `docs/superpowers/specs/2026-03-28-babylon-phase1-retrospective.md`
- Original plans: `docs/superpowers/plans/2026-03-27-babylon-*.md`

## External Services to Shut Down (manual)

- [ ] Vercel project `babylon-web` — delete on vercel.com
- [ ] Scaleway Object Storage — review when credits are available
- [ ] UpCloud VPS ($112/month) — shut down once Phase 2 is confirmed working
- [ ] IONOS DNS `api.internalrr.info` A record — can be removed (no longer needed)
