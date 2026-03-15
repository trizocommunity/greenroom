# STANDARD Plan

**Purpose:** Mid-tier festival plan. Single source of truth for spec, behavior, and how it is enforced in the codebase.

**Config source:** `src/config/pricing.ts` (`TIER_CONFIG.STANDARD`). Feature resolution may include Super Admin overrides via `src/server/services/plan-features.service.ts`.

---

## 1. Spec

| Item | Value |
|------|--------|
| **Price** | ₹3,000 |
| **Duration** | 30 days (active) |

### Limits

| Resource | Limit |
|----------|--------|
| Students | 500 |
| Programmes | 250 |
| Events | 25 |
| Stages | 20 |
| Storage | 2,048 MB (2 GB) |
| Categories | 10 |

### Team

- **Max team members:** 3 (owner + up to 2 additional).
- **Role-based access:** No granular RBAC (PRO has `roleBasedAccess: true`).

### Post-expiry

- **Current config:** `postExpiryAccess: "delete"`, `dataRetentionDays: 0` (same as BASIC in current code). Expired festivals redirect to `/profile?error=expired`.
- **Historical intent:** Some design docs described a 30-day read-only window after expiry for STANDARD; that is not reflected in current `pricing.ts`. If read-only is reintroduced, cleanup cron must be tier-aware (delete only when tier is BASIC or after retention for STANDARD/PRO).

---

## 2. Features: STANDARD vs BASIC

STANDARD adds (or expands) the following over BASIC:

| Area | Feature | BASIC | STANDARD |
|------|---------|-------|----------|
| Pre-Works | Student profile (dashboard) | ❌ | ✅ `viewStudentProfile` |
| Pre-Works | Public student profile `/{slug}/{studentSlug}` | ❌ | ✅ `publicStudentProfile` |
| Pre-Works | Stage Management | ❌ | ✅ |
| Pre-Works | Schedule / Sessions | ❌ | ✅ |
| Pre-Works | QR Codes | ❌ | ✅ |
| Team | Members (max 3) | ❌ (max 1) | ✅ |
| Import/Export | Student bulk upload | ❌ | ✅ |
| Import/Export | Programme bulk upload | ❌ | ✅ |
| Import/Export | Excel export | ❌ | ✅ |
| Landing & Content | Full landing page | ❌ | ✅ `fullLandingPage` |
| Landing & Content | Gallery | ❌ | ✅ |
| Landing & Content | News | ❌ | ✅ |
| Branding | Custom URL | ❌ | ✅ |
| Branding | Custom colors | ❌ | ✅ |
| Event-Works | Live scoreboard / Leaderboard | ❌ | ✅ |
| Settings | Festival settings | ❌ | ✅ |
| Settings | Advanced settings | ❌ | ✅ |
| Settings | Programme assignment deadline | ❌ | ✅ |
| Certificates | Auto certificates | ❌ | ✅ |
| Communication | Email notifications | ❌ | ✅ |
| Support | Support level | whatsapp | email; `supportResponseTime: 12` |

STANDARD does **not** include (PRO only): roleBasedAccess, custom domain, white-label, API access, webhooks, live results, multi-festival management, advanced analytics, custom reports, custom certificate templates, bulk certificate generation, landing page builder, SMS/bulk notifications.

---

## 3. How It’s Enforced in the Codebase

### 3.1 Config and feature resolution

- **Tier + limits:** `TIER_CONFIG.STANDARD` in `src/config/pricing.ts`.
- **Effective features:** Same pattern as BASIC: server uses `getEffectiveFeatureEnabled(tier, feature)` / `getEffectiveTierFeatures(tier)` from `plan-features.service.ts` (config + Super Admin overrides). Dashboard layout passes `effectiveFeatures` into `FestivalProvider`; client `useFeature()` / `useFeatures()` use context first, then config.

### 3.2 Client (UI) gating

- **Sidebar:** `FestivalDashboardSidebar` uses `useFeatures()` and shows Settings, Members, Stage Management, Schedule, Sessions, QR Codes, Gallery, News, Leaderboard when the effective feature flags are true (STANDARD has them enabled).
- **Feature gates:** Components use `useFeature(...)` or `FeatureGate` for bulk uploads, Excel export, QR, student profile links, etc., so STANDARD sees these; BASIC does not.

### 3.3 Server-side enforcement

- **Pages:** Routes for settings, members, gallery, news, stage-management, schedule, sessions, qr-codes, leaderboard, and student profile (dashboard and public) check access via `getEffectiveFeatureEnabled(festival.tier, feature)` or `FeatureService.isFeatureEnabled(festival.tier, feature)` and redirect or `notFound()` when disabled.
- **Actions:** Excel export (`student.actions.ts`), gallery, news, schedule, QR, team/member actions validate tier/feature and limits. Team member count is enforced against `maxTeamMembers` (e.g. from `FeatureService.getFeatureValue(tier, "maxTeamMembers")` or equivalent).
- **Limits:** Students, programmes, events, stages, categories use `TIER_CONFIG[tier].limits` and services such as `usage-counter.service.ts`, `student.service.ts`, `category.service.ts`.

### 3.4 Consistency note: two sources of truth

- **FeatureService** (`lib/features.ts`): reads only `TIER_CONFIG` (no overrides). Used in some flows (e.g. Excel export, student profile checks).
- **getEffectiveFeatureEnabled** (`plan-features.service.ts`): config + DB overrides. Used in gallery, news, schedule, QR, stage, leaderboard, etc.
- **Recommendation:** For consistent behavior with Super Admin overrides, prefer `getEffectiveFeatureEnabled` (or a shared helper that uses the same matrix) everywhere, including Excel export and student profile. Alternatively, document where overrides do and do not apply.

---

## 4. Quick reference: where STANDARD is enforced

| Area | Mechanism |
|------|-----------|
| Sidebar (Stage, Schedule, QR, Settings, Members, Gallery, News, Leaderboard) | `FestivalDashboardSidebar` + `useFeatures()` from context (`effectiveFeatures`) |
| Pages (QR, Stage, Schedule, Gallery, News, Leaderboard, Student profile) | Server: `getEffectiveFeatureEnabled(tier, feature)` or `FeatureService.isFeatureEnabled` → redirect/notFound |
| Actions (Excel, Gallery, News, Schedule, Events, Team/Members) | Server: feature check + limits (e.g. `maxTeamMembers`) |
| Limits (students, programmes, members, etc.) | `TIER_CONFIG.STANDARD.limits` / `getFeatureValue("maxTeamMembers")` in services/actions |

---

## 5. Key files

Same as BASIC, plus any STANDARD-specific action or page that gates on tier/feature:

| Area | File(s) |
|------|--------|
| Tier & limits | `src/config/pricing.ts` |
| Feature flags (config) | `src/lib/features.ts` |
| Effective features (config + overrides) | `src/server/services/plan-features.service.ts` |
| Client hooks | `src/hooks/useFeature.ts` |
| Sidebar | `src/components/festival/dashboard/FestivalDashboardSidebar.tsx` |
| Team/member limits | `src/server/actions/team.actions.ts`, `src/server/services/member.service.ts` |
| Excel export | `src/server/actions/student.actions.ts` |
| Gallery / News / Schedule / QR / Leaderboard | Corresponding actions and dashboard pages |

---

## 6. Recommended follow-ups (from prior analysis)

1. **Cleanup cron:** If STANDARD (or PRO) is ever given a read-only period after expiry, make the cleanup job tier-aware: delete only BASIC on expiry; for STANDARD/PRO, mark as EXPIRED and delete only after `dataRetentionDays` (if applicable).
2. **Read-only enforcement:** If read-only is reintroduced, call `ensureFestivalWritable(festivalId)` (or equivalent) in all mutation actions (students, programmes, results, schedule, gallery, news, events) so that during the read-only window no creates/updates/deletes are allowed.
3. **Unify feature checks:** Prefer one effective-feature source (e.g. `getEffectiveFeatureEnabled`) for all feature gating so Super Admin overrides apply consistently (including Excel export and student profile).

This document reflects the current architecture and config; it can be updated when post-expiry or feature-resolution behavior changes.
