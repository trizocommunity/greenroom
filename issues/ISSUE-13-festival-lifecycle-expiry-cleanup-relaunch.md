# Festival Lifecycle — Expiry Cleanup, Relaunch, and T-7 Notifications

## Status
- **Created**: 2026-07-31
- **Status**: Draft
- **Priority**: High
- **Complexity**: High
- **Vertical slice type**: HITL (storage model + relaunch UX are user-facing decisions)
- **Blocked by**: None — can start immediately
- **Blocks**: Any future retention/pruning work; any STANDARD/PRO read-only-window feature

---

## Summary

Finalize the festival lifecycle so it matches the product decision: **all tiers live 90 days, no read-only window, hard-expiry on day 90**, with the following refinements over the current implementation:

1. **Expiry transaction keeps operational data** (`programme`, `participant`, `result`, `group`, `category`, `stage`, `scheduleEntry`, `programmeAssignment`, `festivalMember`, `festivalNews`, `festivalMediaImage`) so the owner can always download the **Manual Book** PDF, generated on demand from these live tables — no stored file, no snapshot blob, no S3. This mirrors the `festival_export.fileBytes` retention model (rows + bytes expire; bytes are regenerated, not snapshot-frozen).
2. **Expiry transaction strips festival descriptive data** (`description`, `orgName`, `orgDescription`, `orgWebsite`, `orgLocation`, `establishedYear`, `founderName`, `founderMessage`, `branding`, `rules`, `structure`, `institutionName`, `institutionType`, `location`, `startDate`, `endDate`, `programmeAssignmentDeadline`, `participantCreationDeadline`, `chestNumberSettings`, `teamStandings`, `publicSiteEnabled`, `resultPdfUrl`, `institutionId`, `category`, `festivalType`, `scoringSystem`, `publicDisplayMode`, `announcerResultsPerStandings`, `announcedProgrammesSinceStandings`, `maxResultScore`, `judgesCount`, `programmesCount`, `stagesCount`, `participantsCount`, `storageUsedMb`, `teamLeaderLimit`).
3. **Expiry transaction cleans orphan tables** (`festivalScoringPolicy`, `festivalScoringAwardRule`, `judge`, `judgementConfig`, `judgementConfigJudge`, `programmeReportingSession`, `programmeReportedParticipant`, `programmeCodeLetter`, `programmeCodeLetterRecipient`, `programmeTeamLead`, `stagePortalCredential`, `stagePortalSession`, `pendingInvitation`, `programmeNotification`, `festivalPosterTemplate`, `stageManagerAssignment`, `judgeStageAssignment`) so the EXPIRED festival row is the only row left under its `id`.
4. **Festival row stays** with `status="EXPIRED"`, `expiredAt=now`, `archivedAt=now`, and the minimum anchor fields (`id`, `ownerId`, `slug`, `name`, `tier`, `tierLabel`, `expiresAt`, `expiredAt`, `archivedAt`, `createdAt`, `updatedAt`). This row is the anchor for the Manual Book download and the **Relaunch** entry point.
5. **Relaunch** is a new flow: owner visits an expired festival's detail page, picks a tier, pays for a new `FESTIVAL_CREATION` credit, goes through the existing `festival-setup` onboarding, and lands back in a fresh dashboard. The expired festival row stays as history (visible in the profile festival tab).
6. **T-7 email + in-app banner**: 7 days before `expiresAt`, the daily cron emails the owner and shows an in-app banner in the dashboard with the message: *"Your festival expires in X days. After that, only the Manual Book PDF and Relaunch will be available."*
7. **Dead code** at `src/features/festivals/services/festival-lifecycle.service.ts` (the orphan service that hard-deletes the festival row) is **deleted**.
8. **UI magic numbers** (`FestivalCard.tsx`, `FestivalDetailsDialog.tsx`, `festival-public.loader.ts`, `OverviewTab.tsx`) are routed through `getFestivalDurationDays()` so there's a single source of truth — currently always 90, but future-proof for tier-aware duration.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Duration policy | All tiers = 90 days (no tier split) |
| 2 | Post-expiry model | Delete festival descriptive data + clean orphans. Keep operational data on the festival row. PDF regenerated on demand. |
| 3 | Festival row on expiry | Row stays (`status="EXPIRED"`, `expiredAt`, `archivedAt`) — anchor for Manual Book + Relaunch |
| 4 | Manual Book generation | On-demand from live kept tables. **No `expired_festival_manual_book` / `expired_festival_result` snapshot tables.** |
| 5 | Orphan table cleanup | Yes — `expireFestival` transaction deletes every `festivalId`-keyed table not in the "keep" list |
| 6 | Storage | No file storage. PDF is streamed from the route handler just like `festival_export.download` |
| 7 | Retention on kept tables | None — rows live forever as historical record for the owned festival. Manual Book read-only access path is via the expired detail page only. |
| 8 | Public festival page after expiry | Continues to render `ExpiredFestivalView` (already implemented) — generates PDF from kept tables on demand |
| 9 | Relaunch | New festival row, new payment, new `festival-setup`. Expired row stays as history. |
| 10 | Relaunch payment | Owner buys a new `FESTIVAL_CREATION` credit (same flow as first-time creation) |
| 11 | Relaunch cooldown | None — owner can relaunch unlimited times |
| 12 | T-7 notification channel | Email + in-app banner |
| 13 | T-7 notification idempotency | New `festival_lifecycle_event` row with `event="EXPIRATION_WARNING"` — checked before sending to avoid duplicates |
| 14 | Dead code | Delete `FestivalLifecycleService` file |
| 15 | Magic numbers | All routed through `getFestivalDurationDays()` helper |
| 16 | Schema changes | Single column added: `festival.archivedAt` (nullable timestamp). No other column changes. |
| 17 | Migration | Track A + Track B pattern (one in `src/core/database/schema.ts` for `db:push`, one hand-authored `drizzle/00XX_*.sql`) |
| 18 | Locked festival (`isLocked=true`) | Untouched — admin freeze remains a separate concern |

---

## Problem Statement

1. **Expiry deletes data the owner needs.** The current `FestivalExpirationService.expireFestival()` hard-deletes `result`, `programme`, `participant`, `category`, `group`, `stage`, `scheduleEntry`, `programmeAssignment`, `festivalNews`, `festivalMediaImage`, and `festivalMember`, then snapshots them into two new tables (`expired_festival_manual_book`, `expired_festival_result`). The snapshot tables are the source of truth for the Manual Book PDF — but they're stored as JSON/blob/PDF, which is a different shape from the live data and harder to query or update later.
2. **Orphan rows accumulate.** ~15 `festivalId`-keyed tables are not cleaned (judges, scoring policies, code letters, poster templates, etc.) and the festival row is never deleted, so those rows linger forever as inert references.
3. **No way to start a new festival after one expires.** Owners whose only festival has expired currently must navigate the payment + setup flow from scratch with no in-context entry point.
4. **No advance warning.** Owners only discover the expiry when their dashboard redirects them.
5. **Stale dead code.** `FestivalLifecycleService` is orphaned and imports a "40-day" comment that contradicts the actual 90-day config; future contributors may import it by accident.
6. **Magic-number UI.** Four files have hardcoded `30`/`40`/`180` day constants that drift from the actual 90-day policy.

---

## Out of Scope

- STANDARD / PRO read-only window after expiry (still ruled out per PRD §8.2).
- Tier-aware duration (BASIC ≠ STANDARD ≠ PRO). All 90 days.
- True background-job runner for Manual Book generation (PDF regen is sub-second, no need).
- Exporting the Manual Book to external storage (S3 / Cloudinary / Vercel Blob).
- Audit log of who/when downloaded the Manual Book (deferred).
- Email-provider changes — reuses whatever transactional email helper exists in `src/features/notifications/`.
- Cross-festival relaunch (each owner gets one festival per `ownerId` — current invariant; relaunch just creates a new row after the unique check is satisfied).
- Changing `participant.isTeamLeader` and the team-leader portal (they read from `participant` and `programme`, both kept).

---

## Solution

### 1. Schema change — `festival.archivedAt`

**Track A** — add to `src/core/database/schema.ts` in the `festival` table (around line 359, after `expiredAt`):
```ts
archivedAt: timestamp({ precision: 3, mode: "string" }),
```
Indexed via the existing `festival_expiresAt_idx` family — add `festival_archivedAt_idx` (btree asc, nulls last) for the "archived festivals" admin view.

**Track B** — author `drizzle/00XX_festival_archived_at.sql`:
```sql
ALTER TABLE "festival" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "festival_archivedAt_idx" ON "festival" USING btree ("archivedAt" ASC NULLS LAST);
```

No other schema changes. `expired_festival_manual_book` and `expired_festival_result` tables are **dropped** (migration = drop tables + indices). `festival_lifecycle_event` gets a new enum value `EXPIRATION_WARNING`.

### 2. Centralized duration helper — `src/config/pricing.ts`

Add a single export:
```ts
export const getFestivalDurationDays = (): number =>
  TIER_CONFIG.BASIC.festivalDurationDays; // 90 today; centralizes future tier-aware policy
```

### 3. Rewrite `FestivalExpirationService.expireFestival`

File: `src/features/festivals/services/festival-expiration.service.ts:126-246`

Single transaction:

```ts
export async function expireFestival(festivalId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const festival = await tx.query.festival.findFirst({ where: eq(festival.id, festivalId) });
    if (!festival) throw new AppError("FESTIVAL_NOT_FOUND");
    if (festival.status === "EXPIRED") return; // idempotent

    // 1. Strip descriptive data — set listed columns to NULL/empty
    await tx.update(festival).set({
      description: null,
      orgName: null,
      orgDescription: null,
      orgWebsite: null,
      orgLocation: null,
      establishedYear: null,
      founderName: null,
      founderMessage: null,
      branding: null,
      rules: null,
      structure: null,
      institutionName: null,
      institutionType: null,
      location: null,
      startDate: null,
      endDate: null,
      programmeAssignmentDeadline: null,
      participantCreationDeadline: null,
      chestNumberSettings: null,
      teamStandings: null,
      publicSiteEnabled: false,
      resultPdfUrl: null,
      institutionId: null,
      scoringSystem: null,
      publicDisplayMode: "programme_results",
      announcerResultsPerStandings: 10,
      announcedProgrammesSinceStandings: 0,
      maxResultScore: null,
      judgesCount: 0,
      programmesCount: 0,
      stagesCount: 0,
      participantsCount: 0,
      storageUsedMb: 0,
      teamLeaderLimit: 2,
      status: "EXPIRED",
      expiredAt: new Date().toISOString(),
      archivedAt: new Date().toISOString(),
    }).where(eq(festival.id, festivalId));

    // 2. Clean orphans (15 tables — explicit deletes, FK cascades won't fire because
    //    programme/participant/etc. are KEPT, but these have no parent row that survives)
    await tx.delete(festivalScoringPolicy).where(eq(festivalScoringPolicy.festivalId, festivalId));
    await tx.delete(festivalScoringAwardRule).where(eq(festivalScoringAwardRule.festivalId, festivalId));
    await tx.delete(judge).where(eq(judge.festivalId, festivalId));
    await tx.delete(judgementConfig).where(eq(judgementConfig.festivalId, festivalId));
    // judgementConfigJudge cascades via judgementConfig
    await tx.delete(programmeReportingSession).where(eq(programmeReportingSession.festivalId, festivalId));
    // programmeReportedParticipant cascades via programmeReportingSession
    await tx.delete(programmeCodeLetter).where(eq(programmeCodeLetter.festivalId, festivalId));
    // programmeCodeLetterRecipient + programmeTeamLead cascade via programmeCodeLetter
    // judgementScore cascades via programmeCodeLetter
    await tx.delete(stagePortalCredential).where(eq(stagePortalCredential.festivalId, festivalId));
    await tx.delete(stagePortalSession).where(eq(stagePortalSession.festivalId, festivalId));
    await tx.delete(pendingInvitation).where(eq(pendingInvitation.festivalId, festivalId));
    await tx.delete(programmeNotification).where(eq(programmeNotification.festivalId, festivalId));
    await tx.delete(festivalPosterTemplate).where(eq(festivalPosterTemplate.festivalId, festivalId));
    await tx.delete(stageManagerAssignment).where(eq(stageManagerAssignment.festivalId, festivalId));
    await tx.delete(judgeStageAssignment).where(eq(judgeStageAssignment.festivalId, festivalId));

    // 3. KEEP — programme, participant, result, group, category, stage,
    //          scheduleEntry, programmeAssignment, festivalMember,
    //          festivalNews, festivalMediaImage (all referenced from
    //          festivalId with ON DELETE CASCADE, but we never delete
    //          the festival row itself).

    // 4. Audit
    await tx.insert(festivalLifecycleEvent).values({
      id: randomUUID(),
      festivalId,
      event: "EXPIRED",
      metadata: {
        strippedFields: [...],         // list above
        keptTables: [...],             // 11 tables
        orphanTablesCleaned: [...],    // 12 tables (+ cascaded children)
        expiresAt: festival.expiresAt,
      },
      occurredAt: new Date().toISOString(),
    });

    // 5. Audit log (super-admin table view)
    await createAuditLog({
      action: "EXPIRE_FESTIVAL",
      targetType: "FESTIVAL",
      targetId: festivalId,
      metadata: { name: festival.name, slug: festival.slug, tier: festival.tier },
    });
  });
}
```

### 4. Rewrite `ManualBookService`

File: `src/features/festivals/services/manual-book.service.ts`

```ts
// Reads from kept live tables — no snapshot.
export async function generateManualBookPdf(festivalId: string, name: string): Promise<Buffer> {
  const { festival, programmes, participants, results, groups, categories, stages, schedule } =
    await loadKeepTablesForFestival(festivalId);
  return renderManualBookPdf({ festival: minimalAnchor(festival), programmes, participants, results, groups, categories, stages, schedule });
}
```

`expired-results-pdf` and `manual-book` routes (`src/app/api/festivals/[slug]/expired-results-pdf/route.ts`, `src/app/api/profile/festivals/[festivalId]/manual-book/route.ts`) updated to call the live query path. Guards updated: they no longer need to check `payment` validity — they need `assertFestivalAccess` + `status === "EXPIRED" || status === "PAST"` to allow download of an expired festival's data.

### 5. Drop snapshot tables

Add to the same Track B migration:
```sql
DROP TABLE IF EXISTS "expired_festival_result";
DROP TABLE IF EXISTS "expired_festival_manual_book";
```

Remove `expiredFestivalManualBook` and `expiredFestivalResult` definitions from `src/core/database/schema.ts`. Remove `expiredFestivalRelations` from `src/core/database/relations.ts`.

### 6. Delete dead code

File: `src/features/festivals/services/festival-lifecycle.service.ts` → **delete entirely**.

Audit before deletion: confirm zero importers across the repo. (Verified: no importers in repo.) `grep -r "FestivalLifecycleService" src/` should return no hits after this issue.

### 7. Pre-archival cycle → T-7 email + in-app banner

`src/features/festivals/services/festival-expiration.service.ts::runPreArchivalCycle()` is extended. Currently it just inserts an `ACTIVATED` lifecycle event; keep that, then add:

```ts
async function runNotificationsCycle(): Promise<{ warned: number }> {
  const candidates = await getFestivalsApproachingExpiry(7); // already exists
  let warned = 0;
  for (const festival of candidates) {
    const already = await db.query.festivalLifecycleEvent.findFirst({
      where: and(
        eq(festivalLifecycleEvent.festivalId, festival.id),
        eq(festivalLifecycleEvent.event, "EXPIRATION_WARNING"),
      ),
    });
    if (already) continue;
    await sendExpiryWarningEmail(festival, daysUntil(festival.expiresAt));
    await setInAppBanner(festival.ownerId, festival.id, daysUntil(festival.expiresAt));
    await db.insert(festivalLifecycleEvent).values({
      id: randomUUID(),
      festivalId: festival.id,
      event: "EXPIRATION_WARNING",
      metadata: { daysRemaining: daysUntil(festival.expiresAt) },
      occurredAt: new Date().toISOString(),
    });
    warned++;
  }
  return { warned };
}
```

Enums extended: `festivalLifecycleEventType` gains `"EXPIRATION_WARNING"`.

New files:
- `src/features/notifications/services/expiry-notification.service.ts` — `sendExpiryWarningEmail(festival, daysRemaining)`. Reuses whatever email infra is at `src/features/notifications/`.
- `src/features/notifications/services/in-app-banner.service.ts` — `setInAppBanner(userId, festivalId, daysRemaining)`. Inserts a row into the existing `notification` table (or creates one if missing — check `src/core/database/schema.ts` for current shape).

### 8. In-app banner UI

Files:
- `src/components/festival/dashboard/ExpiryWarningBanner.tsx` (NEW) — dismissible banner rendered above the dashboard header.
- `src/app/dashboard/[slug]/layout.tsx:57-61` — when `daysRemaining <= 7 && daysRemaining >= 0 && status !== "EXPIRED"`, mount the banner. The layout's existing redirect path for `isExpired` remains unchanged.

### 9. Relaunch flow

#### a. Backend — `relaunchFestival` action

`src/features/festivals/actions/festival-crud.actions.ts` gets a new action:

```ts
export async function relaunchFestival(input: { paymentId: string; festivalName: string; }): Promise<ActionResponse<{ festivalId: string; slug: string }>> {
  // 1. Same payment validation as createFestival
  // 2. Tier from payment.tier
  // 3. Insert new festival row with:
  //    - new id (randomUUID)
  //    - ownerId = session.userId (same owner)
  //    - expiresAt = now + tierConfig.festivalDurationDays
  //    - status = "READY"
  //    - isLocked = false
  // 4. Mark payment as used (linked festivalId = new festival)
  // 5. Insert festivalMember row for owner
  // 6. Audit log REPLACE_FESTIVAL_LIFECYCLE
  //
  // Note: existing uniqueIndex on festival.ownerId will block the insert if the
  // user still has an active festival. Solution: relaunch is only allowed when
  // current owned festival.status === "EXPIRED", which drops the unique guard.
}
```

The unique-index check is the trickier bit. Two options:
- (A) Drop the unique index `festival_ownerId_key` and replace with a partial unique index `WHERE status != 'EXPIRED'`. Migration adds this.
- (B) Soft-fail the relaunch with a clear error when an active festival exists.

I recommend **(A)** — it makes the model honest ("each owner may have zero or one ACTIVE festival, plus any number of expired history festivals").

#### b. Frontend — `/festivals/new` tier picker + Relaunch button

- `src/app/(overview)/profile/festivals/[slug]/expired/page.tsx` — add **Relaunch** button alongside **Download PDF**. Button: `<Link href={`/festivals/new?from=${festival.slug}`}>Relaunch</Link>`.
- `src/app/festivals/new/page.tsx` (NEW) — tier grid + "Pay & Continue". Uses `TIER_CONFIG` to render cards. "Pay & Continue" creates a payment intent for `purpose: "FESTIVAL_CREATION"` and redirects to existing payment flow.
- `src/app/festival-setup/page.tsx` — accepts an optional `?from=<expiredSlug>` query param to show a contextual breadcrumb: *"Replacing <expiredName>"*.

#### c. Profile festival tab — show expired + relaunch

`src/components/profile/tabs/FestivalsTab.tsx` — the expired festival now appears with:
- Status badge: `EXPIRED`
- Buttons: **Download PDF** (greenroom-style, owner-gated route) + **Relaunch**

The currently-displayed banner in `OverviewTab.tsx:261-280` ("Your previous festival has expired") gets a **Relaunch** CTA appended.

### 10. UI magic-number cleanup

| File | Line | Current | Replacement |
|---|---|---|---|
| `src/components/profile/FestivalCard.tsx` | 30 | `const totalDays = 30;` | `const totalDays = getFestivalDurationDays();` |
| `src/components/festival/setup/FestivalDetailsDialog.tsx` | 85 | `existingEndDate + 30 * 24 * 60 * 60 * 1000` | `existingEndDate + getFestivalDurationDays() * MS_PER_DAY` |
| `src/components/festival/setup/FestivalDetailsDialog.tsx` | 87 | `dateRange.from + 180 * 24 * 60 * 60 * 1000` | `dateRange.from + getFestivalDurationDays() * 2 * MS_PER_DAY` (caps at 2x duration) |
| `src/features/festivals/loaders/festival-public.loader.ts` | 78 | `createdAt + 40 * 24 * 60 * 60 * 1000` | `createdAt + getFestivalDurationDays() * MS_PER_DAY` |
| `src/components/profile/tabs/OverviewTab.tsx` | 201 | `validFrom + 30 * 24 * 60 * 60 * 1000` | `validFrom + getFestivalDurationDays() * MS_PER_DAY` |

Add a tiny shared constant `MS_PER_DAY = 86_400_000` (used in `pricing.ts` already) and import.

---

## Phased Implementation Order

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| 1 | Duration helper + magic-number cleanup | `getFestivalDurationDays()` exported; 5 files updated; zero hardcoded day numbers left | `grep -rn '\* 24 \* 60 \* 60 \* 1000' src/` returns only the centralized helper |
| 2 | Schema additions + migration | `festival.archivedAt` added (Track A + Track B); `festival_lifecycle_event` enum gains `EXPIRATION_WARNING`; partial unique-index on `festival.ownerId` for non-EXPIRED rows | `pnpm db:reset`; `\d festival`; `\d festival_lifecycle_event` |
| 3 | Snapshot table drop | DROP `expired_festival_manual_book` + `expired_festival_result`; remove from schema + relations | Schema clean; `db:reset` succeeds |
| 4 | Rewrite `expireFestival` | Strip descriptive fields + clean 12 orphan tables in one transaction; keep 11 operational tables; status="EXPIRED", `expiredAt`/`archivedAt` set | Dry-run on a seeded festival; row state matches spec; operational rows untouched |
| 5 | Rewrite `ManualBookService` | Reads from kept live tables; no snapshot | `pnpm dev`, expire a festival, download PDF, verify content matches live tables |
| 6 | Notification cycle | `runNotificationsCycle` + email + in-app banner; idempotent via `EXPIRATION_WARNING` event | Set `festival.expiresAt` to 3 days from now, run cron manually; email log + banner + event row appear; second run is a no-op |
| 7 | In-app banner UI | `ExpiryWarningBanner.tsx` + layout integration | Banner shows at T-7; dismissible; disappears after expiry |
| 8 | Delete dead code | Remove `festival-lifecycle.service.ts`; verify zero importers | `grep` returns nothing |
| 9 | Cleanup migration for existing EXPIRED festivals | `scripts/cron/expired-festival-cleanup.ts` (NEW) — applies the new model to existing expired festivals: strip descriptive fields, clean orphans, drop `expired_festival_*` rows. Dry-run by default, `--apply` to commit | `--apply` on a copy of prod data; festival cards still render history; PDF still generates |
| 10 | Relaunch backend | `relaunchFestival` action + partial unique index | Create expired festival, then relaunch with new payment — new `id`, new `expiresAt`, EXPIRED row still listed |
| 11 | Relaunch frontend | `/festivals/new` page + Relaunch button on expired tab + breadcrumb in `festival-setup` | Manual: full relaunch flow end-to-end |

Each phase = own branch + commit. Review at each step.

---

## Files Touched

### New
- `drizzle/00XX_festival_archived_at_and_unique_partial_index.sql`
- `src/features/notifications/services/expiry-notification.service.ts`
- `src/features/notifications/services/in-app-banner.service.ts`
- `src/components/festival/dashboard/ExpiryWarningBanner.tsx`
- `src/app/festivals/new/page.tsx`
- `scripts/cron/expired-festival-cleanup.ts`

### Modified
- `src/core/database/schema.ts` — add `festival.archivedAt`; extend `festivalLifecycleEventType` enum; drop `expiredFestivalManualBook` + `expiredFestivalResult` tables
- `src/core/database/relations.ts` — drop the two expired relations
- `src/config/pricing.ts` — export `getFestivalDurationDays()` helper
- `src/features/festivals/services/festival-expiration.service.ts` — rewrite `expireFestival()`, extend `runPreArchivalCycle()` with notifications, add `getFestivalsApproachingExpiry(7 days)`
- `src/features/festivals/services/manual-book.service.ts` — read from live kept tables
- `src/features/festivals/actions/festival-crud.actions.ts` — add `relaunchFestival` action; partial unique index logic
- `src/app/api/v1/cron/route.ts` — call `runNotificationsCycle()` first
- `src/app/api/festivals/[slug]/expired-results-pdf/route.ts` — route to live kept tables
- `src/app/api/profile/festivals/[festivalId]/manual-book/route.ts` — route to live kept tables; allow EXPIRED/PAST access
- `src/app/dashboard/[slug]/layout.tsx` — mount `ExpiryWarningBanner` at T-7
- `src/app/(overview)/profile/festivals/[slug]/expired/page.tsx` — add Relaunch button
- `src/app/festival-setup/page.tsx` — accept `?from=<expiredSlug>`
- `src/components/profile/tabs/FestivalsTab.tsx` — expired card with Download + Relaunch
- `src/components/profile/tabs/OverviewTab.tsx:201,272-278` — magic-number + Relaunch CTA
- `src/components/profile/FestivalCard.tsx:30` — magic-number
- `src/components/festival/setup/FestivalDetailsDialog.tsx:85,87` — magic-number
- `src/features/festivals/loaders/festival-public.loader.ts:78` — magic-number

### Deleted
- `src/features/festivals/services/festival-lifecycle.service.ts` (dead code)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Existing EXPIRED festivals break under the new model | Phase 9 cleanup script + dry-run by default. Existing snapshot tables stay referenced until `--apply` runs. |
| Partial unique index migration fails on prod | Track B migration is idempotent; DDL uses `CREATE UNIQUE INDEX IF NOT EXISTS` |
| Stripped descriptive fields show as `null` in old UI | UI fields (`FestivalStatusCard`, `ExpiredFestivalView`) already tolerate missing data; add explicit nulls |
| `runNotificationsCycle` re-emails on every cron tick | Idempotency guard via `EXPIRATION_WARNING` lifecycle event row |
| Relaunch collision if owner has a still-active festival | Partial unique index blocks insert; UI clearly states "You must let your current festival expire before relaunching" |
| Manual Book regen is slow with many rows | Live query uses indexed `festivalId` FKs on every table; pre-warmed by the cron-noop test |
| `archivedAt` collides with `expiresAt` semantics | `expiresAt` = computed at creation; `archivedAt` = set on expiry; both queryable independently. Indexed separately. |
| `festival_lifecycle_event` row for `EXPIRATION_WARNING` grows unbounded | Ruled out per scope; same retention as `EXPIRED` events (forever) |
| Email provider missing in dev | Guard: if `MAIL_PROVIDER` env is unset, log to console and still insert lifecycle event for idempotency |
| Dropping `expired_festival_manual_book` orphans anything else | Verified no other FKs reference these tables |

---

## Manual QA Checklist

1. Create a fresh festival. Wait (or `psql` it) until `expiresAt` is in the past. Trigger `FestivalExpirationService.runExpirationCycle()` manually. Verify:
   - Festival row stripped, `status="EXPIRED"`, `expiredAt`+`archivedAt` set
   - 11 operational tables untouched (row counts preserved)
   - 12 orphan tables empty
   - One `festival_lifecycle_event` row with `event="EXPIRED"` and full `metadata`
   - One `audit_log` row with `action="EXPIRE_FESTIVAL"`
2. Visit `/profile/festivals/[slug]/expired`. **Download PDF** produces a valid PDF with all programmes/participants/results. **Relaunch** links to `/festivals/new?from=<slug>`.
3. Pick a tier on `/festivals/new`. Pay (use the test-payment path). End up on `festival-setup`. Complete onboarding. Land in dashboard with a fresh festival; the old expired one still appears in the profile festival tab.
4. Set a festival's `expiresAt` to 3 days from now. Manually call `runNotificationsCycle()`. Verify: email sent, dashboard banner appears, `festival_lifecycle_event` row with `event="EXPIRATION_WARNING"`. Second call is a no-op.
5. Confirm `pnpm db:reset` runs cleanly with the new schema (no orphaned FK, no missing relations, no Drizzle warnings).
6. Confirm `grep -rn "FestivalLifecycleService" src/` returns nothing.
7. Confirm `grep -rn '\* 24 \* 60 \* 60 \* 1000' src/` returns only the centralized helper (and any legitimate time-of-day math like `60 * 60 * 1000` for hours).
8. Run `scripts/cron/expired-festival-cleanup.ts` in dry-run against a staging DB. Inspect the would-be changes. Run with `--apply`. Re-verify Manual Book still generates for an "old expiry" festival that pre-dates the new model.
9. Public festival page (`/[slug]` layout) renders `ExpiredFestivalView` and the PDF download works on demand.
10. Tier switch test: BASIC, STANDARD, PRO all show 90 days in the profile overview / FestivalCard progress bar.

---

## References

- `src/core/database/schema.ts:305-391` — current `festival` table
- `src/core/database/schema.ts:1763-1819` — snapshot tables to drop
- `src/features/festivals/services/festival-expiration.service.ts:1-337` — current expiry service
- `src/features/festivals/services/festival-lifecycle.service.ts` — dead code to delete
- `src/features/festivals/services/manual-book.service.ts` — current snapshot-based manual book
- `src/features/festivals/services/festival-status.service.ts` — derived status
- `src/features/festivals/services/festival-lifecycle-policy.service.ts` — `assertFestivalMutationAllowed`
- `src/features/festivals/actions/festival-crud.actions.ts:30-155` — current `createFestival`
- `src/config/pricing.ts:102-406` — `TIER_CONFIG` with 90 days on all tiers
- `vercel.json:1-7` + `src/app/api/v1/cron/route.ts` — daily cron
- `src/app/dashboard/[slug]/layout.tsx:57-61` — expiry redirect
- `src/app/(festivalPublic)/[slug]/layout.tsx:28-53` — public expired view
- `src/app/(overview)/profile/festivals/[slug]/expired/page.tsx` — expired detail page
- `src/components/profile/FestivalCard.tsx`, `FestivalDetailsDialog.tsx`, `OverviewTab.tsx` — magic numbers
- `src/core/errors/errors.ts:18-27` — error messages
- `src/core/auth/assert-festival-access.ts` — access guard
- PRD §8.2 / §8.3 (`docs/PRDs/GREENROOM_PRD.md:655-661`) — design rationale for no read-only window
- Plan docs: `docs/plans/BASIC_PLAN.md:88-90`, `STANDARD_PLAN.md:34-35,127`, `PRO_PLAN.md:33-37` — tier plans describing current "delete on expiry" stance
- Pattern reference for partial unique index: none in this repo — first use; will be a small migration
- Pattern reference for email + lifecycle-event idempotency: none in this repo — first use
