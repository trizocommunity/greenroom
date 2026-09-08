# R2 Export Storage Migration (Drop Cloudinary for Badge/Certificate Exports)

## Status
- **Created**: 2026-09-08
- **Status**: Ready for Implementation (post-Cloudinary 10 MB cap fix)
- **Priority**: Medium (Cloudinary cap workaround is in place; this is the long-term fix)
- **Complexity**: High (storage migration, signed-URL flow, cron cleanup, schema change)
- **Area**: Exports, Storage, Infrastructure, Cron
- **Blocks**: PRINT-quality badge exports > 10 MB; PRINT-quality certificate exports for full festivals; multi-team exports at PRINT

This issue is the planned **Path A** from the Cloudinary cap discussion: migrate badge/certificate exports from Cloudinary Free (10 MB cap, slow Free-tier throttling) to Cloudflare R2 (5 GB per-file cap, free egress).

The short-term fix is already live: drawer enforces single team + single category (`88cb33b8`), 9 MiB client cap (`bb9d92c9`), 10 MB Cloudinary cap surfaced in banner hints (`bb9d92c9`), upload progress + 5-min timeout (`314ead9b`), Basic Auth on download fetch (`3cf2ccd1`). This issue is the long-term fix.

---

## 1. Background

### Current state — Cloudinary
- Browser → `POST /api/v1/exports/sign-upload` (signed params) → direct upload to `https://api.cloudinary.com/v1_1/{cloud}/raw/upload` (100 MB cap on Plus tier, 10 MB cap on Free).
- Server → `fetch(secure_url)` with Basic Auth → store base64 in `festival_export.fileData`.
- `cron-daily.ts` → `export-gc-cloudinary` step deletes Cloudinary asset, then `export-gc` deletes DB row.
- 1-day retention (`RETENTION_DAYS = 1`).

### Why we need to move off Cloudinary
1. **10 MB cap on Free** — single-team PRINT badges exceed this for any team with > ~50 participants. The Cloudinary response is `400 "File size too large. Got 13560364. Maximum is 10485760."`.
2. **Egress fees** — Cloudinary charges for downloads (Free tier: 25 GB/mo). R2 has **zero egress fees**, which matters for a download-heavy workflow like exports.
3. **Slow Free-tier latency** — 5–10 MB uploads on Cloudinary Free regularly take 1–5 minutes with no SLA.
4. **Account-level access controls** — already required us to send Basic Auth on download fetch (`3cf2ccd1`). R2's signed URLs are simpler.

### Why Cloudflare R2
- **5 GB per file** (vs Cloudinary's 10 MB) — covers any realistic badge export at PRINT quality.
- **10 GB free storage** (vs Cloudinary's 25 GB credits — actually 25 GB "managed" but bandwidth-bounded).
- **Zero egress fees** — biggest long-term win.
- **S3-compatible API** — drop-in for any tooling.
- **Cloudflare CDN** baked in — downloads are fast globally.

### Non-goals
- Migrating non-export Cloudinary usage (poster images, festival logos, news images via `/api/v1/upload`). Those continue using Cloudinary `image/upload` and stay within the 10 MB image cap (those are JPG/PNG, never 10 MB+).
- Replacing the Inngest `poster-render` flow for single-poster exports (already uses Cloudinary URL directly, no base64 round-trip).
- Storage tier changes for the existing `/api/v1/upload` route.

---

## 2. Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Storage backend | **Cloudflare R2** via S3-compatible API |
| 2 | Per-file cap | **5 GB** (R2 hard limit) — no practical ceiling for badge/cert PDFs |
| 3 | Free tier limits | 10 GB storage, 1M Class B ops/mo, **0 egress** |
| 4 | Storage layout | `greenroom/exports/{exportId}.{pdf|zip}` — flat folder, publicId = exportId (deterministic, matches existing Cloudinary pattern) |
| 5 | Upload path | Browser → presigned PUT URL → R2 directly. No Vercel edge hop. |
| 6 | Server fetch strategy | **Stop fetching base64**. Store R2 URL in DB. Downloads redirect (302) to R2. |
| 7 | Auth model | Presigned PUT for upload (5-min TTL). Public-read objects via R2 public bucket or presigned GET on demand. |
| 8 | Bucket visibility | **Public-read** via R2 custom domain or `r2.dev` subdomain. Avoids signed-URL plumbing on every download. |
| 9 | Custom domain | Use `r2.greenroomfestivals.in` or stick with `*.r2.dev` for MVP |
| 10 | Cloudinary cleanup | Delete the Cloudinary helper, sign-upload route, cron step. Keep `/api/v1/upload` for image uploads. |
| 11 | Migration of existing data | One-time script: scan `festival_export` rows, re-upload base64 to R2, write URL. Skip rows older than 1 day (already past retention — they're already cron-deleted). |
| 12 | Cron retention | Drop Cloudinary cleanup step. New step: list R2 objects in `greenroom/exports` folder, delete DB rows whose `expiresAt < now`, then `s3.deleteObject` for each R2 key. |
| 13 | Failure handling | Upload failure → user sees banner with retry. Storage deletion failure → log + retry next cron run (current pattern). |
| 14 | Local dev | Use MinIO (S3-compatible) via Docker compose. R2-specific code paths gated behind env. |
| 15 | Vercel Blob | Considered; rejected — requires Vercel Pro ($20/mo) just to use it. R2 is free. |

---

## 3. Problem Statement

1. PRINT-quality badge exports for medium/large teams (> ~50 participants) exceed Cloudinary Free's 10 MB cap → no path forward on Cloudinary Free tier.
2. Cloudinary Plus raises cap to 20 MB but costs $89/mo and still doesn't cover truly large festivals.
3. Cloudinary charges egress for downloads; at scale this becomes a meaningful bill.
4. The current architecture (base64 in DB) wastes ~33% storage and forces a server-side fetch round-trip on every export.

---

## 4. Solution

### 4.1 New environment variables

```env
# .env / .env.development / .env.production
R2_ACCOUNT_ID="<cloudflare-account-id>"
R2_ACCESS_KEY_ID="<r2-api-token-access-key>"
R2_SECRET_ACCESS_KEY="<r2-api-token-secret>"
R2_BUCKET="greenroom-exports"
R2_PUBLIC_BASE_URL="https://bucket-<hash>.r2.dev"  # or custom domain
R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"

# Local dev (MinIO via Docker compose)
R2_ENDPOINT="http://localhost:9000"
R2_ACCESS_KEY_ID="minioadmin"
R2_SECRET_ACCESS_KEY="minioadmin"
R2_BUCKET="greenroom-exports"
R2_PUBLIC_BASE_URL="http://localhost:9000/greenroom-exports"
```

### 4.2 New files

#### `src/core/integrations/r2.ts` — R2 SDK wrapper
- Reads config from env (`R2_*` vars).
- Mirrors `src/core/integrations/cloudinary.ts` API surface:
  - `r2PresignPutUrl(key, contentType, ttlSeconds)` — returns `{ url, key, publicUrl }`.
  - `r2PutObject(key, buffer, contentType)` — server-side upload (for cron migrations).
  - `r2DeleteObject(key)` — single-object delete.
  - `r2ListPrefix(prefix)` — list keys under prefix (for cron sweep).
- Uses `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (S3 API).

#### `src/app/api/v1/exports/sign-r2-upload/route.ts` — signed URL endpoint
- Mirrors `src/app/api/v1/exports/sign-upload/route.ts` but returns an R2 presigned PUT URL instead of Cloudinary signed params.
- Auth: same `assertFestivalAccess` check + `festivalExport` status check.
- Response shape: `{ url, key, publicUrl, expiresIn }`.

#### `scripts/migrate-exports-to-r2.ts` — one-time migration
- Scans `festival_export` rows where `status='COMPLETED'` and `fileData IS NOT NULL`.
- For each row: decode base64 → upload to R2 with key `greenroom/exports/{exportId}.{pdf|zip}` → write `cloudinaryPublicId` column to R2 key.
- Skips rows where `expiresAt < now()` (cron already deleted them or will).
- Idempotent — re-running skips rows where `cloudinaryPublicId` already points to R2.
- Reports `{ scanned, uploaded, skipped, failed }`.

#### `docker-compose.r2.yml` — local MinIO (optional, dev-only)
- Single MinIO container with default creds, port 9000.
- Documented in `scripts/setup-local-r2.md`.

### 4.3 File edits

#### `src/features/exports/actions/export-template.actions.ts`
- New signature for `finalizeTemplateExportAction`:
  - Old: takes `{ secureUrl, publicId, bytes, itemCount, includeAi }`
  - New: takes `{ r2Key, r2PublicUrl, bytes, itemCount, includeAi }`
- Stop fetching and storing base64. Store `r2Key` directly.
- `fileName` + `mimeType` derivation unchanged.

#### `src/features/exports/repositories/export.repository.ts`
- `CompleteExportInput` gains `r2Key: string`.
- `completeExport()` writes `r2Key` to a new column.
- Add `listExpiredExportR2Keys()` (replaces `listExpiredExportCloudinaryIds()`).

#### `src/core/database/schema.ts`
- Add `r2Key: text("r2_key")` column to `festival_export`.
- Keep `cloudinaryPublicId` as nullable for the migration window (delete after migration).
- New migration: `drizzle/00XX_add_festival_export_r2_key.sql`.

#### `src/app/api/v1/exports/sign-upload/route.ts`
- **Delete** (replaced by `sign-r2-upload`).

#### `src/app/api/v1/exports/sign-upload/sign-cloudinary-upload.ts`
- **Delete** (no longer used).

#### `src/app/api/v1/exports/sign-upload/sign-cloudinary-upload.test.ts`
- **Delete**.

#### `src/app/dashboard/[slug]/exports/_components/ClientTemplateExportRunner.tsx`
- Replace the three-step Cloudinary flow with two steps:
  1. `POST /api/v1/exports/sign-r2-upload` → `{ url, key, publicUrl }`
  2. `PUT` the file to `url` directly via XHR (same AbortController + 5-min timeout pattern from `314ead9b`)
  3. `finalizeTemplateExportAction({ r2Key, r2PublicUrl, bytes, itemCount, includeAi })`

#### `src/app/api/v1/exports/[id]/download/route.ts`
- Stop streaming base64.
- 302 redirect to `r2PublicUrl` for `COMPLETED` rows where `r2Key IS NOT NULL`.

#### `src/inngest/functions/cron-daily.ts`
- Replace `export-gc-cloudinary` step with `export-gc-r2`:
  1. `listExpiredExportR2Keys()` → array of `{ id, r2Key }`
  2. For each: `r2DeleteObject(r2Key)` (failures logged, don't block)
  3. `deleteExpiredExports()` (unchanged)

#### `src/core/integrations/cloudinary.ts`
- **Keep** `uploadBuffer`, `deleteFile`, `extractPublicIdFromUrl`, `cloudinaryBasicAuthHeader` — still used by `/api/v1/upload` and `poster-render`.
- **Delete** any export-related helpers if they exist (currently none).

### 4.4 Test edits

#### `src/app/api/v1/exports/sign-cloudinary-upload.test.ts`
- **Delete** (no longer applicable).

#### `src/features/exports/actions/export.actions.test.ts`
- Update mocks: `deleteFile` is replaced by `r2DeleteObject` (or remove the Cloudinary call entirely if `deleteExportAction` no longer touches Cloudinary).

#### New: `src/app/api/v1/exports/sign-r2-upload/route.test.ts`
- Mirrors the deleted Cloudinary sign test, but for R2 presigning.
- Mock `@aws-sdk/s3-request-presigner` to assert presigned URL contains the right bucket + key.

#### New: `src/core/integrations/r2.test.ts`
- Pure tests for `r2PresignPutUrl` signature correctness, `r2PutObject` headers, `r2DeleteObject` happy/error paths.

### 4.5 Cron-daily Inngest function tests

- Existing `cron-daily.test.ts` (integration test) was already failing due to a pre-existing Inngest API change. This issue does not need to fix that — the unit tests for the R2 cleanup step can go in a separate integration test (or skip if the underlying Inngest mocking is broken).

---

## 5. Migration Strategy

### 5.1 Existing data
- `festival_export.fileData` (base64) — current state.
- `festival_export.cloudinaryPublicId` — populated for exports after the Cloudinary fix landed (`bb9d92c9`).
- `festival_export.expiresAt` — set to `queuedAt + 1 day`.

### 5.2 Order of operations

1. **Add R2 columns + env vars** — additive migration, no behavior change.
2. **Build R2 helpers + sign-r2-upload route** — new code, no existing flows touched.
3. **Deploy R2 code paths for NEW exports** — runner uses R2 for any new export from now on. Existing Cloudinary flows still work for old exports.
4. **Run migration script once** — `scripts/migrate-exports-to-r2.ts` scans `festival_export` rows where `status='COMPLETED'` and uploads them to R2. Idempotent.
5. **Switch download route** — 302 redirect to R2 for rows with `r2Key`. Base64 fallback only for legacy rows that pre-date this migration.
6. **Update cron cleanup** — sweep R2 instead of Cloudinary for `expiresAt < now` rows.
7. **Remove Cloudinary flow from runner** — runner no longer calls Cloudinary. Existing Cloudinary assets in `greenroom/exports` folder become orphaned; Cloudinary free tier auto-deletes after some time, or run a one-time cleanup.
8. **Drop `cloudinaryPublicId` column** — final migration.

### 5.3 Rollback plan

- Each step is reversible via git + migration:
  - Roll back runner to Cloudinary: `git revert <commit>` on the runner edit.
  - Roll back schema: hand-authored `drizzle/00YY_drop_festival_export_r2_key.sql` (deferred until step 8).
- R2-stored files persist regardless of code state (downloads still work even if download route is broken — direct R2 URL).

---

## 6. Out of Scope

- **Real-time progress on R2 uploads** — the existing XHR `progress` event still works (PUT to presigned URL has the same body). No code change.
- **Inngest server-side rendering of badges/certificates** — separate issue (mentioned in earlier planning, ~2-3 week refactor).
- **Image upload route migration** — `/api/v1/upload` continues using Cloudinary `image/upload` for poster/festival images. Different cap (10 MB image), different endpoint.
- **Cloudinary CDN migration for image transformations** — out of scope. Cloudinary's image transforms are still useful for `poster-render`.
- **R2 access via custom domain** — start with `*.r2.dev`, custom domain can come later.
- **Lifecycle policy / auto-delete on R2** — cron handles it. No native R2 lifecycle needed.

---

## 7. Testing

### Unit tests
- `src/core/integrations/r2.test.ts` — presign URL signature, key naming, error paths.
- `src/app/api/v1/exports/sign-r2-upload/route.test.ts` — route auth, payload shape.
- Updated `export.actions.test.ts` — mocks for new R2-based flow.

### Manual verification
- Local dev with MinIO:
  1. `docker compose -f docker-compose.r2.yml up -d`
  2. Trigger badge export from `/dashboard/[slug]/exports`
  3. Watch Network tab — should see `POST /api/v1/exports/sign-r2-upload` (200, fast) then `PUT https://...r2.cloudflarestorage.com/...` (200, with XHR progress)
  4. After completion, `curl {publicUrl}` returns the PDF
  5. Download from the table redirects to R2 (302) and streams the file
- Production deploy: same flow against real R2 bucket.
- Cron sweep: set `expiresAt` to a past timestamp, wait for next 00:00 UTC tick, verify R2 objects are deleted and DB rows removed.

### Edge cases
- R2 credentials missing → runner shows clear error, doesn't crash.
- R2 endpoint unreachable → 5-min timeout fires, banner shows timeout hint.
- Concurrent exports → unique `r2Key` per `exportId` (deterministic); no collisions since `exportId` is UUID.
- Cron partial failure → logged, retried next run.

---

## 8. Effort Estimate

| Step | Effort |
|---|---|
| R2 helpers (`r2.ts`) | 1 day |
| Sign-r2-upload route | 0.5 day |
| Schema + migration | 0.5 day |
| Action + repo + runner swap | 1.5 days |
| Download route redirect | 0.5 day |
| Cron sweep update | 0.5 day |
| Migration script | 1 day |
| Tests (unit + manual) | 1 day |
| Deploy + smoke test in prod | 1 day |
| **Total** | **~7.5 days** |

---

## 9. Success Criteria

- Badge export at PRINT quality for a 200-participant festival works end-to-end (would be ~50 MB PDF on Cloudinary Free; ~50 MB PDF on R2 within the 5 GB cap).
- `cloudinaryPublicId` column dropped after migration.
- No regression in non-template exports (call lists, results, etc. — these never touched Cloudinary for exports).
- Cron GC cleans both R2 objects and DB rows within 24 hours of `expiresAt`.
- Local dev works with MinIO via Docker compose.
