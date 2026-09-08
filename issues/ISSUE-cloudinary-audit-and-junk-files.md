# Cloudinary Source-of-Truth, Used/Unused Audit & Junk Files UI

## Status

- **Created**: 2026-09-08
- **Status**: Planned — not yet started
- **Priority**: Medium (storage-cost hygiene + tier enforcement accuracy)
- **Complexity**: Medium-High
- **Target**: Production
- **Phasing**: 4 PRs (see §6 below) — proposed ordering
- **Blocks**: accurate tier storage limits; per-festival cleanup flows

## Summary

Greenroom uploads images, video and raw exports to Cloudinary across four code paths, but stores only the full `secure_url` (not the `public_id`) on most referencing rows. `festival.storageUsedBytes` is a write-time counter that drifts. There's no reconciliation against Cloudinary, no way for an admin to see or reclaim orphaned assets, and `festival.storageUsedMb` is read by the UI but never written by the upload path.

This issue introduces a `cloudinary_asset` source-of-truth table, writes/cleans it at every upload/destroy, drops the orphan `storageUsedMb` column, ships a nightly Inngest audit, and a festival-level + super-admin "Junk Files" gallery for unused-asset review and multi-select delete (report-only v1; no auto-delete).

## Locked Decisions

| #  | Question                                              | Decision |
|----|-------------------------------------------------------|----------|
| 1  | Approach                                              | **A** — `cloudinary_asset` table + nightly cron + UI |
| 2  | Cleanup policy                                        | **Report only, manual multi-select delete** with confirmation |
| 3  | Backfill scope                                        | **All known URL columns** (`festival.branding.logo`, `festival_news.imageUrl`, `festival_media_image.url`, `festival_media_video.url`, `festival_poster_template.backgroundUrl`, image refs inside `festival_poster_template.konvaJson`, `festival_export.cloudinary_public_id`) |
| 4  | Eager transforms in scope?                            | **Yes** — record children with `parent_public_id` |
| 5  | Page UI                                               | **Gallery of cards**, default sort **newest first** |
| 6  | Page content                                          | **Unused only** (never display used assets) |
| 7  | Image preview                                         | **Cloudinary on-the-fly transform**: `…/upload/<publicId>?w_400,h_400,c_fill,q_auto,f_auto` (videos: `so_2`; PDFs: `pg_1`) |
| 8  | Storage column                                        | **Drop `festival.storageUsedMb`**, keep `storageUsedBytes` materialised on every hook write |
| 9  | Day-one UX until first audit                          | **DB-only diff** — rows in `cloudinary_asset` whose `public_id` no longer appears in any URL column |
| 10 | Audit cadence                                         | **Inngest cron 03:00 UTC** |
| 11 | Source-of-truth table PK                              | **`public_id`** |
| 12 | Resource types supported                              | **image / video / raw** (matches existing `/image/upload` + `/raw/upload` calls) |
| 13 | Sidebar placement (festival)                          | **New group "Storage"** → `Junk Files` (admin/owner/super-admin only) |
| 14 | Sidebar placement (super-admin)                       | **New item `Junk Files`** in `SUPER_ADMIN_SIDEBAR_ITEMS` |
| 15 | Bulk delete UI                                        | **Sticky action bar** when ≥1 selected; confirmation modal; looped `deleteFile` + `markCloudinaryDeleted` |
| 16 | Concurrency on `storageUsedBytes`                     | **Same tx** as `cloudinary_asset` insert/soft-delete (existing pattern) |
| 17 | Auto-delete                                           | **Out of scope** for v1 |
| 18 | Drift alert email                                     | **Out of scope** for v1 |

---

# §1 — Source-of-Truth Table (PR 1)

## Plan

1. Migration `00XX_cloudinary_assets.sql`:
   ```sql
   CREATE TABLE cloudinary_asset (
     public_id           text PRIMARY KEY,
     festival_id         text REFERENCES festival(id) ON DELETE SET NULL,
     source              text NOT NULL,           -- branding_logo|branding_hero|news|media_image|media_video|poster_background|poster_render|export|eager_transform|other
     resource_type       text NOT NULL,           -- image|video|raw
     folder              text NOT NULL,
     format              text,
     bytes               bigint,
     cloudinary_url      text NOT NULL,
     parent_public_id    text,
     created_at          timestamptz NOT NULL DEFAULT now(),
     last_seen_at        timestamptz NOT NULL DEFAULT now(),
     deleted_at          timestamptz
   );
   CREATE INDEX cloudinary_asset_festival_id_idx ON cloudinary_asset(festival_id);
   CREATE INDEX cloudinary_asset_folder_idx ON cloudinary_asset(folder);
   CREATE INDEX cloudinary_asset_live_idx ON cloudinary_asset(festival_id) WHERE deleted_at IS NULL;
   CREATE INDEX cloudinary_asset_parent_idx ON cloudinary_asset(parent_public_id);
   ```
2. Migration `00XX+1_drop_storage_used_mb.sql`: `ALTER TABLE festival DROP COLUMN "storageUsedMb";`.
3. Update Drizzle schema; regenerate migrations.

## Tests

- Migration applies cleanly on staging seed.

---

# §2 — Helpers, Hooks, Backfill (PR 2)

## Plan

1. Extend `src/core/integrations/cloudinary.ts`:
   - `recordCloudinaryUpload({ publicId, festivalId, source, resourceType, format, url, bytes, parentPublicId? })` — upsert.
   - `markCloudinaryDeleted(publicId)` — sets `deleted_at`.
   - `listCloudinaryFolder(prefix)` — paginated Admin API.
   - `fetchAssetMeta(publicId)` — single `/resources/.../upload?public_ids=…`.
   - `buildDeliveryUrl(asset, { preview })` — for `{preview:true}` append `w_400,h_400,c_fill,q_auto,f_auto` (+ `so_2` for video, `pg_1` for PDFs).
   - Existing `deleteFile` keeps current byte-based quota refund; additionally calls `markCloudinaryDeleted`.
2. Wire record hooks (all in the same tx as `festival.storageUsedBytes` updates):
   - `src/app/api/v1/upload/route.ts:148` → source by `parsed.data.folder`. `resource_type=image`.
   - `src/app/api/v1/exports/sign-upload/route.ts:83` → source=`export`, `resource_type=raw`.
   - `src/inngest/functions/poster-render.ts:101` → source=`poster_render`, `resource_type=image`.
   - `src/inngest/functions/cloudinary-transform.ts:63` → source=`eager_transform`, one row per eager with `parent_public_id`.
3. `src/app/api/v1/upload/route.ts` DELETE → call `markCloudinaryDeleted` after `deleteFile`.
4. `scripts/backfill-cloudinary-assets.ts` (idempotent upsert):
   - Scans: `festival.branding.logo`, `festival_news.imageUrl`, `festival_media_image.url`, `festival_media_video.url`, `festival_poster_template.backgroundUrl`, image refs inside `festival_poster_template.konvaJson`, `festival_export.cloudinary_public_id`.
   - Uses existing `extractPublicIdFromUrl` (`src/core/integrations/cloudinary.ts:281`).
   - Read-only verification step first (print counts only).
5. Update consumers of `festival.storageUsedMb` (`UsageLimitsCard`, `LimitationCard`, `app/dashboard/[slug]/layout.tsx`, `usage-counter.service.ts`) to read `storageUsedBytes`.

## Tests

- Each hook inserts/updates `cloudinary_asset` and adjusts `storageUsedBytes` in tx.
- Backfill is idempotent (re-run yields 0 inserts).
- Drop `storageUsedMb` doesn't break any other column reads.

---

# §3 — Festival Junk Files Gallery (PR 3)

## Plan

1. Page `src/app/dashboard/[slug]/junk-files/page.tsx` (server component) loads festival context + calls API.
2. API `src/app/api/v1/festivals/[festivalId]/cloudinary/unused/route.ts` — returns rows where:
   - `cloudinary_asset.festival_id = ?` and `deleted_at IS NULL`, and
   - `cloudinary_asset.public_id` ∉ {live URL columns for this festival}, and
   - Falls back to `cloudinary_audit_run.unused_public_ids` once a run exists for the festival's folders.
3. Bulk-delete API `src/app/api/v1/cloudinary/delete-bulk/route.ts` — loops `deleteFile` + `markCloudinaryDeleted`, updates `storageUsedBytes` in tx; writes `audit_log` entry.
4. Sidebar wiring (`src/config/sidebar.config.ts`): add `Storage` group with `Junk Files` (admin/owner/super-admin), `lucide-react` `Trash2` icon.
5. Components:
   - `src/app/dashboard/[slug]/junk-files/_components/JunkFilesClient.tsx` — slim top bar (used/reclaim totals, audit timestamp, search, type segmented `All/Images/Videos/Files`, sort dropdown defaulting to `newest`), responsive grid `grid-cols-2 sm:3 md:4 lg:5 xl:6`, IntersectionObserver-driven infinite scroll at 24/page.
   - `JunkFileCard.tsx` — square preview (`next/image` with on-the-fly transform, `<video>` for videos, `PdfPreviewViewer`-style thumb for PDFs via existing `pdfjs` helper, generic tinted icon tile otherwise), checkbox overlay top-right, bottom strip with filename + `format`, bytes + age, hover-revealed Copy URL + Delete. Selected: `ring-2 ring-primary`. Long-press / right-click → context menu (Copy URL, Delete, Open in new tab).
   - `JunkFilesFooter.tsx` — sticky bottom action bar visible when ≥1 selected (`Delete N files (Z MB) · Cancel`).
   - `JunkFilePreview.tsx` — resource-type-aware renderer (image / video / pdf / other raw).
6. Empty states:
   - 0 unused → "🎉 Nothing to clean up. Last checked Xh ago. Refresh audit."
   - Audit never run → "We haven't reconciled against Cloudinary yet. Showing files the database no longer references."
   - Filtered to 0 → "No files match your filters."
7. Accessibility: cards focusable `role=button`, Enter toggles selection, Shift+Enter opens menu, icon buttons `aria-label`, selection bar `aria-live=polite`.

## Tests

- Card renders each `resource_type` correctly with mock data.
- Selection state machine: `Select all` toggles all visible, footer counts match.
- DB-only diff: orphan row appears, used row doesn't.
- Bulk-delete: marks `deleted_at`, decrements `storageUsedBytes`, audit-log entry written.

---

# §4 — Nightly Audit + Super-Admin (PR 4)

## Plan

1. Migration `00XX_cloudinary_audit_run.sql`:
   ```sql
   CREATE TABLE cloudinary_audit_run (
     id                  text PRIMARY KEY,
     run_at              timestamptz NOT NULL DEFAULT now(),
     folder              text NOT NULL,
     cloudinary_bytes    bigint,
     tracked_bytes       bigint,
     unused_count        int,
     unused_bytes        bigint,
     missing_count       int,
     unused_public_ids   jsonb,
     missing_public_ids  jsonb
   );
   ```
2. `src/inngest/functions/cloudinary-audit.ts` — cron `0 3 * * *`, concurrency 1, retry 3, auth failure non-retriable:
   - For each folder prefix (`greenroom/festivals/`, `greenroom/posters/`, `greenroom/exports/`):
     - Paginated Admin API: `GET /v1_1/{cloud}/resources/image/upload?prefix=<folder>&max_results=500&next_cursor=…`.
     - Exclude `…/backup/` and assets <24h old.
     - Diff vs `cloudinary_asset` (`deleted_at IS NULL`); compute unused, missing.
     - Update `bytes` + `last_seen_at` on match.
     - Upsert `cloudinary_audit_run` row.
3. Super-admin:
   - Sidebar: add `{ title: "Junk Files", url: "/super-admin/cloudinary", icon: Trash2 }` to `SUPER_ADMIN_SIDEBAR_ITEMS`.
   - Page `src/app/super-admin/cloudinary/page.tsx` reuses `JunkFileCard`; adds festival-name overlay per tile and festival filter dropdown above the grid; platform totals card on top.
   - API `src/app/api/v1/super-admin/cloudinary/unused/route.ts` — paginated, filter by festival/source/resource_type/age.
   - Audit history page `src/app/super-admin/cloudinary/runs/page.tsx` lists `cloudinary_audit_run`.

## Tests

- Audit cron with mocked Admin API produces correct diff for each folder.
- Super-admin API filters correctly and aggregates totals.

---

# §5 — Out of Scope (v1)

- Auto-delete (any policy).
- Re-link orphaned asset to another row.
- Eager preview thumbnails (we use transforms instead).
- Usage-by-source charts / trend lines.
- Drift alert email / system notification.
- Hard delete of `cloudinary_asset` rows (kept for audit history).

---

# §6 — PR Order

1. **PR 1**: §1 — `cloudinary_asset` + `cloudinary_audit_run` schemas; drop `storageUsedMb`.
2. **PR 2**: §2 — helpers, hooks, backfill, `storageUsedBytes` rewiring, consumer updates.
3. **PR 3**: §3 — festival Junk Files gallery + bulk delete (works day-one on DB-only diff).
4. **PR 4**: §4 — nightly audit + super-admin Junk Files + audit history page.
