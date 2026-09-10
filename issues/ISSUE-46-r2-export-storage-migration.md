# Supabase Storage Export Migration (Drop Cloudinary for Badge/Certificate Exports)

## Status
- **Created**: 2026-09-09
- **Supersedes**: 2026-09-08 R2 plan in this same file (R2 was replaced by Supabase Storage on 2026-09-09; this file was overwritten in place)
- **Status**: Ready for Implementation (post-Cloudinary 10 MB cap fix)
- **Priority**: Medium (Cloudinary cap workaround is in place; this is the long-term fix)
- **Complexity**: Medium-High (storage migration, signed-URL flow, cron cleanup, schema change — simpler than R2 because the SDK + auth model is lighter)
- **Area**: Exports, Storage, Infrastructure, Cron
- **Blocks**: PRINT-quality badge exports > 10 MB; PRINT-quality certificate exports for full festivals; multi-team exports at PRINT; Vercel Hobby's 4MB serverless response cap on download routes

This issue is the planned **long-term fix**: migrate badge/certificate exports from Cloudinary Free (10 MB cap, slow Free-tier throttling, egress fees) to **Supabase Storage** (5 GB per-file cap, signed URLs first-class via `@supabase/supabase-js`, Mumbai region to match Neon + Redis).

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
2. **Egress fees** — Cloudinary charges for downloads (Free tier: 25 GB/mo). Supabase Storage has predictable Free-tier egress (2 GB/mo).
3. **Slow Free-tier latency** — 5–10 MB uploads on Cloudinary Free regularly take 1–5 minutes with no SLA.
4. **Account-level access controls** — already required us to send Basic Auth on download fetch (`3cf2ccd1`). Supabase Storage's signed URLs are simpler.

### Why Supabase Storage
- **5 GB per file** (vs Cloudinary's 10 MB) — covers any realistic badge export at PRINT quality.
- **1 GB free storage** on the Free tier — comfortably covers the `RETENTION_DAYS = 1` working set.
- **First-class signed URLs** via `@supabase/supabase-js` — `createSignedUploadUrl()` and `createSignedUrl()` are one-liners; no need for a separate presigner SDK.
- **Mumbai region** (`ap-south-1`) available — matches Neon + Redis to keep the export flow on one continent.
- **Single, simpler SDK surface** — fewer env vars than R2 (no `ACCOUNT_ID`, `ENDPOINT`, `ACCESS_KEY_ID`/`SECRET_ACCESS_KEY` split); `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` is the entire credential set.
- **Matches the existing stack pattern** — the codebase uses `@supabase/supabase-js` patterns in spirit for its simplicity, and the `src/core/database/client.ts` lazy-Proxy module shape can be mirrored exactly under `src/core/storage/supabase.ts`.

### Non-goals
- Migrating non-export Cloudinary usage (poster images, festival logos, news images via `/api/v1/upload`). Those continue using Cloudinary `image/upload` and stay within the 10 MB image cap (those are JPG/PNG, never 10 MB+).
- Replacing the Inngest `poster-render` flow for single-poster exports (already uses Cloudinary URL directly, no base64 round-trip).
- Storage tier changes for the existing `/api/v1/upload` route.
- Custom domain on the Supabase Storage bucket — defer; use the default `*.supabase.co` URL for MVP.
- Direct S3-compatible API access to the Supabase Storage backend — defer; use `@supabase/supabase-js` only.

---

## 2. Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Storage backend | **Supabase Storage** via `@supabase/supabase-js` |
| 2 | Per-file cap | **5 GB** (Supabase Storage project default); configurable per project. No practical ceiling for badge/cert PDFs. |
| 3 | Free tier limits | 1 GB storage, 2 GB egress/mo, 50K MAU. Tracked separately from Neon + Redis quotas. |
| 4 | Storage layout | `{bucket}/festival/{festivalId}/{exportId}.{ext}` — flat per festival, key is the `festival_export.id` (deterministic). |
| 5 | Upload path (server-generated exports, §2 types) | Server uploads via `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). Handler returns JSON `{ url }` to client. Client downloads directly from Supabase CDN. |
| 6 | Upload path (client-generated exports, §3 BADGE/CERTIFICATE) | Two-step: server issues `createSignedUploadUrl()` → browser PUTs the file directly → server finalizes row. No Vercel edge hop on the upload body. |
| 7 | Server fetch strategy | **Stop fetching base64 for new rows.** New rows write `exportKey` only. Download route returns `{ url: signedUrl }` for rows where `exportKey IS NOT NULL`; legacy rows where `fileData IS NOT NULL` keep streaming base64 until they age out. |
| 8 | Auth model | **Private bucket** — never public. Server uses `SUPABASE_SERVICE_ROLE_KEY`. Client uploads use `createSignedUploadUrl()` (5-min TTL). Client downloads use `createSignedUrl()` (default 10 min, overridable per call). |
| 9 | Custom domain | Out of scope for MVP — use the default `*.supabase.co` storage URL. |
| 10 | Cloudinary cleanup | Delete the Cloudinary helper, sign-upload route, cron step. Keep `/api/v1/upload` for image uploads. |
| 11 | Migration of existing data | **Optional, never-blocking.** `scripts/migrate-exports-to-supabase.ts` scans `festival_export` rows where `fileData IS NOT NULL AND exportKey IS NULL`, re-uploads to Supabase, writes `exportKey`. Idempotent. Skip rows older than `expiresAt`. Default OFF — base64 fallback carries legacy rows until they age out via cron. |
| 12 | Cron retention | Extend `export-gc` step: list rows past `expiresAt`, call `supabase.storage.remove([keys])` for each `exportKey`, then `db.delete()` the row. Cloudinary sweep deleted; no longer needed. |
| 13 | Failure handling | Upload failure → user sees banner with retry (existing pattern). Storage deletion failure in cron → log + retry next cron run (current pattern). Signed URL failure on the client → user reloads; `expiresAt` is well past client refresh cycles. |
| 14 | Local dev | **Real Supabase project** (Mumbai region, matches Neon + Redis). Free-tier quota. No docker-compose container needed. |
| 15 | Alternatives considered | Cloudflare R2 — rejected (heavier S3 + presigner SDK surface, more env vars). Vercel Blob — rejected (requires Vercel Pro). Direct S3-compatible API against Supabase Storage — rejected for MVP (extra package, no immediate benefit). |

---

## 3. Problem Statement

1. PRINT-quality badge exports for medium/large teams (> ~50 participants) exceed Cloudinary Free's 10 MB cap → no path forward on Cloudinary Free tier.
2. Cloudinary Plus raises cap to 20 MB but costs $89/mo and still doesn't cover truly large festivals.
3. Cloudinary charges egress for downloads; at scale this becomes a meaningful bill.
4. Vercel Hobby's 4 MB serverless response-body cap is hit when the download route streams a >4 MB file inline — today this is masked because most files fit, but multi-team PRINT exports reliably exceed it.
5. The current architecture (base64 in DB) wastes ~33% storage and forces a server-side fetch round-trip on every export.

---

## 4. Solution

### 4.1 New environment variables

```env
# .env / .env.development / .env.production
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"   # server-only, never NEXT_PUBLIC_*
SUPABASE_STORAGE_BUCKET="greenroom-exports"
SUPABASE_SIGNED_URL_TTL=600                      # seconds; override per-call if needed
```

All four `.env*` files updated. **Critical:** `SUPABASE_SERVICE_ROLE_KEY` must never be prefixed `NEXT_PUBLIC_*` — it bypasses RLS and would expose write access to the entire bucket if it reached the browser.

Local dev uses the same env block pointing at the real (Mumbai) Supabase project — no MinIO container.

### 4.2 New files

#### `src/core/storage/supabase.ts` — lazy server-only client
- `import "server-only"` (same guard as `src/core/database/client.ts:1`).
- Lazy-instantiates `@supabase/supabase-js` client on first call so `next build` doesn't throw when env vars are absent — mirrors `database/client.ts:45-62` exactly.
- Uses `SUPABASE_SERVICE_ROLE_KEY` so server-side uploads/signed-URL issuance bypass RLS.
- Exports `getSupabaseAdmin()` returning a typed client, plus `db`-style Proxy so call sites read like existing patterns.
- Registers SIGTERM/SIGINT shutdown only in production (mirroring `client.ts:57-59`).
- Co-located `src/core/storage/exports.ts` exports `uploadExport(key, buffer, contentType)`, `createSignedUploadUrl(key)`, `getSignedDownloadUrl(key, ttl?)`, `deleteExport(key)` — thin wrappers around `supabase.storage.from(bucket).{...}` so call sites don't import the SDK directly.

#### `src/app/api/v1/exports/sign-supabase-upload/route.ts` — signed upload endpoint
- Mirrors `src/app/api/v1/exports/sign-upload/route.ts` (Cloudinary) but returns `{ url, key, publicUrl: null }` from `supabase.storage.from(bucket).createSignedUploadUrl(key)`.
- Auth: same `assertFestivalAccess` check + `festivalExport` `status === "PROCESSING"` check.
- Response shape: `{ url, key, expiresIn: 300 }`.
- Used only by the BADGE/CERTIFICATE client-rendered flow (§3 of ISSUE-15).

#### `scripts/migrate-exports-to-supabase.ts` — one-time (optional)
- Scans `festival_export` rows where `fileData IS NOT NULL AND exportKey IS NULL AND expiresAt > now()`.
- Decodes base64 → uploads to Supabase with key `festival/{festivalId}/{exportId}.{ext}` → writes `exportKey`.
- Idempotent — re-running skips rows where `exportKey` is set.
- Reports `{ scanned, uploaded, skipped, failed }`.

#### `src/core/storage/__tests__/exports.test.ts` — unit tests
- Mocks `@supabase/supabase-js`; asserts upload is called with correct `key`/`contentType`, `getSignedDownloadUrl` returns a non-empty URL whose expiry matches `SUPABASE_SIGNED_URL_TTL`.

**No `docker-compose` file** — local dev runs against the real Supabase project (Locked Decision #14).

### 4.3 File edits

#### `src/core/database/schema.ts`
- Add `exportKey: text("export_key")` column to `festival_export` (around line 2453, after `cloudinary_public_id`).
- Keep `cloudinaryPublicId` as nullable for the migration window (delete after migration in a follow-up PR).
- Keep `fileData` (base64) — it stays as the legacy fallback for rows without `exportKey`.

#### New Drizzle migration: `drizzle/00XX_add_festival_export_export_key.sql`
```sql
ALTER TABLE "festival_export" ADD COLUMN "export_key" text;
```
Apply via `drizzle-kit migrate` against `DATABASE_URL_UNPOOLED`.

#### `src/features/exports/actions/export-template.actions.ts`
- New signature for `finalizeTemplateExportAction`:
  - Old: takes `{ secureUrl, publicId, bytes, itemCount, includeAi }` (Cloudinary-shaped).
  - New: takes `{ exportKey, bytes, itemCount, includeAi }`.
- Stop fetching and storing base64. Store `exportKey` directly when present.
- `fileName` + `mimeType` derivation unchanged.

#### `src/features/exports/repositories/export.repository.ts`
- `CompleteExportInput` gains `exportKey?: string` (optional — server-generated exports may not have one if the orchestrator itself uploads first).
- `completeExport()` writes `exportKey` when provided.
- Add `listExpiredExportKeys()` (replaces `listExpiredExportCloudinaryIds()`).

#### `src/app/api/v1/exports/sign-upload/route.ts`
- **Delete** (replaced by `sign-supabase-upload`).

#### `src/app/api/v1/exports/sign-upload/sign-cloudinary-upload.ts`
- **Delete** (no longer used).

#### `src/app/api/v1/exports/sign-upload/sign-cloudinary-upload.test.ts`
- **Delete**.

#### `src/app/dashboard/[slug]/exports/_components/ClientTemplateExportRunner.tsx`
- Replace the three-step Cloudinary flow with two steps (badge/cert path):
  1. `POST /api/v1/exports/sign-supabase-upload` → `{ url, key }`
  2. `PUT` the file to `url` directly via XHR (same AbortController + 5-min timeout pattern from `314ead9b`)
  3. `finalizeTemplateExportAction({ exportKey, bytes, itemCount, includeAi })`

#### Server-generated exports path — handler-side upload
- For CALL_LIST / RESULTS / TEAM_RESULT / JUDGE_LIST / VALUATION_SHEET / GREEN_ROOM_SIGN / SCHEDULE_CONFLICTS:
  - Handler renders the file in-memory (existing pattern).
  - After status → COMPLETED, handler calls `uploadExport(key, buffer, contentType)` from `src/core/storage/exports.ts` and writes `exportKey` to the row.
  - Download route returns `NextResponse.json({ url: await getSignedDownloadUrl(exportKey) })` instead of streaming.
  - Client gets `url`, fetches directly from Supabase CDN — Vercel's 4 MB response-body cap never enters the picture.

#### `src/app/api/v1/exports/[id]/download/route.ts`
- For rows with `exportKey`: return JSON `{ url }` (or 302 redirect if simpler — pick when coding). Else fall back to existing base64 stream path for legacy `fileData` rows.
- Same `assertFestivalAccess` + `getExportForDownload` lookup; same 404/403/410/409 handling for missing/forbidden/expired/not-ready.

#### `src/inngest/functions/cron-daily.ts`
- Replace `export-gc-cloudinary` step with `export-gc-supabase`:
  1. `listExpiredExportKeys()` → array of `{ id, exportKey }`
  2. For each: `deleteExport(exportKey)` (failures logged, don't block)
  3. `deleteExpiredExports()` (unchanged)

#### `src/core/integrations/cloudinary.ts`
- **Keep** `uploadBuffer`, `deleteFile`, `extractPublicIdFromUrl`, `cloudinaryBasicAuthHeader` — still used by `/api/v1/upload` and `poster-render`.
- **Delete** any export-related helpers if they exist (currently none).

### 4.4 Test edits

#### `src/app/api/v1/exports/sign-cloudinary-upload.test.ts`
- **Delete** (no longer applicable).

#### `src/features/exports/actions/export.actions.test.ts`
- Update mocks: `deleteFile` is replaced by `deleteExport` (or remove the Cloudinary call entirely if `deleteExportAction` no longer touches Cloudinary).

#### New: `src/app/api/v1/exports/sign-supabase-upload/route.test.ts`
- Mirrors the deleted Cloudinary sign test, but for `createSignedUploadUrl`.
- Mock `@supabase/supabase-js` to assert the signed URL contains the right bucket + key prefix.

#### New: `src/core/storage/exports.test.ts`
- Pure tests for `uploadExport`, `getSignedDownloadUrl`, `deleteExport` happy/error paths, all against a mocked Supabase client.

### 4.5 Cron-daily Inngest function tests
- Existing `cron-daily.test.ts` (integration test) was already failing due to a pre-existing Inngest API change. This issue does not need to fix that — the unit tests for the Supabase cleanup step can go in a separate integration test (or skip if the underlying Inngest mocking is broken).

---

## 5. Migration Strategy

### 5.1 Existing data
- `festival_export.fileData` (base64) — current state.
- `festival_export.cloudinaryPublicId` — populated for exports after the Cloudinary fix landed (`bb9d92c9`).
- `festival_export.expiresAt` — set to `queuedAt + 1 day`.

### 5.2 Order of operations

1. **Add `exportKey` column + env vars** — additive migration, no behavior change.
2. **Build `src/core/storage/{supabase,exports}.ts` + sign-supabase-upload route** — new code, no existing flows touched.
3. **Deploy server-generated export path** — orchestrator uploads via `uploadExport()` for any new §2 export from now on. `fileData` stays null; `exportKey` populated. Download route returns JSON `{ url }` for `exportKey IS NOT NULL` rows.
4. **Deploy client-rendered export path (BADGE/CERTIFICATE)** — runner uses `createSignedUploadUrl()` then PUT from browser, then `finalizeTemplateExportAction` writes `exportKey`.
5. **(Optional) Run migration script once** — `scripts/migrate-exports-to-supabase.ts` scans `festival_export` rows where `fileData IS NOT NULL AND exportKey IS NULL AND expiresAt > now()`, uploads to Supabase, writes `exportKey`. Idempotent. Not required for correctness — base64 fallback keeps legacy downloads working.
6. **Switch download route to JSON `{ url }` for new rows** — done in step 3 already; no separate hop.
7. **Update cron cleanup** — sweep Supabase objects + DB rows past `expiresAt`.
8. **(Follow-up PR) Drop `fileData` column** — once all in-flight downloads have aged out (≥ 1 day post-deploy, with cron sweep having run). Hand-authored `drizzle/00YY_drop_festival_export_file_data.sql`. **Out of scope for this PR.**
9. **(Follow-up PR) Drop `cloudinaryPublicId` column** — after step 8 and any straggler cleanup.

### 5.3 Rollback plan
- Each step is reversible via git + migration:
  - Roll back runner to Cloudinary: `git revert <commit>` on the runner edit.
  - Roll back schema: hand-authored `drizzle/00YY_drop_festival_export_export_key.sql` (deferred until step 8 of the follow-up PR).
- Supabase-stored files persist regardless of code state — even if the download route breaks, the bucket + signed URL still works.

---

## 6. Out of Scope

- **Real-time progress on Supabase uploads** — the existing XHR `progress` event still works (PUT to the signed upload URL has the same body). No code change.
- **Inngest server-side rendering of badges/certificates** — separate issue (mentioned in earlier planning, ~2-3 week refactor).
- **Image upload route migration** — `/api/v1/upload` continues using Cloudinary `image/upload` for poster/festival images. Different cap (10 MB image), different endpoint.
- **Cloudinary CDN migration for image transformations** — out of scope. Cloudinary's image transforms are still useful for `poster-render`.
- **Supabase Storage custom domain** — start with `*.supabase.co`, custom domain can come later.
- **Lifecycle policy / auto-delete on Supabase** — cron handles it. No native Supabase lifecycle needed.
- **Direct S3-compatible API access** — start with `@supabase/supabase-js` only.
- **Dropping `fileData` column** — follow-up PR after legacy rows age out.
- **Dropping `cloudinaryPublicId` column** — follow-up PR.

---

## 7. Testing

### Unit tests
- `src/core/storage/exports.test.ts` — `uploadExport`, `getSignedDownloadUrl`, `deleteExport` happy/error paths; mocked `@supabase/supabase-js`.
- `src/app/api/v1/exports/sign-supabase-upload/route.test.ts` — route auth, payload shape, mocked SDK.
- Updated `export.actions.test.ts` — mocks for new Supabase-based flow.

### Manual verification
- Local dev against the real Mumbai Supabase project:
  1. Trigger badge export from `/dashboard/[slug]/exports`
  2. Watch Network tab — should see `POST /api/v1/exports/sign-supabase-upload` (200, fast), then `PUT https://<project-ref>.supabase.co/storage/v1/object/...` (200, with XHR progress), then `finalizeTemplateExportAction` writing `exportKey`.
  3. After completion, `curl "{signedUrl}"` returns the PDF.
  4. Download from the table returns `{ url }` (or 302) and the file streams from Supabase.
- Production deploy: same flow against the production Supabase project.
- Cron sweep: set `expiresAt` to a past timestamp, wait for next 00:00 UTC tick, verify Supabase objects are deleted and DB rows removed.

### Edge cases
- Supabase credentials missing → runner shows clear error, doesn't crash.
- Supabase endpoint unreachable → 5-min timeout fires, banner shows timeout hint.
- Concurrent exports → unique `exportKey` per `festival_export.id` (deterministic UUID); no collisions.
- Cron partial failure → logged, retried next run.
- Signed URL expiry while user holds the page → next download click re-issues a fresh signed URL on demand.

---

## 8. Effort Estimate

| Step | Effort |
|---|---|
| `src/core/storage/{supabase,exports}.ts` | 0.75 day |
| Sign-supabase-upload route | 0.5 day |
| Schema + migration | 0.25 day |
| Server-generated path (handler upload + JSON download) | 1 day |
| Client-rendered path (sign-upload + PUT + finalize) | 1 day |
| Migration script (optional) | 0.5 day |
| Cron sweep update | 0.5 day |
| Tests (unit + manual) | 0.75 day |
| Deploy + smoke test in prod | 0.25 day |
| **Total** | **~5.5 days** |

---

## 9. Success Criteria

- Badge export at PRINT quality for a 200-participant festival works end-to-end (would be ~50 MB PDF on Cloudinary Free; ~50 MB PDF on Supabase Storage, well within the 5 GB cap).
- `cloudinaryPublicId` and `fileData` columns dropped in follow-up PRs once legacy rows have aged out.
- No regression in non-template exports (call lists, results, etc. — these never touched Cloudinary for exports).
- Cron GC cleans both Supabase objects and DB rows within 24 hours of `expiresAt`.
- Local dev works against the real (Mumbai) Supabase project — no docker-compose changes required.
- Download route JSON response body stays under 1 KB (a few hundred bytes for the signed URL), so Vercel Hobby's 4 MB response-body cap never constrains exports regardless of file size.
