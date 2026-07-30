# Greenroom â€” Product Requirements Document

> **Status:** Complete
> **Version:** 1.0
> **Last Updated:** July 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Pricing Plans](#3-pricing-plans)
4. [Feature Modules](#4-feature-modules)
5. [Feature Enforcement](#5-feature-enforcement)
6. [Security](#6-security)
7. [Deployment](#7-deployment)
8. [Open Questions & Recommended Follow-ups](#8-open-questions--recommended-follow-ups)

---

## 1. Overview

### 1.1 Product Vision

Greenroom is a multi-tenant SaaS platform for festival, competition, and event organizers â€” primarily targeting Indian cultural/educational festivals (e.g., Islamic religious cultural events, school annual day competitions, inter-college festivals). Organizers subscribe to a plan, create a festival, manage participants and programmes, collect judged scores, and publish results â€” all through a branded public portal â€” without engineering involvement.

### 1.2 Target Users

| Role | Description |
|------|-------------|
| **Super Admin** | Platform operator. Manages all users, festivals, billing, system config, and analytics via `/super-admin/*`. |
| **Festival Owner** | The primary paying customer. Creates and owns a festival instance. |
| **Festival Member** | Additional organizers/colleagues invited by the owner (STANDARD/PRO). Roles: `ORGANIZER`, `ANNOUNCER`, `JUDGE`. RBAC is PRO-only. |
| **Judge** | External evaluator with a PIN-protected judge portal (`/judge/[token]`). Enters scores for assigned programmes. |
| **Participant/Participant** | Has a public profile page (`/{slug}/{participantSlug}`) showing assigned programmes and results. STANDARD+ only. |
| **Public Visitor** | Anonymous user visiting the festival's public site (`/{slug}`). Sees landing page, results, media, news, and schedule. |

### 1.3 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Docker local; Vercel Postgres / Railway in production) |
| Auth | JWT via `jose` library; session stored in HTTP-only cookie |
| Payments | Razorpay (checkout, subscription, webhook) |
| Email | Resend |
| File Storage | Vercel Blob or local disk |
| Observability | Sentry (error tracking), Vercel Analytics/Speed Insights |
| Linting/Formatting | Biome |
| Deployment | Vercel (recommended) or Railway |

### 1.4 Database Entities (Core)

```
user
  â””â”€â”€ festival (owned, 1:many)
        â”œâ”€â”€ festival_member (team, 1:many)
        â”œâ”€â”€ festival_lifecycle_event (audit trail, 1:many)
        â”œâ”€â”€ category (1:many)
        â”œâ”€â”€ group (1:many)
        â”œâ”€â”€ participant (1:many)
        â”œâ”€â”€ programme (1:many)
        â”‚     â”œâ”€â”€ programme_assignment (1:many)
        â”‚     â””â”€â”€ schedule_entry (1:many)
        â”œâ”€â”€ stage (1:many)
        â”œâ”€â”€ judge (1:many)
        â”œâ”€â”€ judgement_config (1:many)
        â”œâ”€â”€ result (1:many)
        â”œâ”€â”€ festival_media_image (1:many)
        â”œâ”€â”€ festival_news (1:many)
        â”œâ”€â”€ festival_poster_template (1:many)
        â”œâ”€â”€ festival_scoring_policy (1:1)
        â””â”€â”€ festival_scoring_award_rule (1:many)
system_config (global key-value overrides per festival/tier)
audit_log (global)
```

---

## 2. System Architecture

### 2.1 Request Lifecycle

```
Browser â†’ Next.js Middleware (JWT verification, festival access check)
        â†’ Route Handler / Server Action
              â†’ Service Layer (business logic)
              â†’ Repository/Model Layer (Drizzle queries)
              â†’ PostgreSQL
```

### 2.2 Module Dependency Map

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         UI Layer                                 â”‚
â”‚  (Next.js App Router pages + shadcn/ui components)              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚ server actions / api routes
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     Service Layer                                 â”‚
â”‚  auth.service â”‚ festival-lifecycle â”‚ plan-features â”‚ billing     â”‚
â”‚  participant â”‚ programme â”‚ group â”‚ category â”‚ stage â”‚ schedule      â”‚
â”‚  scoring-policy â”‚ results â”‚ leaderboard â”‚ announcement           â”‚
â”‚  notification â”‚ payment â”‚ judge â”‚ admin                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                   Repository / Model Layer                        â”‚
â”‚  (drizzle-orm queries per entity)                                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                      PostgreSQL                                   â”‚
â”‚  festival â”‚ user â”‚ participant â”‚ programme â”‚ result â”‚ etc.           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 2.3 Route Groups (App Router)

| Route Group | Prefix | Purpose |
|-------------|--------|---------|
| `(auth)` | `/auth/*` | Login, register, forgot-password, reset-password |
| `(public)` | `/` | Marketing pages: home, pricing, features, contact, about |
| `(overview)` | `/profile` | Authenticated user profile and festival list |
| `(admin)` | `/super-admin/*` | Super Admin dashboard |
| `dashboard/[slug]` | `/dashboard/*` | Authenticated festival management |
| `(festivalPublic)` | `/[slug]/*` | Public festival portal (read-only) |
| `(participant)` | `/[slug]/[participantSlug]` | Participant profile page (STANDARD+) |
| Judge Portal | `/judge/[token]` | PIN-protected judge scoring |
| API | `/api/*` | File upload webhook, payment webhook |

### 2.4 Key Architectural Patterns

- **Server Actions** for all mutations (create/update/delete across all entities)
- **Feature flags** gate entire routes and UI sections (not just buttons)
- **Programme status lifecycle**: `DRAFT â†’ ASSIGNED â†’ SCHEDULED â†’ IN_PROGRESS â†’ COMPLETED â†’ PASSED`
- **Festival lifecycle**: `SETUP â†’ READY â†’ ACTIVE â†’ COMPLETED â†’ EXPIRED`
- **Denormalized counts** on `festival` table (`participantsCount`, `stagesCount`, `programmesCount`) updated via triggers/services

---

## 3. Pricing Plans

### 3.1 Plan Comparison Matrix

| Feature | BASIC | STANDARD | PRO |
|---------|-------|----------|-----|
| **Price** | â‚¹1,500 | â‚¹3,000 | â‚¹6,000 |
| **Duration** | 30 days | 30 days | 30 days |
| **Participants** | 250 | 500 | 2,000 |
| **Programmes** | 100 | 250 | 1,000 |
| **Events** | 10 | 25 | 100 |
| **Stages** | 10 | 20 | 50 |
| **Storage** | 512 MB | 2 GB | 10 GB |
| **Categories** | 5 | 10 | 50 |
| **Team members** | 1 (owner only) | 3 | Unlimited |
| **Role-based access** | âŒ | âŒ | âœ… |
| **Participant profile** | âŒ | âœ… | âœ… |
| **Public participant profile** | âŒ | âœ… | âœ… |
| **Stage Management** | âŒ | âœ… | âœ… |
| **Schedule/Sessions** | âŒ | âœ… | âœ… |
| **QR Codes** | âŒ | âœ… | âœ… |
| **Bulk participant upload** | âŒ | âœ… | âœ… |
| **Bulk programme upload** | âŒ | âœ… | âœ… |
| **Excel export** | âŒ | âœ… | âœ… |
| **Full landing page** | âŒ | âœ… | âœ… |
| **Media** | âŒ | âœ… | âœ… |
| **News** | âŒ | âœ… | âœ… |
| **Custom URL** | âŒ | âœ… | âœ… |
| **Custom colors** | âŒ | âœ… | âœ… |
| **Live scoreboard** | âœ… | âœ… | âœ… |
| **Auto certificates** | âŒ | âœ… | âœ… |
| **Custom certificate templates** | âŒ | âŒ | âœ… |
| **Bulk certificate generation** | âŒ | âŒ | âœ… |
| **Advanced analytics** | âŒ | âŒ | âœ… |
| **Custom reports** | âŒ | âŒ | âœ… |
| **Custom domain** | âŒ | âŒ | âœ… |
| **White-label** | âŒ | âŒ | âœ… |
| **API access** | âŒ | âŒ | âœ… |
| **Webhooks** | âŒ | âŒ | âœ… |
| **Live results** | âŒ | âŒ | âœ… |
| **Multi-festival management** | âŒ | âŒ | âœ… |
| **Design templates** | âœ… | âœ… | âœ… |
| **Email notifications** | âŒ | âœ… | âœ… |
| **SMS/bulk notifications** | âŒ | âŒ | âœ… |
| **Support** | WhatsApp | Email (12h SLA) | Priority (4h SLA) |
| **Post-expiry access** | Delete | Delete | Delete |

### 3.2 BASIC Plan

**Config source:** `src/config/pricing.ts` (`TIER_CONFIG.BASIC`)

| Resource | Limit |
|----------|-------|
| Participants | 250 |
| Programmes | 100 |
| Events | 10 |
| Stages | 10 |
| Storage | 512 MB |
| Categories | 5 |

**Post-expiry:** `postExpiryAccess: "delete"`, `dataRetentionDays: 0`. Expired festivals redirect to `/profile?error=expired`; all data is deleted.

**Included features:** Categories, Groups, Participants, Programme Assignments, Scoring Policy, Marks Entry, Chest Numbers, Leaderboard, CSV participant import, PDF export, logo upload, basic public landing page (title + results).

### 3.3 STANDARD Plan

**Config source:** `src/config/pricing.ts` (`TIER_CONFIG.STANDARD`)

| Resource | Limit |
|----------|-------|
| Participants | 500 |
| Programmes | 250 |
| Events | 25 |
| Stages | 20 |
| Storage | 2 GB |
| Categories | 10 |

**Post-expiry:** `postExpiryAccess: "delete"`, `dataRetentionDays: 0`.

**Adds over BASIC:** Stage Management, Schedule/Sessions, QR Codes, Bulk participant/programme upload, Excel export, Full landing page, Media, News, Custom URL, Custom colors, Participant profile (dashboard + public), Email notifications.

### 3.4 PRO Plan

**Config source:** `src/config/pricing.ts` (`TIER_CONFIG.PRO`)

| Resource | Limit |
|----------|-------|
| Participants | 2,000 |
| Programmes | 1,000 |
| Events | 100 |
| Stages | 50 |
| Storage | 10 GB |
| Categories | 50 |

**Post-expiry:** `postExpiryAccess: "delete"`, `dataRetentionDays: 0`.

**Adds over STANDARD:** Unlimited team members with RBAC, Custom domain, White-label, Landing page builder, Custom certificate templates, Bulk certificate generation, Advanced analytics, Custom reports, API access, Webhooks, Live results, Multi-festival management, SMS/bulk notifications, Priority support.

---

## 4. Feature Modules

### 4.1 Authentication & Authorization

**Stack:** `jose` for JWT (HS256), HTTP-only `session` cookie, `bcryptjs` for password hashing.

**Flows:**
- Register â†’ account created â†’ email verification (future)
- Login â†’ JWT issued with `{ userId, role }` â†’ stored in HTTP-only cookie
- Forgot password â†’ Resend email with reset link â†’ `password_reset_token` table
- Middleware (`src/middleware.ts`) verifies JWT on all protected routes

**Roles (App-level enums):**

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Platform operator |
| `USER` | Registered customer |
| `FESTIVAL_OWNER` | Owner of a specific festival |
| `FESTIVAL_MEMBER` | Member of a festival team |

**Festival-level roles** (stored in `festival_member.role`):

| FestivalRole | Permissions |
|-------------|-------------|
| `ORGANIZER` | Full pre-event and event-works management |
| `ANNOUNCER` | Access to announcer desk and results publishing |
| `JUDGE` | Score entry via PIN-protected judge portal |

**Key files:**
- `src/features/auth/services/auth.service.ts`
- `src/features/auth/actions/auth.actions.ts`
- `src/middleware.ts`
- `src/features/auth/repositories/user.repository.ts`

### 4.2 Festival Lifecycle

**States:** `SETUP â†’ READY â†’ ACTIVE â†’ COMPLETED â†’ EXPIRED`

A festival starts in `SETUP` (created via onboarding wizard but payment not yet completed). Upon successful payment, it transitions to `READY`. Once the event starts date is reached, it becomes `ACTIVE`. When `expiresAt` passes, it becomes `EXPIRED`.

**Denormalized counters** on `festival`: `participantsCount`, `stagesCount`, `programmesCount`, `judgesCount`, `storageUsedMb`. These are updated by the relevant service layers rather than being counted at read time.

**Festival settings** include: `institutionName`, `institutionType`, `location`, `startDate`, `endDate`, `branding` (JSON: logo, colors), `rules` (JSON), `structure` (JSON), `maxResultScore`, `scoringSystem` (`SCORE_BASED` or `GRADE_BASED`), `publicDisplayMode`, `chestNumberSettings`.

**Key files:**
- `src/features/festivals/services/festival-lifecycle.service.ts`
- `src/features/festivals/services/festival-status.service.ts`
- `src/features/festivals/services/festival-expiration.service.ts`
- `src/features/festivals/services/festival-access.service.ts`
- `src/features/festivals/services/festival-context.service.ts`
- `src/features/festivals/services/usage-counter.service.ts`
- `src/features/festivals/services/storage-usage.service.ts`
- `src/features/festivals/repositories/festival.repository.ts`

### 4.3 Pre-Event Works

#### Groups

Organizers create groups (teams/schools/affiliations) that participants belong to. Groups have a name, color, and a `seriesStart` number for chest number generation.

- Route: `/dashboard/[slug]/pre-event-works/groups`
- Service: `src/features/groups/services/group.service.ts`
- Repository: `src/features/groups/repositories/group.repository.ts`

#### Categories

Categories define the type of programme (e.g., "Qiraath", "Naat", "Quiz", "Debate"). A category can be `SINGLE` (individual participant) or group-based (`TEAM` or `GROUP` from `CategoryType` enum).

- Route: `/dashboard/[slug]/pre-event-works/categories`
- Service: `src/features/categories/services/category.service.ts`
- Repository: `src/features/categories/repositories/category.repository.ts`

#### Participants

Participants are the participants. Each belongs to a `Group`. Fields include: name, slug (for public URL), chest number (auto-assigned from group series), and category. STANDARD+ also enables per-participant QR code PDF generation.

- Route: `/dashboard/[slug]/pre-event-works/participants`
- Service: `src/features/participants/services/participant.service.ts`
- Repository: `src/features/participants/repositories/participant.repository.ts`
- QR actions: `src/features/participants/actions/qr.actions.ts`

#### Programmes

Programmes are the competitive events (e.g., "Senior Naat Competition"). Each programme is tied to a `Category`, has a `ProgrammeType` (`INDIVIDUAL` or `GROUP`), `stageType`, status, `maxScore`, and `status` lifecycle.

**Programme status lifecycle:** `DRAFT â†’ ASSIGNED â†’ SCHEDULED â†’ IN_PROGRESS â†’ COMPLETED â†’ PASSED`

A programme must be `SCHEDULED` or later to appear in Event-Works on STANDARD/PRO plans.

- Route: `/dashboard/[slug]/pre-event-works/programmes`
- Services: `src/features/programmes/*`, `src/features/programmes/services/programme-status.service.ts`

#### Assignments

Links participants/groups to programmes. Without assignments, a programme cannot receive scores. Assignment creation triggers `updateProgrammeStatus`.

- Route: `/dashboard/[slug]/pre-event-works/assignments`
- Service: `src/features/assignments/services/assignment.service.ts`

#### Stage Management

Available STANDARD+. Organizers define stages (performance venues). Each stage has a name and capacity.

- Route: `/dashboard/[slug]/pre-event-works/stage-management`
- Service: `src/features/stages/services/stage.service.ts`
- Actions: `src/features/stages/actions/stage.actions.ts`

#### Schedule & Sessions

Available STANDARD+. Organizers build a schedule by assigning programmes to stages with start/end times. A `ScheduleEntry` links a `Programme` to a `Stage`. Schedule changes trigger `updateProgrammeStatus`.

- Route: `/dashboard/[slug]/pre-event-works/schedule`
- Actions: `src/features/schedule/actions/schedule.actions.ts`
- Utils: `src/features/schedule/utils/schedule-orchestration.ts`, `schedule-times-validation.ts`

#### Judge Management

Available STANDARD+. Organizers add judges (name, description). Judges receive a unique token for access to the PIN-protected judge portal.

- Route: `/dashboard/[slug]/pre-event-works/judges`
- Service: `src/features/judges/services/judge.service.ts`
- Actions: `src/features/judges/actions/judge.actions.ts`

#### Chest Numbers

Participants receive chest numbers based on their group's `seriesStart` + offset. Chest number settings are stored in `festival.chestNumberSettings` (JSON).

- Route: `/dashboard/[slug]/pre-event-works/chest-numbers`
- Actions: `src/features/participants/actions/chest-number.actions.ts`

### 4.4 Event-Works

#### Scoring Policy

Each festival has one active `festival_scoring_policy`. It defines: `normalizeTo` (out of X), `noGradeBelow` (minimum score for a grade), `gradeRules` (JSON array of grade boundaries and award points), and `isActive` flag.

Award rules (`festival_scoring_award_rule`) define points per grade (A, B, C, etc.) based on participant range or category.

- Service: `src/features/judgement/services/scoring-policy.service.ts`
- Actions: `src/features/judgement/actions/judgement.actions.ts`

#### Marks Entry

Judges enter scores via `/judge/[token]` (PIN-protected). Score entry creates/updates `Result` rows linked to `ProgrammeAssignment`.

- Judge portal: `src/app/judge/[token]/page.tsx`
- Service: `src/features/judgement/services/scoring-policy.service.ts`

#### Results

Results can be viewed in two modes:
- **Management** (`/dashboard/[slug]/event-works/results`) â€” organizers view all results, publish/unpublish per programme
- **Explore** (`/dashboard/[slug]/event-works/results`) â€” filter and drill into specific programmes

Publishing marks a programme's results as public and triggers leaderboard recalculation.

- Service: `src/features/results/services/results.service.ts`
- Calculator: `src/features/results/services/results-calculator.ts`
- Repository: `src/features/results/repositories/result.repository.ts`
- Actions: `src/features/results/actions/results.actions.ts`

#### Leaderboard

Team rankings based on aggregate award points. PRO additionally supports live scoreboard (`liveScoreboard: true`) and live results (`liveResults: true`).

- Route: `/dashboard/[slug]/event-works/leaderboard`
- Service: `src/features/results/services/leaderboard.service.ts`
- Visibility: `src/features/results/services/leaderboard-visibility.service.ts`

#### Announcer Desk

A dedicated view (`/dashboard/[slug]/announcer`) for the announcer role to view group standings and results per programme. Configured via `announcerResultsPerStandings` and `announcedProgrammesSinceStandings`.

- Service: `src/features/announcement/services/announcement-desk.service.ts`
- Actions: `src/features/announcement/actions/announcement.actions.ts`

#### Festival Live

A live view (`/dashboard/[slug]/festival-live`) for displaying real-time results on a projector/TV. Shows current programme being announced and group standings.

### 4.5 Public Portal

**Route group:** `(festivalPublic)` at `/[slug]/*`

#### Landing Page

- `fullLandingPage: true` (STANDARD+) renders a full branded landing page using `festival.branding` (colors, logo, about text, rules, structure, founder message)
- BASIC renders a minimal page (title + published results only)
- Controlled by `publicSiteEnabled` flag on festival

#### Public Pages

| Route | Description |
|-------|-------------|
| `/[slug]` | Landing page |
| `/[slug]/programmes` | List of all programmes |
| `/[slug]/programmes/[day]` | Programmes filtered by day (from schedule) |
| `/[slug]/sessions` | Session cards (schedule entries grouped by time) |
| `/[slug]/results` | Published results |
| `/[slug]/media` | Media images (STANDARD+) |
| `/[slug]/news` | News articles (STANDARD+) |
| `/[slug]/about` | About section |
| `/[slug]/[participantSlug]` | Participant public profile (STANDARD+) |

- Service: `src/features/festivals/services/festival-public-validation.service.ts`

### 4.6 Templates (Poster Editor)

A Konva-based canvas editor (`/editor`) allows organizers to create branded event posters. Templates are stored as JSON (`festival_poster_template.konva_json`) with `type` (`PosterTemplateType`) and status (`DRAFT`/`PUBLISHED`).

Published result posters are available for every announced result on the public portal, where visitors can preview, download and share them.

- Route: `/editor` and `/dashboard/[slug]/templates`
- Frontend: React-Konva (`react-konva`, `konva`)
- Storage: `festival_poster_template` table

### 4.7 Billing & Payments

**Provider:** Razorpay

**Flows:**
1. **Plan purchase** â€” User selects plan â†’ Razorpay Checkout â†’ webhook confirms payment â†’ `Payment` record created â†’ festival upgraded
2. **Plan upgrade** â€” Same flow; `tier` and `tierLabel` on `festival` are updated
3. **Renewal** â€” Not yet implemented (current: all plans are 30-day one-off)

**Key tables:** `payment`, `billing_record`
**Config:** `src/config/pricing.ts` defines prices

- Service: `src/features/payments/services/payment.service.ts`, `razorpay.service.ts`, `payments-domain.service.ts`
- Actions: `src/features/payments/actions/payment.actions.ts`
- Billing: `src/features/billing/services/billing.service.ts`
- Admin hooks: `src/features/payments/hooks/use-super-admin-payments.ts`, `use-payment-history.ts`, `use-unused-credit.ts`, `use-payment-status.ts`

### 4.8 Notifications

- **Email** (STANDARD+): via Resend API. Used for password reset, team invitations.
- **WhatsApp**: link-based support (configured in plan)
- **SMS** (PRO only): via Resend (future)

- Service: `src/features/notifications/services/notification.service.ts`
- Hook: `src/features/notifications/hooks/use-programme-notifications.ts`

### 4.9 Super Admin

Full platform administration at `/super-admin/*`:

| Route | Purpose |
|-------|---------|
| `/super-admin` | Overview dashboard |
| `/super-admin/festivals` | Manage all festivals |
| `/super-admin/users` | Manage all users |
| `/super-admin/payments` | View all payments |
| `/super-admin/analytics` | Platform-wide analytics |
| `/super-admin/plan-features` | Toggle features per-festival (overrides `TIER_CONFIG`) |
| `/super-admin/audit-logs` | View `audit_log` table |

- Services: `src/features/admin/services/admin.service.ts`, `analytics.service.ts`
- Actions: `src/features/admin/actions/admin.actions.ts`, `admin-user.actions.ts`
- Feature overrides: `src/config/plan-features.config.ts` + `src/features/plan-features/services/plan-features.service.ts`

### 4.10 Participant Profile (STANDARD+)

Participants get a personal dashboard (`/dashboard/[slug]/pre-event-works/participants/[participantSlug]`) showing:
- Assigned programmes
- Scores received per programme
- Leaderboard position
- Notifications (if any)

Public profile at `/[slug]/[participantSlug]` is accessible without auth.

- Service: `src/features/participants/services/participant-profile-url.ts`

---

## 5. Feature Enforcement

### 5.1 How Feature Gating Works

**Two sources of truth:**

1. **`FeatureService.isFeatureEnabled(tier, feature)`** â€” `src/lib/features.ts` / `src/features/plan-features/services/features.ts`. Reads only from `TIER_CONFIG`. Used in some flows (Excel export, participant profile checks).

2. **`getEffectiveFeatureEnabled(tier, feature)`** â€” `src/server/services/plan-features.service.ts` / `src/features/plan-features/services/plan-features.service.ts`. Merges `TIER_CONFIG` with Super Admin overrides from `SystemConfig`. Used in media, news, schedule, QR, stage, leaderboard, and most route-level checks.

**Recommendation (from existing plan docs):** Prefer `getEffectiveFeatureEnabled` everywhere for consistent behavior with Super Admin overrides.

### 5.2 Gating Layers

| Layer | Mechanism |
|-------|-----------|
| **Sidebar** | `FestivalDashboardSidebar` reads `effectiveFeatures` from `FestivalProvider` context; conditionally renders nav items |
| **Route** | Server components check `getEffectiveFeatureEnabled` or `FeatureService.isFeatureEnabled` â†’ `redirect()` or `notFound()` |
| **Server Action** | Actions validate tier/feature before performing mutations (e.g., Excel export, team member count) |
| **Client Component** | `useFeature(feature)` hook or `<FeatureGate>` component for inline UI gating |
| **Limits** | `TIER_CONFIG[tier].limits` enforced via `usage-counter.service.ts` before writes |

### 5.3 Consistency Issues (Known)

- `FeatureService` (config-only) and `getEffectiveFeatureEnabled` (config + overrides) are used interchangeably in different parts of the codebase. Super Admin overrides may not apply consistently to all features (e.g., Excel export uses config-only source).
- `festivalSettings: true` is set in `TIER_CONFIG.BASIC` but the settings page route is gated off via the feature flag anyway â€” the boolean being `true` here is intentional per plan docs but redundant.

### 5.4 Plan Feature Toggle Keys

Super Admins can toggle the following features per-festival via `/super-admin/plan-features`:

```
categories, groups, participants, programmes, assignments,
chestNumbers, results, stageManagement, schedule,
members, roleBasedAccess,
participantImport, participantBulkUpload, programmeBulkUpload,
pdfExport, excelExport,
emailNotifications, whatsappSupport, smsNotifications, bulkNotifications,
advancedAnalytics, customReports,
qrCodes, autoCertificates, customCertificateTemplates, bulkCertificateGeneration,
publicLandingPage, fullLandingPage, landingPageBuilder,
media, news,
customUrl, customDomain, logoUpload, customColors, whiteLabel,
apiAccess, webhooks, liveScoreboard, liveResults, multiFestivalManagement,
festivalSettings, advancedSettings, programmeAssignmentDeadline
```

---

## 6. Security

### 6.1 Authentication

- JWT signed with `JWT_SECRET` env var (minimum 32 characters recommended)
- Token stored in HTTP-only `session` cookie; not accessible via JavaScript
- All protected routes validated by `src/middleware.ts`

### 6.2 Authorization

- Festival ownership verified in dashboard layout via `festival-context.service.ts`
- Server actions always re-validate the actor's role before mutations
- Judge portal is token + optional PIN protected (`/judge/[token]`)
- Super Admin routes protected by `SUPER_ADMIN` role check in layout

### 6.3 Audit Logging

All significant mutations are logged to `audit_log`:
- `actorId`, `actorRole`, `action`, `targetType`, `targetId`, `metadata` (JSONB), `createdAt`

- Service: `src/features/auth/services/audit-log.service.ts`

### 6.4 Payment Security

- Razorpay webhook signature verification in `razorpay.service.ts`
- Secrets (`RAZORPAY_KEY_SECRET`) never exposed to client

### 6.5 Input Validation

- Server actions use `zod` schemas (via `@hookform/resolvers`) for all input validation
- Client forms use `react-hook-form` with `zod` resolver

---

## 7. Deployment

### 7.1 Vercel (Recommended)

1. Push to GitHub (`trizocommunity/greenroom`)
2. Import project in vercel.com
3. Add environment variables:
   - `DATABASE_URL` â€” PostgreSQL connection string
   - `JWT_SECRET` â€” long random string
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
   - `RESEND_API_KEY`
4. Deploy âœ…

### 7.2 Railway

1. Create new project â†’ connect GitHub repo
2. Add `DATABASE_URL` environment variable
3. Deploy âœ…

### 7.3 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `RAZORPAY_KEY_ID` | For payments | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | For payments | Razorpay secret key |
| `RESEND_API_KEY` | For email | Resend API key |

### 7.4 Database Setup

```bash
npm run db:setup  # starts Docker + pushes schema + seeds
```

Or step-by-step:
```bash
npm run db:start    # docker compose up -d
npm run db:push     # drizzle-kit push (creates tables)
npm run db:seed     # seeds Super Admin + sample festival
npm run db:studio   # open Drizzle Studio
```

---

## 8. Open Questions & Recommended Follow-ups

### 8.1 Feature Check Unification

`FeatureService` (config-only) and `getEffectiveFeatureEnabled` (config + overrides) are used inconsistently across the codebase. Super Admin overrides via `/super-admin/plan-features` may not apply to all features (e.g., Excel export, participant profile). **Recommendation:** Unify on `getEffectiveFeatureEnabled` everywhere, or clearly document which path each feature uses.

### 8.2 Post-Expiry Read-Only Window

All three tiers currently use `postExpiryAccess: "delete"` and `dataRetentionDays: 0`. Plan docs mention a possible read-only window for STANDARD/PRO after expiry, but this is not implemented. **Recommendation:** If read-only is desired, implement `ensureFestivalWritable(festivalId)` guards in all mutation actions and a tier-aware cleanup cron.

### 8.3 Cleanup Cron

There is no automated cleanup cron documented in the codebase for expired festivals. Plan docs note that a tier-aware cleanup should exist. **Recommendation:** Build a cron or Vercel cron-function that deletes BASIC festival data on expiry, and marks STANDARD/PRO as `EXPIRED` (read-only) before eventual deletion.

### 8.4 Renewal / Subscription Model

All current plans are one-time 30-day purchases. A recurring subscription model (Razorpay Subscriptions) is not yet wired up.

### 8.5 Email Verification

User registration creates an account immediately. Email verification (sending a verify-link) is referenced in auth flows but not fully implemented as of the current schema.

### 8.6 Multi-Festival Management (PRO)

`multiFestivalManagement: true` is in `TIER_CONFIG.PRO` but no dedicated UI or service for managing multiple festivals under one account is documented in the current plan docs or codebase structure.

---

## Appendix: Key Files Index

| Area | Primary File(s) |
|------|----------------|
| Tier config + limits | `src/config/pricing.ts` |
| Feature flags (config-only) | `src/features/plan-features/services/features.ts`, `src/lib/features.ts` |
| Effective features (config + overrides) | `src/features/plan-features/services/plan-features.service.ts` |
| Feature hooks (client) | `src/features/plan-features/hooks/use-feature.ts` |
| Sidebar gating | `src/components/festival/dashboard/FestivalDashboardSidebar.tsx` |
| Dashboard layout | `src/app/dashboard/[slug]/layout.tsx` |
| Festival lifecycle | `src/features/festivals/services/festival-lifecycle.service.ts` |
| Festival status | `src/features/festivals/services/festival-status.service.ts` |
| Festival access | `src/features/festivals/services/festival-access.service.ts` |
| Usage counters | `src/features/festivals/services/usage-counter.service.ts` |
| Auth | `src/features/auth/services/auth.service.ts` |
| Auth actions | `src/features/auth/actions/auth.actions.ts` |
| Middleware | `src/middleware.ts` |
| Payment | `src/features/payments/services/razorpay.service.ts` |
| Billing | `src/features/billing/services/billing.service.ts` |
| Participants | `src/features/participants/services/participant.service.ts` |
| Participant profile | `src/features/participants/services/participant-profile-url.ts` |
| QR codes | `src/features/participants/actions/qr.actions.ts` |
| Programmes | `src/features/programmes/services/programme.service.ts` |
| Programme status | `src/features/programmes/services/programme-status.service.ts` |
| Groups | `src/features/groups/services/group.service.ts` |
| Categories | `src/features/categories/services/category.service.ts` |
| Assignments | `src/features/assignments/services/assignment.service.ts` |
| Stages | `src/features/stages/services/stage.service.ts` |
| Schedule | `src/features/schedule/actions/schedule.actions.ts` |
| Scoring policy | `src/features/judgement/services/scoring-policy.service.ts` |
| Results | `src/features/results/services/results.service.ts` |
| Results calculator | `src/features/results/services/results-calculator.ts` |
| Leaderboard | `src/features/results/services/leaderboard.service.ts` |
| Announcer desk | `src/features/announcement/services/announcement-desk.service.ts` |
| Judge | `src/features/judges/services/judge.service.ts` |
| Notifications | `src/features/notifications/services/notification.service.ts` |
| Admin | `src/features/admin/services/admin.service.ts` |
| Admin analytics | `src/features/admin/services/analytics.service.ts` |
| Templates | `src/features/posters/services/poster-editor-preview.service.ts` |
| Storage | `src/features/festivals/services/storage-usage.service.ts` |
| Audit log | `src/features/auth/services/audit-log.service.ts` |
| Public festival | `src/features/festivals/services/festival-public-validation.service.ts` |
| News | `src/features/news/actions/news.actions.ts` |
| Media | `src/features/media/services/media.service.ts` |
| Plan features config | `src/config/plan-features.config.ts` |
| Plan features overrides | `src/features/plan-features/services/plan-features.service.ts` |
| Plan features actions | `src/features/plan-features/actions/plan-features.actions.ts` |
| Team members | `src/features/team/services/team.service.ts` |
| Team actions | `src/features/team/actions/team.actions.ts` |
