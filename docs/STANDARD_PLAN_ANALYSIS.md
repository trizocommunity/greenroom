# STANDARD Plan Features – Analysis & Status

**Purpose:** Summary of what’s done for STANDARD plan, what’s pending, and known issues.  
**Context:** BASIC plan implementation is largely done; this focuses on STANDARD (and where it differs from BASIC/PRO).

---

## 1. STANDARD Plan Definition (from `pricing.ts`)

STANDARD is fully defined in config:

- **Price:** ₹3,000 | **Duration:** 90 days  
- **Limits:** 500 students, 250 programmes, 25 events, 20 stages, 2 GB storage, 10 categories  
- **Features (high level):**  
  Stage Management, Schedule, Members (max 3), Student/Programme bulk upload, Excel export, QR codes, auto certificates, full landing page, gallery, news, custom URL & colors, live scoreboard, advanced settings, programme assignment deadline, 30-day read-only after expiry.

---

## 2. What’s Completed

### 2.1 Config & feature resolution

- **`TIER_CONFIG.STANDARD`** in `src/config/pricing.ts` – complete (limits + all feature flags).
- **Plan feature matrix** – `plan-features.config.ts` + `plan-features.service.ts`: effective matrix = config + Super Admin overrides; `getEffectiveFeatureEnabled(tier, feature)` used for server checks.
- **Dashboard layout** – passes `getEffectiveTierFeatures(tier)` into `FestivalProvider` as `effectiveFeatures`; client `useFeature()` uses context first, then config, so Super Admin overrides apply in UI.

### 2.2 STANDARD-only (or STANDARD+) features – UI gated

| Feature | Where gated | Type |
|--------|-------------|------|
| **Student bulk upload** | `StudentsClient.tsx` | `FeatureGate` (studentBulkUpload) |
| **Programme bulk upload** | `ProgrammesClient.tsx` | `FeatureGate` (programmeBulkUpload) |
| **Excel export** | `StudentsClient.tsx` | `FeatureGate` (excelExport) |
| **QR codes** | Sidebar + `/pre-works/qr-codes` page | Sidebar + server `getEffectiveFeatureEnabled(..., "qrCodes")` |
| **Stage management** | Sidebar + `/pre-works/stage-management` page | Same pattern |
| **Schedule** | Sidebar + `/pre-works/sessions` + schedule page | Same pattern |
| **Gallery** | Sidebar + `/content/gallery` page + `gallery.actions.ts` | Page + actions use `getEffectiveFeatureEnabled(..., "gallery")` |
| **News** | Sidebar + `/content/news` page + `news.actions.ts` | Same |
| **Live scoreboard / leaderboard** | `event-works/leaderboard` page | `getEffectiveFeatureEnabled(..., "liveScoreboard")` |
| **Student profile (dashboard)** | `StudentsClient` links + `/pre-works/students/[studentSlug]` page | `useFeature("viewStudentProfile")` + server `FeatureService.isFeatureEnabled(..., "viewStudentProfile")` → notFound() |
| **Public student profile** | `/[slug]/[studentSlug]` page | `FeatureService.isFeatureEnabled(..., "publicStudentProfile")` |

### 2.3 Server-side enforcement (STANDARD+)

- **Excel export:** `student.actions.ts` → `exportStudentsToExcelAction` checks `FeatureService.isFeatureEnabled(tier, "excelExport")`.
- **Gallery / News / Schedule / QR / Stage / Leaderboard:** Relevant pages and actions use `getEffectiveFeatureEnabled(festival.tier, feature)` (respects overrides).
- **Team members:** `team.actions.ts` and `member.service.ts` use `ensureFestivalWritable` and enforce `maxTeamMembers` (e.g. 3 for STANDARD).

### 2.4 Limits (STANDARD)

- **Students:** `student.service.ts` + `student.actions.ts` enforce `TIER_CONFIG[tier].limits.students` (500 for STANDARD).
- **Programmes / events / stages / categories:** `usage-counter.service.ts` and tier limits passed to dashboard; category limit in `category.service.ts`.
- **Members:** `maxTeamMembers` enforced in team/member actions (3 for STANDARD).

### 2.5 Post-expiry (STANDARD: 30-day read-only)

- **Context:** `festival-context.service.ts` computes `readOnlyExpired` (expired + within `dataRetentionDays`, `postExpiryAccess === "readonly"`).
- **Layout:** Expired and not read-only → redirect to profile; otherwise dashboard allowed with `readOnlyExpired` set.
- **Banner:** `ReadOnlyExpiredBanner` when `readOnlyExpired` is true.
- **Mutations:** `ensureFestivalWritable(festivalId)` throws in read-only window; used in team and member flows (not yet in every mutation – see problems).

---

## 3. Pending / To Do

### 3.1 Post-expiry cleanup (critical for STANDARD)

- **Current behavior:** `FestivalLifecycleService.cleanupExpiredFestivals()` **deletes every festival** with `expiresAt < now` (hard delete).
- **Intended behavior (from BASIC plan doc):**
  - **BASIC:** Delete festival (and data) on expiry.
  - **STANDARD/PRO:** Do **not** delete on expiry; only mark as EXPIRED and rely on `readOnlyExpired` + retention window; delete (if at all) only after retention window.
- **Gap:** STANDARD’s “30-day read-only after expiry” is ineffective because the cron deletes the festival immediately. Cleanup must be tier-aware: delete only BASIC (or only when retention has passed for STANDARD/PRO).

### 3.2 Broader use of `ensureFestivalWritable`

- **Current:** Used in `team.actions.ts` and `member.service.ts` only.
- **Pending:** Call `ensureFestivalWritable(festivalId)` (or equivalent) in all mutation actions (students, programmes, results, schedule, gallery, news, events, etc.) so that in the STANDARD read-only window no creates/updates/deletes are allowed.

### 3.3 STANDARD-specific checklist (optional doc)

- No single “STANDARD implementation checklist” doc (like BASIC_PLAN_IMPLEMENTATION.md). Adding a short checklist could help QA and onboarding.

---

## 4. Problems / Inconsistencies

### 4.1 Two sources of truth for “feature enabled”

- **A)** `FeatureService.isFeatureEnabled(tier, feature)` in `lib/features.ts` – reads only from `TIER_CONFIG` (no Super Admin overrides).
- **B)** `getEffectiveFeatureEnabled(tier, feature)` in `plan-features.service.ts` – config + DB overrides.
- **Usage:**  
  - Student profile (dashboard + public), Excel export action use **A**.  
  - Gallery, news, schedule, QR, stage management, leaderboard use **B**.
- **Effect:** Super Admin plan-feature overrides affect gallery/news/schedule/QR/stage/leaderboard but **not** student profile or Excel export. If overrides should apply everywhere, student profile and Excel export should be switched to `getEffectiveFeatureEnabled` (or a shared helper that uses the same matrix).

### 4.2 Cleanup cron ignores tier (see 3.1)

- STANDARD (and PRO) are deleted on expiry instead of being kept for read-only; this breaks the documented STANDARD behaviour.

### 4.3 BASIC: `festivalSettings: true` in config

- In `pricing.ts`, BASIC has `festivalSettings: true`, while the BASIC plan doc says “No festival settings page”. Sidebar/route protection may still hide Settings for BASIC via feature checks; worth confirming and, if BASIC should not have settings, set `festivalSettings: false` in config.

---

## 5. Quick reference – where STANDARD is enforced

| Area | Mechanism |
|------|-----------|
| Sidebar (Stage, Schedule, QR, Settings, Members, Gallery, News) | `FestivalDashboardSidebar` + `useFeatures()` from context (effectiveFeatures) |
| Pages (QR, Stage, Schedule, Gallery, News, Leaderboard) | Server: `getEffectiveFeatureEnabled(festival.tier, feature)` then redirect/notFound |
| Actions (Excel, Gallery, News, Schedule, Events) | Server: `getEffectiveFeatureEnabled` or `FeatureService.isFeatureEnabled` |
| Student profile (dashboard + public) | `useFeature("viewStudentProfile")` + `FeatureService.isFeatureEnabled(..., "viewStudentProfile" / "publicStudentProfile")` |
| Limits (students, programmes, members, etc.) | `TIER_CONFIG[tier].limits` / `getFeatureValue("maxTeamMembers")` in services/actions |
| Post-expiry read-only | `readOnlyExpired` in context; `ensureFestivalWritable` in team/member flows only |

---

## 6. Recommended next steps (priority)

1. **Fix cleanup cron** – Make `FestivalLifecycleService.cleanupExpiredFestivals()` tier-aware: delete only when tier is BASIC or when retention window has passed for STANDARD/PRO (and optionally mark as EXPIRED for STANDARD/PRO at expiry).
2. **Extend read-only enforcement** – Use `ensureFestivalWritable` (or a single wrapper used by all mutation actions) in student, programme, result, schedule, gallery, news, and event actions so STANDARD 30-day read-only is enforced everywhere.
3. **Unify feature checks** – Decide whether Super Admin overrides should apply to Excel export and student profile; if yes, switch those to `getEffectiveFeatureEnabled` (or a shared helper using the same matrix).
4. **Align BASIC config** – Set `festivalSettings: false` for BASIC if the product intent is “no settings page” for BASIC.

After (1) and (2), STANDARD plan behaviour (including 30-day read-only) will be consistent and reliable.
