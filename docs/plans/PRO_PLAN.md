# PRO Plan

**Purpose:** Enterprise-grade festival plan with maximum capacity and advanced features. Single source of truth for spec, behavior, and how it is enforced in the codebase.

**Config source:** `src/config/pricing.ts` (`TIER_CONFIG.PRO`). Feature resolution may include Super Admin overrides via `src/server/services/plan-features.service.ts`.

---

## 1. Spec

| Item | Value |
|------|-------|
| **Price** | ₹6,000 |
| **Duration** | 30 days (active) |
| **Target** | Established festivals, institutions, multi-event organizers |

### Limits

| Resource | Limit |
|----------|-------|
| Students | 2,000 |
| Programmes | 1,000 |
| Events | 100 |
| Stages | 50 |
| Storage | 10 GB |
| Categories | 50 |

### Team

- **Max team members:** Unlimited
- **Role-based access:** Yes (`roleBasedAccess: true`) - granular permissions per member

### Post-expiry

- **Behavior:** Delete all festival data after expiry (no read-only access).
- **Config:** `postExpiryAccess: "delete"`, `dataRetentionDays: 0`.
- **Runtime:** Expired festivals redirect to `/profile?error=expired`; any tier-aware cleanup cron should delete PRO festival data on expiry.

---

## 2. Features: Included vs Excluded

### Included (PRO)

- **Pre-Works:** Categories, Groups, Students, Student Profile (dashboard + public), Programmes, Assignments.
- **Event-Works:** Scoring Policy, Scoring, Chest Numbers, Leaderboard, Stage Management, Schedule/Sessions.
- **Import/Export:** Student import, Student bulk upload, Programme bulk upload, PDF export, Excel export.
- **Landing & Content:** Basic public page, Full landing page, Landing page builder, Gallery, News.
- **Certificates & QR:** QR Codes, Auto certificates, Custom certificate templates, Bulk certificate generation.
- **Branding:** Logo upload, Custom URL, Custom domain, Custom colors, White-label.
- **Communication:** Email notifications, WhatsApp support, SMS notifications, Bulk notifications.
- **Reporting:** Advanced analytics, Custom reports.
- **Advanced:** API access, Webhooks, Live scoreboard, Live results, Multi-festival management.
- **Settings:** Festival settings, Advanced settings, Programme assignment deadline.
- **Support:** Priority support (`supportLevel: "priority"`, `supportResponseTime: 4`).

### Excluded (none - PRO includes all features)

PRO is the top-tier plan with all features enabled.

---

## 3. Features: PRO vs STANDARD

PRO adds (or expands) the following over STANDARD:

| Area | Feature | STANDARD | PRO |
|------|---------|:--------:|:---:|
| Team | Role-Based Access Control | ❌ | ✅ |
| Team | Unlimited members | ❌ (max 3) | ✅ |
| Import/Export | Bulk certificate generation | ❌ | ✅ |
| Landing & Content | Landing page builder | ❌ | ✅ |
| Reporting | Advanced analytics | ❌ | ✅ |
| Reporting | Custom reports | ❌ | ✅ |
| Certificates | Custom certificate templates | ❌ | ✅ |
| Branding | Custom domain | ❌ | ✅ |
| Branding | White-label | ❌ | ✅ |
| Communication | SMS notifications | ❌ | ✅ |
| Communication | Bulk notifications | ❌ | ✅ |
| Advanced | API access | ❌ | ✅ |
| Advanced | Webhooks | ❌ | ✅ |
| Advanced | Live results | ❌ | ✅ |
| Advanced | Multi-festival management | ❌ | ✅ |
| Support | Priority support | email (12h) | priority (4h) |

---

## 4. How It's Enforced in the Codebase

### 4.1 Config and feature resolution

- **Tier + limits:** `TIER_CONFIG.PRO` in `src/config/pricing.ts` (limits and `features` object).
- **Server (config only):** `FeatureService.isFeatureEnabled(tier, feature)` in `src/lib/features.ts` reads from `TIER_CONFIG` only.
- **Server (with overrides):** `getEffectiveFeatureEnabled(tier, feature)` and `getEffectiveTierFeatures(tier)` in `src/server/services/plan-features.service.ts` merge config with Super Admin overrides stored in `SystemConfig`.
- **Dashboard context:** `src/app/dashboard/[slug]/layout.tsx` loads `getEffectiveTierFeatures(getResolvedTier(festival.tier))` and passes result as `effectiveFeatures` into `FestivalProvider`. Client feature checks respect these overrides when present.

### 4.2 Client (UI) gating

- **Hook:** `useFeature(featurePath)` and `useFeatures()` in `src/hooks/useFeature.ts`. They use `festival.effectiveFeatures` first (so Super Admin overrides apply), then fall back to `FeatureService.isFeatureEnabled(tier, featurePath)`.
- **Sidebar:** `FestivalDashboardSidebar` uses `useFeatures()` and shows all PRO features including Settings, Members, Stage Management, Schedule, Sessions, QR Codes, Gallery, News, Analytics, etc.
- **RBAC:** PRO's `roleBasedAccess: true` enables role-based permission checks in member management and feature access.

### 4.3 Server-side enforcement

- **Routes:** Pages under `/dashboard/[slug]/settings`, `/dashboard/[slug]/members`, `/dashboard/[slug]/content/gallery`, `/dashboard/[slug]/content/news`, `/dashboard/[slug]/pre-works/stage-management`, `/dashboard/[slug]/pre-works/schedule`, `/dashboard/[slug]/event-works/qr-codes`, `/dashboard/[slug]/analytics`, and admin routes check feature access (via `getEffectiveFeatureEnabled` or `FeatureService.isFeatureEnabled`) and grant access for PRO (all features enabled).
- **Actions:** Server actions (e.g. API endpoints, webhooks, bulk operations) validate tier/feature (and limits) before performing mutations.
- **Limits:** Student/programme/event/stage/category limits are enforced using `TIER_CONFIG[tier].limits` and services such as `usage-counter.service.ts` and `student.service.ts`.
- **Multi-festival:** PRO users can manage multiple festivals; festival switching UI and cross-festival operations are available.

### 4.4 Public landing page

- **Logic:** Public festival page `src/app/(festivalPublic)/[slug]/page.tsx` chooses full landing page builder when tier has `landingPageBuilder: true` (PRO); PRO users can customize their public festival URL with custom domain and white-label options.

---

## 5. Key Files

| Area | File(s) |
|------|---------|
| Tier & limits config | `src/config/pricing.ts` |
| Feature flags (config-only) | `src/lib/features.ts` |
| Effective features (config + overrides) | `src/server/services/plan-features.service.ts` |
| Plan feature toggles (Super Admin) | `src/config/plan-features.config.ts` |
| Client feature hooks | `src/hooks/useFeature.ts` |
| Dashboard layout & context | `src/app/dashboard/[slug]/layout.tsx`, `FestivalProvider` |
| Sidebar filtering | `src/components/festival/dashboard/FestivalDashboardSidebar.tsx` |
| Sidebar structure | `src/config/sidebar.config.ts` |
| Festival context (expiry, role) | `src/server/services/festival-context.service.ts` |
| Role-based access | `src/server/services/rbac.service.ts` |
| API endpoints | `src/app/api/` |
| Webhooks | `src/server/services/webhook.service.ts` |

---

## 6. User Journey (Summary)

1. **Purchase:** User selects PRO (₹6,000) → payment → festival created with 30-day validity.
2. **Setup:** Configure landing page builder → import students (bulk CSV) → create programmes → assign team members with roles.
3. **Configuration:** Set up custom domain, white-label branding, schedule with sessions, QR codes, gallery/news content.
4. **Event:** Configure scoring → enter scores per programme → view live results and leaderboard → generate bulk certificates.
5. **Post-event:** Export advanced analytics and custom reports → share via API/webhooks.
6. **Expiry:** After 30 days, access redirects to profile; tier-aware cleanup may delete PRO festival data.

---

## 7. Related Documentation

- [TIER.md](../TIER.md) - Unified tier comparison
- [BASIC_PLAN.md](./BASIC_PLAN.md) - Entry-level plan
- [STANDARD_PLAN.md](./STANDARD_PLAN.md) - Mid-tier plan

This document reflects the current architecture: single source for PRO plan spec and enforcement.
