# Centralised Date/Time Handling — Call-site Migration + User/Festival Timezone

## Status

- **Created**: 2026-07-31
- **Status**: In Progress
- **Priority**: High
- **Complexity**: High
- **Target**: Production

## Implementation status (2026-07-31)

| Phase | Title | Status |
|---|---|---|
| 1 | `core/datetime` module + tests | **Merged-ready** (PR #1) |
| 2 | Schema: `timestamptz` migration + `user.timezone` + `festival.timezone` | **Merged-ready** (PR #2) — migration applied to dev DB; 109 columns converted; existing rows backfilled with `UTC` |
| 3 | Server actions / services / repositories call-site replacement | **Done** (this PR) |
| 4 | Server API route handlers call-site replacement | **Done** (this PR) |
| 5 | Onboarding: auto-detect TZ + inline `<TimezoneSelect>` | **Done** (this PR) |
| 6 | Profile settings: timezone edit field | **Done** (this PR) |
| 7 | Wire `user.timezone` / `festival.timezone` into client display helpers | **Done (foundation)** — `UserTimezoneProvider` + `getCurrentUserTimezone()` server helper; per-component `tz` plumbing is the Phase 8 follow-up. Critical bug fixes (DOB login, judgement day key, festival-schedule-day expansion) are in. |
| 8 | Festival public site + dashboard: render in `festival.timezone` | **TODO** — per-component `tz` plumbing across the 32 legacy `parseStoredInstant` callers |
| 9 | PDFs / exports: render in `festival.timezone` | **Done** (this PR) — `buildSectionedPdf`, call-list/results generators, QR PDF, manual book all render in `festival.timezone` |
| 10 | Biome guardrails (forbid raw `new Date()` outside `core/datetime/`) | **Done (shim)** — `core/utils/date-time.ts` is now a deprecated shim pointing at `@/core/datetime`; guardrail rule intentionally deferred to Phase 8 codemod to avoid blocking 32 existing imports |

---

## Summary

Replace every ad-hoc date/time call site with the centralised `src/core/datetime/` module. Eliminate five competing conventions that produce "wrong date/time" symptoms (off-by-one day on festival start dates, broken DOB login, server-side "today" leaking, server-side PDF timestamps in Node's TZ, etc.) and wire user/festival timezone selection so all display respects the user's chosen IANA zone.

---

## Background — Why this is needed

Investigation found **five competing conventions** living side-by-side:

| Convention | Where | Problem |
|---|---|---|
| `timestamp(3)` (no TZ) + `sql\`CURRENT_TIMESTAMP\`` | Every Drizzle schema | DB clock ≠ Node clock → drift |
| `new Date().toISOString()` (UTC) | All `.actions.ts`, `.service.ts`, `.repository.ts` | Stored as `Z`-suffixed string but column had no TZ |
| Raw `new Date(storedString)` (local fallback) | Many client components | A non-`Z` string is parsed as **local**, not UTC |
| Browser-local wall-clock components (`.getFullYear/getMonth/getDate`) | DOB forms (`AddParticipantDialog`, `ParticipantDialog`, `BulkUploadParticipantsModal`) | DOB stored as `YYYY-MM-DD` local components; mismatched against `.toISOString()` on login |
| Server-side `toLocaleDateString()` | `pdf-doc.ts`, `qr-pdf-utils.ts`, `manual-book.service.ts`, `call-list.generator.ts`, `results.generator.ts` | PDF timestamps are in Node's TZ, not user's |

### Concrete bug evidence (before this work)

- **DOB login fails near midnight** — `ParticipantLoginClient.tsx:53` sends `dateOfBirth.toISOString()` (full UTC), but `participant-login.service.ts:75-80` compares both sides via `.toISOString().split("T")[0]`. Stored DOB is local-components `2008-05-12`; login payload is `2008-05-11T18:30:00.000Z` → split → `2006-05-11` → mismatch.
- **Festival dates off by one day** — `FestivalDetailsDialog.tsx:125-126`, `FestivalSetupForm.tsx:167,171`, `DeadlinesDialog.tsx:77,80`. `DateRangePicker` returns local-midnight `Date`; client calls `.toISOString()` → shifts to previous day in UTC for any TZ east of UTC.
- **Deadlines compare by string** — `festival-access.service.ts:17`, `festival-expiration.service.ts:115`, `festival-lifecycle.service.ts:27` do `festival.expiresAt < new Date().toISOString()`. Only correct if every stored value ends with `Z`.
- **Server "today"** — `judgement.actions.ts:951` calls `format(new Date(), "yyyy-MM-dd")` on the server, then filters by festival's local day — wrong for users in another TZ.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Storage | `timestamptz(3)` for every timestamp column (Postgres `timestamp with time zone`) |
| 2 | Clock source | Postgres `CURRENT_TIMESTAMP` (single clock) |
| 3 | Module location | `src/core/datetime/` |
| 4 | Date library | `date-fns` + `date-fns-tz` |
| 5 | Server-render TZ | Festival's TZ (PDFs/exports) |
| 6 | Onboarding UX | Inline `<TimezoneSelect>` in onboarding form, auto-detected default |
| 7 | Festival TZ fallback | `"UTC"` for old rows |
| 8 | TZ dropdown data | Curated ~80-entry IANA list |
| 9 | TZ dropdown UI | `cmdk` combobox (already in deps) |
| 10 | Execution | Strict order — one PR per phase |

---

## Public API (already shipped in PR #1)

```ts
import {
  parseInstant, parseInstantOrThrow, toDateOrNull,
  formatDate, formatTime, formatDateTime, formatRelative,
  wallClockToInstant, instantToWallClockParts,
  dateKeyLocal, dateKeyUTC, zonedDayKey,
  isBefore, isAfter, isExpired, msUntil, isSameDayLocal,
  getBrowserTimezone, isValidTimezone, supportedTimezones,
  TZ_OPTIONS, groupedTimezones, labelForTimezone,
  zodIsoInstant, zodCalendarDate, zodTimezone, zodTimezoneLoose,
  DEFAULT_TZ, FALLBACK_DISPLAY, currentTimestampSql, MS,
  tzTimestamp, tzTimestampNamed, tzTimestampConfig,
} from "@/core/datetime";

// server-only:
import { serverNow, serverNowMs, serverNowIso, fromNow, resolveDisplayTimezone } from "@/core/datetime/server";
```

---

## Remaining Phases — Detailed

### Phase 3 — Server `.actions.ts` / `.service.ts` / `.repository.ts` replacements

**Files**: ~50 server files. Mechanical replacements:

| Before | After |
|---|---|
| `updatedAt: new Date().toISOString()` | drop field (DB default fires) — or — `updatedAt: serverNowIso()` for explicit |
| `expiresAt: new Date(Date.now() + ms).toISOString()` | `expiresAt: fromNow(ms)` |
| `Date.now()` (for timeouts/expiry) | `serverNowMs()` |
| `new Date().toISOString()` standalone | `nowIso()` (server module) |
| `festival.expiresAt && festival.expiresAt < new Date().toISOString()` | `isExpired(festival.expiresAt)` |
| `sql\`CURRENT_TIMESTAMP\`` (rare) | `currentTimestampSql()` |

Files to touch (highest-impact):
- `src/core/auth/{session,magic-link,participant-session,stage-portal-session,assert-festival-access}.ts`
- `src/core/http/rate-limit.ts`
- `src/features/*/actions/*.actions.ts` (~30 files)
- `src/features/*/services/*.service.ts` (~25 files)
- `src/features/*/repositories/*.repository.ts` (~15 files)

### Phase 4 — Server API route handlers replacements

**Files**: ~30 API route files in `src/app/api/`. Same mechanical replacements as Phase 3.

### Phase 5 — Onboarding: auto-detect TZ + inline `<TimezoneSelect>`

**New files**:
- `src/components/onboarding/TimezoneSelect.tsx` — `<cmdk>` combobox, pre-fills with `getBrowserTimezone()` on mount, shows "Auto-detected: Asia/Kolkata (UTC+05:30)" hint.
- `src/lib/timezones.ts` — re-export from datetime module + curated IANA helper.

**Modified files**:
- `src/components/onboarding/PersonalOnboardingForm.tsx` — add `timezone` field; default to `getBrowserTimezone()`.
- `src/components/onboarding/InstitutionalOnboardingForm.tsx` — same.
- `src/features/auth/repositories/user.repository.ts` — accept `timezone` on insert/update.
- `src/features/auth/actions/profile.actions.ts` — store `timezone` on user row.

**Validation**: server action uses `zodTimezoneLoose` to validate IANA name on insert.

### Phase 6 — Profile settings: timezone edit field

**New files**:
- `src/components/profile/TimezoneField.tsx` — `<TimezoneSelect>` variant for settings page.

**Modified files**:
- `src/api/contracts/profile.ts:9` — add `timezone: zodTimezoneLoose.optional()` to `updateProfileInput`.
- `src/features/auth/actions/profile.actions.ts:updateProfile` — persist `timezone` when present.
- `src/app/(overview)/profile/page.tsx` — add the field.

### Phase 7 — Wire user/festival TZ into all client display helpers

1. Add `getCurrentUserTimezone()` server helper (`core/datetime/server.ts` — reads from session).
2. Add `useUserTimezone()` client hook — reads from `<UserTimezoneProvider>` at root.
3. Pass `user.timezone` via context to client components.
4. Replace every `formatDateTime(iso)` (no tz) with `formatDateTime(iso, { tz: user.timezone || festival.timezone })`.
5. Replace every `format(iso, "PPP")` (date-fns) with `formatDate(iso, { tz })`.
6. Replace every `formatDistanceToNow(iso)` with `formatRelative(iso)`.

**Critical bug-fixes inside this phase**:
- `FestivalSetupForm.tsx:167,171` → `wallClockToInstant(...)`
- `FestivalDetailsDialog.tsx:125,126` → `wallClockToInstant(...)`
- `DeadlinesDialog.tsx:77,80` → `wallClockToInstant(...)`
- `AddParticipantDialog.tsx:206,218`, `ParticipantDialog.tsx:324,336`, `BulkUploadParticipantsModal.tsx:294,302` → use canonical `wallClockToInstant(dateStr, timeStr, festival.timezone)`
- `ParticipantLoginClient.tsx:53` → submit canonical format; server compares via `dateKeyLocal`
- `participant-login.service.ts:75-80` → compare `dateKeyUTC` of both sides
- `judgement.actions.ts:951` → receive user's date key from client instead of computing server-side
- `assignment.actions.ts:68,94,459` → `isExpired(deadline)`

### Phase 8 — Festival public site + dashboard: render in `festival.timezone`

Same pattern as Phase 7 but for festival-scoped pages (`src/app/(festivalPublic)/`, `src/app/dashboard/[slug]/`). Festival TZ loaded once per request via `resolveDisplayTimezone`.

### Phase 9 — PDFs / exports: render in `festival.timezone`

1. `src/features/exports/services/render/pdf-doc.ts:50` → `formatDate(now, { tz: festival.timezone, style: "medium" })`
2. `src/features/participants/services/qr-pdf-utils.ts:58` → same
3. `src/features/festivals/services/manual-book.service.ts:130,232` → same
4. `src/features/exports/services/generators/call-list.generator.ts:42` → same
5. `src/features/exports/services/generators/results.generator.ts:46` → same

Festival TZ loaded once at the top of each generator from the festival row.

### Phase 10 — Biome guardrails

Custom Biome rule (or pre-commit grep) forbidding raw `new Date()`, `Date.now()`, `.toISOString()`, `.toLocaleString()` outside the allow-list:
- `src/core/datetime/**`
- `src/components/ui/calendar.tsx` (legitimate UI calendar math)
- `src/lib/age.ts` (DOB math)
- `src/components/festival/posters/use-poster-editor-autosave.ts` (autosave throttling)

Run a one-time codemod (`jscodeshift`) to auto-replace safe patterns across the codebase before turning the rule on.

---

## Out of Scope

- Multi-timezone support for a single festival (festival has one TZ).
- Per-programme TZ overrides.
- Drizzle adapter changes for `timestamptz` (already supported via `withTimezone: true`).
- Historical data migration beyond the `timestamptz` cast (legacy rows are interpreted as UTC, matching prior writer convention).

---

## Verification Plan

1. **Unit tests** — every datetime helper has TZ boundary tests (DST, leap day, year boundary). All 69 existing tests pass.
2. **Integration test** — round-trip a festival created via `FestivalSetupForm` in `Asia/Kolkata`, read it back, assert `startDate` is the user-intended wall-clock day.
3. **Manual smoke** — set system clock to `23:30 IST`, create a participant, log in. DOB login should work via `dateKeyLocal` matching.
4. **PDF smoke** — generate a "Call List" PDF for a festival whose `timezone = "Asia/Kolkata"`. The "Generated on …" footer should show IST wall-clock, not UTC.

---

## Estimated Effort

| Phase | Effort |
|---|---|
| Phase 3 (server actions) | 1.5 days |
| Phase 4 (API routes) | 0.5 day |
| Phase 5 (onboarding) | 1 day |
| Phase 6 (profile) | 0.5 day |
| Phase 7 (wire TZ into client) | 2 days |
| Phase 8 (festival public + dashboard) | 1 day |
| Phase 9 (PDFs) | 0.5 day |
| Phase 10 (guardrails) | 0.5 day |
| **Total** | **~7.5 days** across **8 PRs** |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Drizzle-Kit diff engine breaks on BOM/renames | Hand-written migrations + `scripts/generate-tz-migration.ts` for any future type changes |
| Existing users have no `user.timezone` | Backfilled to `'UTC'`; banner them to set real TZ on next login |
| Festival `timezone` not set for old festivals | Default `'UTC'`; banner organizer on first dashboard visit |
| `Intl.supportedValuesOf` not in older Node | Already validated as a Node 18+ feature; project is Next 16 (Node 20+) |
| DST ambiguity (fall-back) | `fromZonedTime` resolves to the *later* offset by spec |
| Codemod missing edge cases | Phase 10 codemod is best-effort; final guardrail catches leftovers |

---

## References

- Investigation report: see chat history (PR #1 design discussion).
- `src/core/datetime/index.ts` — module barrel with usage examples.
- `drizzle/0027_convert_to_timestamptz_and_add_timezones.sql` — applied migration (109 columns + 2 new TZ columns).
- `src/lib/age.ts` — DOB math, do not touch (Phase 10 allow-list).