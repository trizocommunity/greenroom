# STANDARD Plan

**Purpose:** Mid-tier festival plan. Single source of truth for spec, behavior, and how it is enforced in the codebase.

**Config source:** `src/config/pricing.ts` (`TIER_CONFIG.STANDARD`). Feature resolution may include Super Admin overrides via `src/features/plan-features/services/plan-features.service.ts`.

---

## 1. Spec

| Item | Value |
|------|--------|
| **Price** | â‚¹3,000 |
| **Duration** | 90 days (active) |

### Limits

| Resource | Limit |
|----------|--------|
| Participants | 500 |
| Programmes | 250 |
| Events | 25 |
| Stages | 20 |
| Storage | 2,048 MB (2 GB) |
| Categories | 10 |

### Team

- **Members:** Enabled (`members: true`).
- **Role-based access:** Enabled (`roleBasedAccess: true`) — granular permissions per member.

### Post-expiry

- **Current config:** `postExpiryAccess: "delete"`, `dataRetentionDays: 0` (same as BASIC in current code). Expired festivals redirect to `/profile?error=expired`.
- **Historical intent:** Some design docs described a read-only window after expiry for STANDARD; that is not reflected in current `pricing.ts`. If read-only is reintroduced, cleanup cron must be tier-aware (delete only when tier is BASIC or after retention for STANDARD/PRO).

---

## 2. Features: STANDARD vs BASIC

STANDARD adds (or expands) the following over BASIC:

| Area | Feature | BASIC | STANDARD |
|------|---------|-------|----------|
| Pre-Works | Participant profile (dashboard) | âŒ | âœ… `viewParticipantProfile` |
| Pre-Works | Public participant profile `/{slug}/{participantSlug}` | âŒ | âœ… `publicParticipantProfile` |
| Pre-Works | Stage Management | âŒ | âœ… |
| Pre-Works | Schedule / Sessions | âŒ | âœ… |
| Pre-Works | QR Codes | âŒ | âœ… |
| Team | Members (max 3) | âŒ (max 1) | âœ… |
| Import/Export | Participant bulk upload | âŒ | âœ… |
| Import/Export | Programme bulk upload | âŒ | âœ… |
| Import/Export | Excel export | âŒ | âœ… |
| Landing & Content | Full landing page | âŒ | âœ… `fullLandingPage` |
| Landing & Content | Media | âŒ | âœ… |
| Landing & Content | News | âŒ | âœ… |
| Branding | Custom URL | âŒ | âœ… |
| Branding | Custom colors | âŒ | âœ… |
| Event-Works | Live scoreboard / Leaderboard | âŒ | âœ… |
| Settings | Festival settings | âŒ | âœ… |
| Settings | Advanced settings | âŒ | âœ… |
| Settings | Programme assignment deadline | âŒ | âœ… |
| Certificates | Auto certificates | âŒ | âœ… |
| Communication | Email notifications | âŒ | âœ… |
| Support | Support level | whatsapp | priority; `supportResponseTime: 4` |

STANDARD also includes (per current `pricing.ts`): role-based access, custom domain, white-label, live results, multi-festival management, advanced analytics, custom reports, SMS notifications, bulk notifications, landing page builder, custom certificate templates, bulk certificate generation, programme team leads, and programme audit drawer.

STANDARD does **not** include (per current `pricing.ts`): API access, webhooks.

---

## 3. How Itâ€™s Enforced in the Codebase

### 3.1 Config and feature resolution

- **Tier + limits:** `TIER_CONFIG.STANDARD` in `src/config/pricing.ts`.
- **Effective features:** Same pattern as BASIC: server uses `getEffectiveFeatureEnabled(tier, feature)` / `getEffectiveTierFeatures(tier)` from `src/features/plan-features/services/plan-features.service.ts` (config + Super Admin overrides). Dashboard layout passes `effectiveFeatures` into `FestivalProvider`; client `useFeature()` / `useFeatures()` use context first, then config.

### 3.2 Client (UI) gating

- **Sidebar:** `FestivalDashboardSidebar` uses `useFeatures()` and shows Settings, Members, Stage Management, Schedule, Sessions, QR Codes, Media, News, Leaderboard when the effective feature flags are true (STANDARD has them enabled).
- **Feature gates:** Components use `useFeature(...)` or `FeatureGate` for bulk uploads, Excel export, QR, participant profile links, etc., so STANDARD sees these; BASIC does not.

### 3.3 Server-side enforcement

- **Pages:** Routes for settings, members, media, news, stage-management, schedule, sessions, qr-codes, leaderboard, food-entry, exports, analytics, and participant profile (dashboard and public) check access via `getEffectiveFeatureEnabled(festival.tier, feature)` or `FeatureService.isFeatureEnabled(festival.tier, feature)` and redirect or `notFound()` when disabled.
- **Actions:** Excel export (`participant.actions.ts`), media, news, schedule, QR, team/member actions validate tier/feature and limits.
- **Limits:** Participants, programmes, events, stages, categories use `TIER_CONFIG[tier].limits` and services such as `usage-counter.service.ts`, `participant.service.ts`, `category.service.ts`.

### 3.4 Consistency note: two sources of truth

- **FeatureService** (`lib/features.ts`): reads only `TIER_CONFIG` (no overrides). Used in some flows (e.g. Excel export, participant profile checks).
- **getEffectiveFeatureEnabled** (`plan-features.service.ts`): config + DB overrides. Used in media, news, schedule, QR, stage, leaderboard, etc.
- **Recommendation:** For consistent behavior with Super Admin overrides, prefer `getEffectiveFeatureEnabled` (or a shared helper that uses the same matrix) everywhere, including Excel export and participant profile. Alternatively, document where overrides do and do not apply.

---

## 4. Quick reference: where STANDARD is enforced

| Area | Mechanism |
|------|-----------|
| Sidebar (Stage, Schedule, QR, Settings, Members, Media, News, Leaderboard) | `FestivalDashboardSidebar` + `useFeatures()` from context (`effectiveFeatures`) |
| Pages (QR, Stage, Schedule, Media, News, Leaderboard, Participant profile) | Server: `getEffectiveFeatureEnabled(tier, feature)` or `FeatureService.isFeatureEnabled` â†’ redirect/notFound |
| Actions (Excel, Media, News, Schedule, Events, Team/Members) | Server: feature check + limits |
| Limits (participants, programmes, etc.) | `TIER_CONFIG.STANDARD.limits` in services/actions |

---

## 5. Key files

Same as BASIC, plus any STANDARD-specific action or page that gates on tier/feature:

| Area | File(s) |
|------|--------|
| Tier & limits | `src/config/pricing.ts` |
| Feature flags (config) | `src/lib/features.ts` |
| Effective features (config + overrides) | `src/features/plan-features/services/plan-features.service.ts` |
| Client hooks | `src/features/plan-features/hooks/use-feature.ts` |
| Sidebar | `src/components/festival/dashboard/FestivalDashboardSidebar.tsx` |
| Team/member limits | `src/features/team/actions/team.actions.ts`, `src/features/members/services/member.service.ts` |
| Excel export | `src/features/participants/actions/participant.actions.ts` |
| Media / News / Schedule / QR / Leaderboard / Food Entry / Exports | Corresponding actions and dashboard pages |

---

## 6. Recommended follow-ups (from prior analysis)

1. **Cleanup cron:** If STANDARD (or PRO) is ever given a read-only period after expiry, make the cleanup job tier-aware: delete only BASIC on expiry; for STANDARD/PRO, mark as EXPIRED and delete only after `dataRetentionDays` (if applicable).
2. **Read-only enforcement:** If read-only is reintroduced, call `ensureFestivalWritable(festivalId)` (or equivalent) in all mutation actions (participants, programmes, results, schedule, media, news, events) so that during the read-only window no creates/updates/deletes are allowed.
3. **Unify feature checks:** Prefer one effective-feature source (e.g. `getEffectiveFeatureEnabled`) for all feature gating so Super Admin overrides apply consistently (including Excel export and participant profile).

---

## 7. Related Documentation

- [TIER.md](../TIER.md) - Unified tier comparison
- [BASIC_PLAN.md](./BASIC_PLAN.md) - Entry-level plan
- [PRO_PLAN.md](./PRO_PLAN.md) - Enterprise plan

This document reflects the current architecture and config; it can be updated when post-expiry or feature-resolution behavior changes.
