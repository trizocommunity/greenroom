# BASIC Plan

**Purpose:** Entry-level festival plan. Single source of truth for spec, behavior, and how it is enforced in the codebase.

**Config source:** `src/config/pricing.ts` (`TIER_CONFIG.BASIC`). Feature resolution may include Super Admin overrides via `src/server/services/plan-features.service.ts`.

---

## 1. Spec

| Item | Value |
|------|--------|
| **Price** | ₹1,500 |
| **Duration** | 30 days (active) |
| **Target** | Small local festivals, schools, first-time organizers |

### Limits

| Resource | Limit |
|----------|--------|
| Students | 250 |
| Programmes | 100 |
| Events | 10 |
| Stages | 2 |
| Storage | 512 MB (0.5 GB) |
| Categories | 5 |

### Post-expiry

- **Behavior:** Delete all festival data after expiry (no read-only access).
- **Config:** `postExpiryAccess: "delete"`, `dataRetentionDays: 0`.
- **Runtime:** Expired festivals redirect to `/profile?error=expired`; any tier-aware cleanup cron should delete BASIC festival data on expiry.

---

## 2. Features: Included vs Excluded

### Included (BASIC)

- **Pre-Works:** Categories, Groups, Students, Programmes, Assignments.
- **Event-Works:** Chest Numbers, Results.
- **Import/Export:** Student import (CSV/Excel), PDF export only.
- **Landing:** Basic public page (festival title + results).
- **Support:** WhatsApp support (config: `supportLevel: "whatsapp"`, `supportResponseTime: 24`).
- **Branding:** Basic logo upload only (`logoUpload: true`).

### Excluded (hidden or blocked for BASIC)

- Full landing page builder, gallery, news.
- Bulk upload (students, programmes).
- Festival settings page, team members (max 1 = owner only).
- QR codes, stage management, schedule/sessions.
- Excel export, advanced analytics, live scoreboard/leaderboard.
- Certificates (auto/custom/bulk), email/SMS/bulk notifications.
- Custom URL/domain, custom colors, white-label.
- Student profile (dashboard and public profile page).
- API access, webhooks, multi-festival management.

---

## 3. How It’s Enforced in the Codebase

### 3.1 Config and feature resolution

- **Tier + limits:** `TIER_CONFIG.BASIC` in `src/config/pricing.ts` (limits and `features` object).
- **Server (config only):** `FeatureService.isFeatureEnabled(tier, feature)` in `src/lib/features.ts` reads from `TIER_CONFIG` only.
- **Server (with overrides):** `getEffectiveFeatureEnabled(tier, feature)` and `getEffectiveTierFeatures(tier)` in `src/server/services/plan-features.service.ts` merge config with Super Admin overrides stored in `SystemConfig`.
- **Dashboard context:** `src/app/dashboard/[slug]/layout.tsx` loads `getEffectiveTierFeatures(getResolvedTier(festival.tier))` and passes result as `effectiveFeatures` into `FestivalProvider`. Client feature checks respect these overrides when present.

### 3.2 Client (UI) gating

- **Hook:** `useFeature(featurePath)` and `useFeatures()` in `src/hooks/useFeature.ts`. They use `festival.effectiveFeatures` first (so Super Admin overrides apply), then fall back to `FeatureService.isFeatureEnabled(tier, featurePath)`.
- **Sidebar:** `FestivalDashboardSidebar` uses `useFeatures()` and hides items by feature (e.g. Settings, Members, Stage Management, Schedule, Sessions, QR Codes, Gallery, News, Leaderboard, Analytics). So BASIC sees only: Overview, Pre-Works (Groups, Categories, Students, Programmes, Assignment), Event-Works (Marks, Results), Help & Support.
- **Components:** Feature gates (e.g. `FeatureGate`, or direct `useFeature` checks) hide bulk upload, Excel export, QR, etc., and can show upgrade prompts where desired.

### 3.3 Server-side enforcement

- **Routes:** Pages under `/dashboard/[slug]/settings`, `/dashboard/[slug]/members`, `/dashboard/[slug]/content/gallery`, `/dashboard/[slug]/content/news`, `/dashboard/[slug]/pre-works/stage-management`, `/dashboard/[slug]/pre-works/schedule`, `/dashboard/[slug]/pre-works/sessions`, `/dashboard/[slug]/pre-works/qr-codes`, `/dashboard/[slug]/event-works/leaderboard`, and student profile routes check feature access (via `getEffectiveFeatureEnabled` or `FeatureService.isFeatureEnabled`) and redirect or `notFound()` for BASIC where the feature is disabled.
- **Actions:** Relevant server actions (e.g. Excel export, gallery, news, schedule, QR, team members) validate tier/feature (and limits) before performing mutations or exports.
- **Limits:** Student/programme/event/stage/category limits are enforced using `TIER_CONFIG[tier].limits` and services such as `usage-counter.service.ts` and `student.service.ts`; team size is capped by `maxTeamMembers` (BASIC: 1).

### 3.4 Public landing page

- **Logic:** Public festival page `src/app/(festivalPublic)/[slug]/page.tsx` (or equivalent) chooses a simplified landing (title + results) when the tier does not have `fullLandingPage`; BASIC has `fullLandingPage: false`, so it gets the basic public view only.

### 3.5 Post-expiry

- **Access:** Dashboard layout considers festival expired and redirects to `/profile?error=expired`; no read-only window in the current implementation.
- **Cleanup:** Any cron that cleans expired festivals should be tier-aware: for BASIC (`postExpiryAccess === "delete"`), delete festival and related data; for STANDARD/PRO, behavior is defined by their plan docs (currently config also uses `postExpiryAccess: "delete"` for all tiers).

---

## 4. Key Files

| Area | File(s) |
|------|--------|
| Tier & limits config | `src/config/pricing.ts` |
| Feature flags (config-only) | `src/lib/features.ts` |
| Effective features (config + overrides) | `src/server/services/plan-features.service.ts` |
| Plan feature toggles (Super Admin) | `src/config/plan-features.config.ts` |
| Client feature hooks | `src/hooks/useFeature.ts` |
| Dashboard layout & context | `src/app/dashboard/[slug]/layout.tsx`, `FestivalProvider` |
| Sidebar filtering | `src/components/festival/dashboard/FestivalDashboardSidebar.tsx` |
| Sidebar structure | `src/config/sidebar.config.ts` |
| Festival context (expiry, role) | `src/server/services/festival-context.service.ts` |

---

## 5. User journey (summary)

1. **Purchase:** User selects BASIC (₹1,500) → payment → festival created with 30-day validity.
2. **Setup:** Create categories, groups → import students (CSV) → create programmes (manual) → assign students to programmes.
3. **Event:** Generate chest numbers → enter results → publish results.
4. **Public:** Share festival URL → public sees basic page (title + results).
5. **Expiry:** After 30 days, access redirects to profile; tier-aware cleanup may delete BASIC festival data.

This document reflects the current architecture: single source for BASIC plan spec and enforcement.
