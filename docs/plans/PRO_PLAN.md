# PRO Plan

**Purpose:** Enterprise-grade festival plan with maximum capacity and advanced features. Single source of truth for spec, behavior, and how it is enforced in the codebase.

**Config source:** `src/config/pricing.ts` (`TIER_CONFIG.PRO`). Feature resolution may include Super Admin overrides via `src/features/plan-features/services/plan-features.service.ts`.

---

## 1. Spec

| Item | Value |
|------|-------|
| **Price** | â‚¹6,000 |
| **Duration** | 90 days (active) |
| **Target** | Established festivals, institutions, multi-event organizers |

### Limits

| Resource | Limit |
|----------|-------|
| Participants | 2,000 |
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

- **Pre-Works:** Categories, Groups, Participants, Participant Profile (dashboard + public), Programmes, Assignments.
- **Event-Works:** Scoring Policy, Scoring, Chest Numbers, Leaderboard, Stage Management, Schedule/Sessions, Food Hall.
- **Import/Export:** Participant import, Participant bulk upload, Programme bulk upload, PDF export, Excel export, Exports.
- **Landing & Content:** Basic public page, Full landing page, Landing page builder, Media, News.
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
| Team | Role-Based Access Control | âœ… | âœ… |
| Team | Unlimited members | âœ… | âœ… |
| Import/Export | Bulk certificate generation | âœ… | âœ… |
| Landing & Content | Landing page builder | âœ… | âœ… |
| Reporting | Advanced analytics | âœ… | âœ… |
| Reporting | Custom reports | âœ… | âœ… |
| Certificates | Custom certificate templates | âœ… | âœ… |
| Branding | Custom domain | âœ… | âœ… |
| Branding | White-label | âœ… | âœ… |
| Communication | SMS notifications | âœ… | âœ… |
| Communication | Bulk notifications | âœ… | âœ… |
| Advanced | API access | âŒ | âœ… |
| Advanced | Webhooks | âŒ | âœ… |
| Advanced | Live results | âœ… | âœ… |
| Advanced | Multi-festival management | âœ… | âœ… |
| Support | Priority support | priority (4h) | priority (4h) |

> Note: Current `TIER_CONFIG` enables most PRO-marketed features for STANDARD as well. The only features PRO truly adds over STANDARD in the current code are **API access** and **webhooks**.

---

## 4. How It's Enforced in the Codebase

### 4.1 Config and feature resolution

- **Tier + limits:** `TIER_CONFIG.PRO` in `src/config/pricing.ts` (limits and `features` object).
- **Server (config only):** `FeatureService.isFeatureEnabled(tier, feature)` in `src/lib/features.ts` reads from `TIER_CONFIG` only.
- **Server (with overrides):** `getEffectiveFeatureEnabled(tier, feature)` and `getEffectiveTierFeatures(tier)` in `src/features/plan-features/services/plan-features.service.ts` merge config with Super Admin overrides stored in `SystemConfig`.
- **Dashboard context:** `src/app/dashboard/[slug]/layout.tsx` loads `getEffectiveTierFeatures(getResolvedTier(festival.tier))` and passes result as `effectiveFeatures` into `FestivalProvider`. Client feature checks respect these overrides when present.

### 4.2 Client (UI) gating

- **Hook:** `useFeature(featurePath)` and `useFeatures()` in `src/hooks/useFeature.ts`. They use `festival.effectiveFeatures` first (so Super Admin overrides apply), then fall back to `FeatureService.isFeatureEnabled(tier, featurePath)`.
- **Sidebar:** `FestivalDashboardSidebar` uses `useFeatures()` and shows all PRO features including Settings, Members, Stage Management, Schedule, Sessions, QR Codes, Media, News, Analytics, etc.
- **RBAC:** PRO's `roleBasedAccess: true` enables role-based permission checks in member management and feature access.

### 4.3 Server-side enforcement

- **Routes:** Pages under `/dashboard/[slug]/settings`, `/dashboard/[slug]/members`, `/dashboard/[slug]/content/media`, `/dashboard/[slug]/content/news`, `/dashboard/[slug]/pre-event-works/stage-management`, `/dashboard/[slug]/pre-event-works/schedule`, `/dashboard/[slug]/event-works/qr-codes`, `/dashboard/[slug]/event-works/food-entry`, `/dashboard/[slug]/analytics`, `/dashboard/[slug]/exports`, and admin routes check feature access (via `getEffectiveFeatureEnabled` or `FeatureService.isFeatureEnabled`) and grant access for PRO (all features enabled).
- **Actions:** Server actions (e.g. API endpoints, webhooks, bulk operations) validate tier/feature (and limits) before performing mutations.
- **Limits:** Participant/programme/event/stage/category limits are enforced using `TIER_CONFIG[tier].limits` and services such as `usage-counter.service.ts` and `participant.service.ts`.
- **Multi-festival:** PRO users can manage multiple festivals; festival switching UI and cross-festival operations are available.

### 4.4 Public landing page

- **Logic:** Public festival page `src/app/(festivalPublic)/[slug]/page.tsx` chooses full landing page builder when tier has `landingPageBuilder: true` (PRO); PRO users can customize their public festival URL with custom domain and white-label options.

---

## 5. Key Files

| Area | File(s) |
|------|---------|
| Tier & limits config | `src/config/pricing.ts` |
| Feature flags (config-only) | `src/lib/features.ts` |
| Effective features (config + overrides) | `src/features/plan-features/services/plan-features.service.ts` |
| Plan feature toggles (Super Admin) | `src/config/plan-features.config.ts` |
| Client feature hooks | `src/features/plan-features/hooks/use-feature.ts` |
| Dashboard layout & context | `src/app/dashboard/[slug]/layout.tsx`, `FestivalProvider` |
| Sidebar filtering | `src/components/festival/dashboard/FestivalDashboardSidebar.tsx` |
| Sidebar structure | `src/config/sidebar.config.ts` |
| Festival context (expiry, role) | `src/features/festivals/services/festival-context.service.ts` |
| Role-based access | `src/features/team/services/team.service.ts`, `src/features/members/services/member.service.ts` |
| API endpoints | `src/app/api/` |
| Webhooks | `src/features/festivals/services/public-api-access.service.ts` |

---

## 6. User Journey (Summary)

1. **Purchase:** User selects PRO (â‚¹6,000) â†’ payment â†’ festival created with 90-day validity.
2. **Setup:** Configure landing page builder â†’ import participants (bulk CSV) â†’ create programmes â†’ assign team members with roles.
3. **Configuration:** Set up custom domain, white-label branding, schedule with sessions, QR codes, media/news content.
4. **Event:** Configure scoring â†’ enter scores per programme â†’ view live results and leaderboard â†’ generate bulk certificates.
5. **Post-event:** Export advanced analytics and custom reports â†’ share via API/webhooks.
6. **Expiry:** After 90 days, access redirects to profile; tier-aware cleanup may delete PRO festival data.

---

## 7. Related Documentation

- [TIER.md](../TIER.md) - Unified tier comparison
- [BASIC_PLAN.md](./BASIC_PLAN.md) - Entry-level plan
- [STANDARD_PLAN.md](./STANDARD_PLAN.md) - Mid-tier plan

This document reflects the current architecture: single source for PRO plan spec and enforcement.
