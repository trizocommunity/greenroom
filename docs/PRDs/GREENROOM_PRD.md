# Greenroom — Product Requirements Document

> **Status:** Complete  
> **Version:** 2.0  
> **Last Updated:** August 2026  

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

Greenroom is a multi-tenant SaaS platform for festival, competition, and event organizers — primarily targeting Indian cultural/educational festivals (e.g., Islamic religious cultural events, school annual day competitions, inter-college festivals). Organizers subscribe to a plan, create a festival, manage participants and programmes, collect judged scores, and publish results — all through a branded public portal — without engineering involvement.

### 1.2 Target Users

| Role | Description |
|------|-------------|
| **Super Admin** | Platform operator. Manages all users, festivals, billing, system config, and analytics via `/super-admin/*`. |
| **Festival Owner** | The primary paying customer. Creates and owns a festival instance. |
| **Festival Member** | Additional organizers/colleagues invited by the owner. Festival-level role is one of `ADMIN`, `ANNOUNCER`, `STAGE_MANAGER`, `MEDIA`, or `VOLUNTEER`. |
| **Participant** | A competitor/attendee with a dashboard login and a public profile page (`/(participant)/[slug]/[participantSlug]`). |
| **Stage Portal User** | An on-stage judge or announcer who signs in with a stage-scoped access code + PIN at `/[slug]/stage-portal/score/[configId]`. |
| **Public Visitor** | Anonymous user visiting the festival's public site (`/[slug]`). Sees landing page, results, media, news, and schedule. |

### 1.3 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Docker local; Neon / Vercel Postgres in production) |
| Auth | Better Auth (user/admin sessions) + custom participant/stage-portal sessions |
| Payments | Razorpay (checkout, subscription, webhook) |
| Email | Resend |
| File Storage | Cloudinary (images); export files are stored inline as base64 in Postgres |
| Observability | Sentry (error tracking), Vercel Analytics/Speed Insights |
| Linting/Formatting | Biome |
| Deployment | Vercel (recommended) or Railway |

### 1.4 Database Entities

```
user
  ├── account (Better Auth identities: email-OTP, Google)
  ├── session (Better Auth revocable sessions)
  ├── twoFactor (Better Auth 2FA state)
  ├── verification (Better Auth OTP/verification codes)
  ├── magicLinkToken (legacy no-op left by migration)
  ├── userLoginEvent (analytics)
  ├── userPurchaseSummary
  └── institution (optional)
        └── user.institutionId

festival (owned by user)
  ├── festivalMember (team, 1:many)
  ├── pendingInvitation (team invitations, 1:many)
  ├── festivalLifecycleEvent (audit trail, 1:many)
  ├── festivalCategoryPreference
  ├── category (1:many)
  ├── group (1:many)
  ├── participant (1:many)
  │     ├── participantOtp
  │     └── participantSession (custom dashboard login)
  ├── programme (1:many)
  │     ├── programmeAssignment (1:many)
  │     │     └── programmeAssignmentMember (per-member rows for GROUP programmes)
  │     ├── programmeTeamLead (1:many)
  │     ├── programmeReportingSession (1:many)
  │     │     ├── programmeReportedParticipant
  │     │     └── programmeCodeLetter (1:many)
  │     │           └── programmeCodeLetterRecipient
  │     ├── judgementConfig (1:many)
  │     │     ├── judgementConfigJudge
  │     │     └── judgementScore
  │     ├── schedule_entry (1:many)
  │     └── result (1:many)
  ├── stage (1:many)
  │     ├── stagePortalCredential (access code + PIN)
  │     ├── stagePortalSession (custom stage login)
  │     ├── stageManagerAssignment
  │     └── judgeStageAssignment
  ├── judge (1:many)
  ├── festivalScoringPolicy (1:many)
  ├── festivalScoringAwardRule (1:many)
  ├── festivalNews (1:many)
  ├── festivalMediaImage / festivalMediaVideo (1:many)
  ├── festivalPosterTemplate (1:many)
  │     └── festivalTemplateAssignment
  ├── payment (1:many)
  ├── festivalExport (1:many)
  ├── generalEntryCategory / generalEntry / generalEntryAward
  ├── foodHallSlot / foodHallSession / foodHallEntry
  └── programmeNotification

systemConfig (global key-value overrides per festival/tier)
audit_log (global)
```

---

## 2. System Architecture

### 2.1 Request Lifecycle

```
Browser → Next.js Route Handler / Server Action
              → Service Layer (business logic)
              → Repository/Model Layer (Drizzle queries)
              → PostgreSQL
```

The legacy `src/middleware.ts` JWT check has been removed. Authorization now happens inside route handlers, server actions, and layouts using Better Auth sessions and custom participant/stage-portal sessions.

### 2.2 Module Dependency Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UI Layer                                            │
│  (Next.js App Router pages + shadcn/ui components)                         │
└──────────────────────────────────────────────────────┬──────────────────────┘
                                                       │ server actions / api routes
┌──────────────────────────────────────────────────────▼──────────────────────┐
│                     Service Layer                                             │
│  auth / festival-lifecycle / plan-features / billing / exports              │
│  participant / programme / group / category / stage / schedule              │
│  reporting / judgement / results / leaderboard / announcement               │
│  food-entry / general-entries / notifications / admin                       │
└──────────────────────────────────────────────────────┬──────────────────────┘
                                                       │
┌──────────────────────────────────────────────────────▼──────────────────────┐
│                   Repository / Model Layer                                    │
│  (drizzle-orm queries per entity)                                            │
└──────────────────────────────────────────────────────┬──────────────────────┘
                                                       │
┌──────────────────────────────────────────────────────▼──────────────────────┐
│                      PostgreSQL                                               │
│  festival │ user │ participant │ programme │ result │ export │ etc.        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Route Groups (App Router)

| Route Group | Prefix | Purpose |
|-------------|--------|---------|
| `(auth)` | `/auth/*`, `/login`, `/onboarding/*`, `/2fa` | Login, onboarding, 2FA challenge |
| `(public)` | `/` | Marketing pages: home, pricing, features, contact, about |
| `(overview)` | `/profile` | Authenticated user profile and festival list |
| `(admin)` | `/super-admin/*` | Super Admin dashboard |
| `dashboard/[slug]` | `/dashboard/*` | Authenticated festival management |
| `(festivalPublic)` | `/[slug]/*` | Public festival portal (read-only) |
| `(participant)` | `/[slug]/[participantSlug]` | Participant public profile + dashboard subpages |
| Stage Portal | `/[slug]/stage-portal/score/[configId]` | Credential-based on-stage/off-stage judging |
| API | `/api/*`, `/api/v1/*` | Better Auth, webhooks, cron, REST endpoints |

| Route | Description |
|-------|-------------|
| `/dashboard/[slug]` | Festival overview |
| `/dashboard/[slug]/settings` | Festival settings |
| `/dashboard/[slug]/members` | Team member invitations & roles |
| `/dashboard/[slug]/pre-event-works/groups` | Group management |
| `/dashboard/[slug]/pre-event-works/categories` | Category management |
| `/dashboard/[slug]/pre-event-works/participants` | Participant list |
| `/dashboard/[slug]/pre-event-works/participants/[participantSlug]` | Participant profile (dashboard) |
| `/dashboard/[slug]/pre-event-works/programmes` | Programme management |
| `/dashboard/[slug]/pre-event-works/assignments` | Programme assignments |
| `/dashboard/[slug]/pre-event-works/stage-management` | Stage definitions |
| `/dashboard/[slug]/pre-event-works/schedule` | Schedule builder |
| `/dashboard/[slug]/pre-event-works/judges` | Judge management |
| `/dashboard/[slug]/pre-event-works/chest-numbers` | Chest number management |
| `/dashboard/[slug]/content/media` | Media images/videos |
| `/dashboard/[slug]/content/news` | News articles |
| `/dashboard/[slug]/event-works/reporting` | Programme reporting & code letters |
| `/dashboard/[slug]/event-works/marks` | Marks entry (non-external judging) |
| `/dashboard/[slug]/event-works/judgement` | External judgement management |
| `/dashboard/[slug]/event-works/results` | Results publishing/exploration |
| `/dashboard/[slug]/event-works/announcement` | Announcer desk |
| `/dashboard/[slug]/event-works/general-entries` | General entries & awards |
| `/dashboard/[slug]/event-works/top-scorers` | Top scorers |
| `/dashboard/[slug]/event-works/food-entry` | Food hall scan entry |
| `/dashboard/[slug]/stage-manager` | Stage manager view |
| `/dashboard/[slug]/announcer` | Legacy announcer view |
| `/dashboard/[slug]/templates` | Poster/template editor assignments |
| `/dashboard/[slug]/analytics` | Festival analytics |
| `/dashboard/[slug]/exports` | Festival exports |

### 2.4 Key Architectural Patterns

- **Server Actions** for most mutations; `/api/v1/*` routes for cron, webhooks, and external consumers.
- **Feature flags** gate entire routes and UI sections (not just buttons).
- **Programme status lifecycle**: `DRAFT → ASSIGNED → SCHEDULED → REPORTING → PENDING_JUDGMENT → JUDGING → PENDING_PUBLICATION → PUBLISHED → ANNOUNCED → CANCELLED`.
- **Festival lifecycle**: `READY → ONGOING → PAST → EXPIRED`.
- **Denormalized counts** on `festival` (`participantsCount`, `stagesCount`, `programmesCount`, `judgesCount`, `storageUsedMb`) updated by services.
- **Daily cron** at `/api/v1/cron` runs expiry warnings, archival, expiration, and export garbage collection.

---

## 3. Pricing Plans

### 3.1 Plan Comparison Matrix

All tiers currently use `festivalDurationDays: 90`.

| Feature | BASIC | STANDARD | PRO |
|---------|-------|----------|-----|
| **Price** | ₹1,500 | ₹3,000 | ₹6,000 |
| **Duration** | 90 days | 90 days | 90 days |
| **Participants** | 250 | 500 | 2,000 |
| **Programmes** | 100 | 250 | 1,000 |
| **Events** | 10 | 25 | 100 |
| **Stages** | 10 | 10 | 50 |
| **Storage** | 512 MB | 2 GB | 10 GB |
| **Categories** | 5 | 10 | 50 |
| **Team members** | 1 (owner only) | Unlimited | Unlimited |
| **Role-based access** | ❌ | ✅ | ✅ |
| **Participant profile** | ❌ | ✅ | ✅ |
| **Public participant profile** | ❌ | ✅ | ✅ |
| **Stage management** | ❌ | ✅ | ✅ |
| **Schedule/Sessions** | ❌ | ✅ | ✅ |
| **Food hall** | ❌ | ✅ | ✅ |
| **QR Codes** | ❌ | ✅ | ✅ |
| **Participant import** | ✅ (CSV) | ✅ (bulk upload) | ✅ (bulk upload) |
| **Programme bulk upload** | ❌ | ✅ | ✅ |
| **PDF export** | ✅ | ✅ | ✅ |
| **Excel export** | ❌ | ✅ | ✅ |
| **Full landing page** | ❌ | ✅ | ✅ |
| **Media** | ❌ | ✅ | ✅ |
| **News** | ❌ | ✅ | ✅ |
| **Custom URL** | ❌ | ✅ | ✅ |
| **Custom domain** | ❌ | ✅ | ✅ |
| **Custom colors** | ❌ | ✅ | ✅ |
| **White-label** | ❌ | ✅ | ✅ |
| **Live scoreboard** | ✅ | ✅ | ✅ |
| **Live results** | ✅ | ✅ | ✅ |
| **Auto certificates** | ❌ | ✅ | ✅ |
| **Custom certificate templates** | ❌ | ✅ | ✅ |
| **Bulk certificate generation** | ❌ | ✅ | ✅ |
| **Advanced analytics** | ❌ | ✅ | ✅ |
| **Custom reports** | ❌ | ✅ | ✅ |
| **API access** | ❌ | ✅ | ✅ |
| **Webhooks** | ❌ | ✅ | ✅ |
| **Multi-festival management** | ❌ | ✅ | ✅ |
| **Programme team leads** | ❌ | ✅ | ✅ |
| **Templates / poster editor** | ✅ | ✅ | ✅ |
| **Exports** | ✅ | ✅ | ✅ |
| **Email notifications** | ❌ | ✅ | ✅ |
| **WhatsApp support** | ✅ | ✅ | ✅ |
| **SMS/bulk notifications** | ❌ | ✅ | ✅ |
| **Support** | WhatsApp (24h) | Priority (4h) | Priority (4h) |
| **Post-expiry access** | Delete | Delete | Delete |

> **Note:** The current `TIER_CONFIG` gives STANDARD and PRO identical feature flags. The only differentiation is resource limits and price. This is what the code does today; do not assume STANDARD is missing PRO features unless `pricing.ts` changes.

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

**Post-expiry:** `postExpiryAccess: "delete"`, `dataRetentionDays: 0`. Expired festivals are eventually deleted by the daily cron.

**Included features:** Categories, Groups, Participants, Programmes, Assignments, Scoring Policy, Chest Numbers, Results, PDF export, CSV participant import, logo upload, basic public landing page, templates, exports, live scoreboard/live results.

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

**Adds over BASIC:** Stage management, schedule/sessions, food hall, bulk participant/programme upload, Excel export, full landing page, media, news, custom URL/colors/domain, white-label, participant profile (dashboard + public), email/SMS notifications, advanced analytics, custom reports, API/webhooks, certificates/QR, multi-festival management, programme team leads, role-based access.

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

**Adds over STANDARD:** Higher limits only. As of the current config, STANDARD already has every feature flag enabled, so PRO is differentiated by capacity.

---

## 4. Feature Modules

### 4.1 Authentication & Authorization

**Stack:** Better Auth (`src/core/auth/better-auth/auth.ts`) for user/admin sessions; custom cookie sessions for participants and stage-portal users.

**Three session systems:**

| System | Cookie | Principal | Lifetime |
|--------|--------|-----------|----------|
| Better Auth | `better-auth.session_token` | `user` row | 30 days |
| Participant | `participant_session` | `participant` row | 12 hours |
| Stage portal | `stage_portal_session` | `stagePortalCredential` row | 24 hours |

**User/admin flows:**
- Sign-up / sign-in via 4-digit email OTP (`emailOTP` plugin), 5-minute expiry, 3 attempts, hashed at rest.
- Google OAuth social sign-in with auto-linking by verified email.
- Optional 2FA via TOTP (authenticator apps) or email OTP fallback, plus 10 backup codes. Account lockout after 10 failed attempts.
- Password sign-in is disabled.

**Roles:**

| Level | Role | Description |
|-------|------|-------------|
| Global | `USER` | Registered customer |
| Global | `SUPER_ADMIN` | Platform operator |
| Festival | `OWNER` | Festival owner (implicit, not in enum) |
| Festival | `ADMIN` | Full festival management |
| Festival | `ANNOUNCER` | Results announcement desk |
| Festival | `STAGE_MANAGER` | Schedule and stage ops |
| Festival | `MEDIA` | Templates, exports, docs |
| Festival | `VOLUNTEER` | Food entry scanning |

Festival-level roles are stored in `festivalMember.role`.

**Key files:**
- `src/core/auth/better-auth/auth.ts`
- `src/core/auth/participant-session.ts`
- `src/core/auth/stage-portal-session.ts`
- `src/core/auth/cookie-session.ts`
- `src/features/auth/services/audit-log.service.ts`

### 4.2 Festival Lifecycle

**States:** `READY → ONGOING → PAST → EXPIRED`

A festival starts `READY` after onboarding/payment. The daily cron flips it through `ONGOING` and `PAST`, then `EXPIRED` after the window passes.

**Denormalized counters** on `festival`: `participantsCount`, `stagesCount`, `programmesCount`, `judgesCount`, `storageUsedMb`.

**Festival settings** include: `institutionName`, `institutionType`, `location`, `startDate`, `endDate`, `timezone`, `branding` (logo, colors), `rules`, `structure`, `foodHallSettings`, `maxResultScore`, `scoringSystem` (`POSITION_BASED` or `SCORE_BASED`), `publicDisplayMode`, `chestNumberSettings`, assignment/participant deadlines, `teamLeaderLimit`.

**Key files:**
- `src/features/festivals/services/festival-lifecycle.service.ts`
- `src/features/festivals/services/festival-status.service.ts`
- `src/features/festivals/services/festival-expiration.service.ts`
- `src/features/festivals/services/festival-access.service.ts`
- `src/features/festivals/services/festival-context.service.ts`
- `src/features/festivals/services/usage-counter.service.ts`
- `src/features/festivals/services/storage-usage.service.ts`

### 4.3 Pre-Event Works

#### Groups

Teams/schools/affiliations that participants belong to. Fields: name, color, `seriesStart` for chest-number generation.

- Route: `/dashboard/[slug]/pre-event-works/groups`
- Service: `src/features/groups/services/group.service.ts`

#### Categories

Defines the type of programme (e.g., "Qiraath", "Naat", "Quiz"). `categoryType` is `SINGLE` or `GENERAL`.

- Route: `/dashboard/[slug]/pre-event-works/categories`
- Service: `src/features/categories/services/category.service.ts`

#### Participants

Competitors. Each belongs to a `Group` and a `Category`. Fields: name, slug (`profileSlug`), chest number, date of birth, gender, email, phone.

- Route: `/dashboard/[slug]/pre-event-works/participants`
- Profile route: `/dashboard/[slug]/pre-event-works/participants/[participantSlug]`
- Service: `src/features/participants/services/participant.service.ts`

#### Programmes

Competitive events. Tied to a `Category`, with `programmeType` (`INDIVIDUAL` or `GROUP`), `stageType` (`STAGE` / `NON_STAGE`), `durationMode` (`SEQUENTIAL` / `PARALLEL`), status lifecycle, and `maxParticipantsPerGroup`/`maxTeamsPerGroup`/`maxParticipantsPerTeam`.

- Route: `/dashboard/[slug]/pre-event-works/programmes`
- Services: `src/features/programmes/services/programme.service.ts`, `programme-status.service.ts`

#### Assignments

Links participants/groups to programmes. For `GROUP` programmes, per-member rows live in `programmeAssignmentMember`.

- Route: `/dashboard/[slug]/pre-event-works/assignments`
- Service: `src/features/assignments/services/assignment.service.ts`

#### Stage Management

Define stages and off-stage areas. Each stage has `isOffStage` for off-stage judging.

- Route: `/dashboard/[slug]/pre-event-works/stage-management`
- Service: `src/features/stages/services/stage.service.ts`

#### Schedule & Sessions

Build a schedule by assigning programmes to stages with start/end times. `ScheduleEntry` can also represent a `SESSION` (ceremony, talk, concert).

- Route: `/dashboard/[slug]/pre-event-works/schedule`
- Actions: `src/features/schedule/actions/schedule.actions.ts`

#### Judge Management

Add judges (name, description). Judges can be assigned to stages (`judgeStageAssignment`) and to judgement configs.

- Route: `/dashboard/[slug]/pre-event-works/judges`
- Service: `src/features/judges/services/judge.service.ts`

#### Chest Numbers

Auto-assigned from a group's `seriesStart` + offset. Settings stored in `festival.chestNumberSettings`.

- Route: `/dashboard/[slug]/pre-event-works/chest-numbers`
- Actions: `src/features/participants/actions/chest-number.actions.ts`

### 4.4 Event Works

#### Reporting

Programme reporting session lifecycle: `NOT_STARTED → IN_PROGRESS → RESET → CLOSED`. Marks participants as reported, issues anonymous code letters, and drives the judgement workflow.

- Route: `/dashboard/[slug]/event-works/reporting`
- Service: `src/features/programmes/services/programme-reporting.service.ts`

#### Judgement / Marks Entry

`judgementConfig` links a programme and its reporting session to a score limit and judging mode (`GROUP`/per-code-letter). `judgementScore` stores per-judge scores against code letters. The dashboard provides a marks-entry UI; the stage portal provides credential-based scoring.

- Dashboard routes: `/dashboard/[slug]/event-works/marks`, `/dashboard/[slug]/event-works/judgement`
- Stage portal: `/[slug]/stage-portal/score/[configId]`
- Service: `src/features/judgement/services/scoring-policy.service.ts`

#### Results

Two-page flow:
- `/dashboard/[slug]/event-works/results` — management/exploration of all results, publish/unpublish per programme.
- `/dashboard/[slug]/event-works/announcement` — announcer desk for announcing results in order.

Publishing marks a programme's results public, triggers leaderboard recalculation, and updates team standings.

- Services: `src/features/results/services/results.service.ts`, `results-calculator.ts`, `leaderboard.service.ts`

#### Leaderboard / Top Scorers

Team rankings from aggregate award points. `festival.teamStandings` and `queuedTeamStandings` cache published standings.

- Route: `/dashboard/[slug]/event-works/top-scorers`
- Service: `src/features/results/services/leaderboard.service.ts`

#### General Entries

Non-programme awards (e.g., overall team trophies). `generalEntryCategory` groups entries; `generalEntry` defines an entry; `generalEntryAward` awards points to groups, publishable like results.

- Route: `/dashboard/[slug]/event-works/general-entries`
- Service: `src/features/general-entries/services/general-entries.service.ts`

#### Food Entry

Track participant food-hall attendance by scanning chest numbers. `foodHallSlot` defines time windows; `foodHallSession` opens a slot for a specific date; `foodHallEntry` records each scan.

- Route: `/dashboard/[slug]/event-works/food-entry`
- Service: `src/features/food-entry/services/food-entry.service.ts`

### 4.5 Public Portal

**Route group:** `(festivalPublic)` at `/[slug]/*`

| Route | Description |
|-------|-------------|
| `/[slug]` | Landing page |
| `/[slug]/programmes` | Programme list |
| `/[slug]/results` | Published results |
| `/[slug]/schedule` | Public schedule |
| `/[slug]/media` | Media images/videos (STANDARD+) |
| `/[slug]/news` | News articles (STANDARD+) |
| `/[slug]/editor` | Public poster/template editor |

`publicSiteEnabled` controls whether the public site is live. BASIC shows a minimal landing page (title + results); STANDARD+ shows a full branded landing page.

### 4.6 Participant Profile & Dashboard

Participants log in via a custom OTP flow (`/api/v1/participant-login/*`) and receive a `participant_session` cookie. Their dashboard lives under `/(participant)/[slug]/[participantSlug]`:

- `/[slug]/[participantSlug]/dashboard`
- `/[slug]/[participantSlug]/assigned-programmes`
- `/[slug]/[participantSlug]/all-programmes`
- `/[slug]/[participantSlug]/my-participants`
- `/[slug]/[participantSlug]/my-group`
- `/[slug]/[participantSlug]/notifications`

The public profile at `/(participant)/[slug]/[participantSlug]` shows assigned programmes and published results without authentication.

- Service: `src/features/participants/services/participant-profile-url.ts`

### 4.7 Templates (Poster Editor)

A Konva-based canvas editor allows organizers to create branded templates. Types: `RESULT`, `TEAM_POINTS`, `CANDIDATE_CARD`, `CERTIFICATE`. Assignments (`festivalTemplateAssignment`) attach templates to result ranges, certificate types, badges, or team points.

- Routes: `/editor`, `/dashboard/[slug]/editor`, `/dashboard/[slug]/templates`
- Service: `src/features/posters/services/poster-editor-preview.service.ts`

### 4.8 Exports

Festival-scoped export jobs for: `CALL_LIST`, `RESULTS`, `TEAM_RESULT`, `JUDGE_LIST`, `VALUATION_SHEET`, `BADGE`, `CERTIFICATE`. Formats: `PDF`/`CSV`. Generated files are stored inline as base64 in `festivalExport` and pruned after expiry by cron.

- Route: `/dashboard/[slug]/exports`
- API: `/api/v1/exports`
- Service: `src/features/exports/services/export-orchestrator.service.ts`

### 4.9 Stage Portal & Off-stage Judgement

Stage-portal credentials (`stagePortalCredential`) grant per-stage access via access code + PIN. A session cookie (`stage_portal_session`) lets an on-stage judge or announcer enter scores at `/[slug]/stage-portal/score/[configId]`. Off-stage programmes use `stage.isOffStage` and the off-stage service.

- Service: `src/features/stages/services/off-stage.service.ts`
- Actions: `src/features/stage-portal/actions/stage-portal-credential.actions.ts`

### 4.10 Programme Team Leads

A team lead can be appointed per `(programme, group, teamNumber)`. Used for GROUP programme coordination.

- Service: `src/features/programme-team-leads/services/programme-team-lead.service.ts`

### 4.11 Billing & Payments

**Provider:** Razorpay

**Flows:**
1. **Plan purchase** — User selects plan → Razorpay Checkout → webhook confirms payment → `Payment` record created → festival upgraded.
2. **Plan upgrade** — Same flow; `tier` and `tierLabel` on `festival` are updated.
3. **Renewal** — Not implemented; current plans are 90-day one-off purchases.

**Key tables:** `payment`, `userPurchaseSummary`

- Service: `src/features/payments/services/payment.service.ts`, `razorpay.service.ts`
- Actions: `src/features/payments/actions/payment.actions.ts`

### 4.12 Notifications

- **Email** (STANDARD+): via Resend. Used for sign-in OTP, 2FA OTP, team invitations.
- **WhatsApp**: link-based support (BASIC+).
- **SMS/bulk notifications**: flagged in config but currently same Resend path as email.
- **In-app notifications** stored in `programmeNotification` for users and participants.

- Service: `src/features/notifications/services/notification.service.ts`

### 4.13 Super Admin

Full platform administration at `/super-admin/*`:

| Route | Purpose |
|-------|---------|
| `/super-admin` | Overview dashboard |
| `/super-admin/analytics` | Platform-wide analytics |
| `/super-admin/users` | Manage all users |
| `/super-admin/festivals` | Manage all festivals |
| `/super-admin/payments` | View all payments |
| `/super-admin/audit-logs` | View `audit_log` table |
| `/super-admin/plan-features` | Toggle features per tier (overrides `TIER_CONFIG`) |
| `/super-admin/email-settings` | Email configuration |

- Services: `src/features/admin/services/admin.service.ts`, `analytics.service.ts`
- Feature overrides: `src/config/plan-features.config.ts` + `src/features/plan-features/services/plan-features.service.ts`

---

## 5. Feature Enforcement

### 5.1 How Feature Gating Works

**Two sources of truth:**

1. **`FeatureService.isFeatureEnabled(tier, feature)`** — `src/features/plan-features/services/features.ts`. Reads only from `TIER_CONFIG`.
2. **`getEffectiveFeatureEnabled(tier, feature)`** — `src/features/plan-features/services/plan-features.service.ts`. Merges `TIER_CONFIG` with Super Admin overrides from `systemConfig`.

**Recommendation:** Prefer `getEffectiveFeatureEnabled` everywhere so Super Admin overrides apply consistently.

### 5.2 Gating Layers

| Layer | Mechanism |
|-------|-----------|
| **Sidebar** | `FestivalDashboardSidebar` uses `getFestivalDashboardSidebarConfig`; items are filtered by role and plan |
| **Route** | Server components check `getEffectiveFeatureEnabled` or `FeatureService.isFeatureEnabled` → `redirect()` / `notFound()` |
| **Server Action** | Actions validate tier/feature before mutations |
| **Client Component** | `useFeature(feature)` hook or `<FeatureGate>` component for inline UI gating |
| **Limits** | `TIER_CONFIG[tier].limits` enforced via `usage-counter.service.ts` before writes |

### 5.3 Consistency Issues (Known)

- `FeatureService` (config-only) and `getEffectiveFeatureEnabled` (config + overrides) are used interchangeably. Super Admin overrides may not apply to all features.
- `PLAN_FEATURE_TOGGLE_KEYS` omits several boolean features (`exports`, `templates`, `viewParticipantProfile`, `publicParticipantProfile`, `programmeTeamLead`, `programmeAuditDrawer`), so the Super Admin toggle page cannot override them today.
- `festivalSettings: true` is set in `TIER_CONFIG.BASIC`, but the settings page route is still gated by feature checks.
- `STANDARD` and `PRO` have identical feature flags in `TIER_CONFIG`, so there is no feature-based upsell differentiation at runtime.

---

## 6. Security

### 6.1 Authentication

- Better Auth manages user/admin sessions in the `session` table with a signed cookie cache.
- No `src/middleware.ts` JWT gate; every protected route/action re-validates the session.
- Email OTP sign-in: 4 digits, 5-minute expiry, 3 attempts, hashed at rest.
- Google OAuth with auto-linking by verified email.
- Optional 2FA (TOTP + email-OTP fallback) with backup codes and account lockout.

### 6.2 Authorization

- Festival ownership verified in dashboard layout via `festival-context.service.ts`.
- Server actions always re-validate the actor's role before mutations.
- Stage portal is access-code + PIN protected.
- Super Admin routes protected by `SUPER_ADMIN` global role check.

### 6.3 Audit Logging

All significant mutations are logged to `audit_log`:
- `actorId`, `actorRole`, `action`, `targetType`, `targetId`, `metadata` (JSONB), `createdAt`

- Service: `src/features/auth/services/audit-log.service.ts`

### 6.4 Payment Security

- Razorpay webhook signature verification in `razorpay.service.ts`.
- Secrets (`RAZORPAY_KEY_SECRET`) never exposed to client.

### 6.5 Input Validation

- Server actions use `zod` schemas for all input validation.
- Client forms use `react-hook-form` with `zod` resolver.

---

## 7. Deployment

### 7.1 Vercel (Recommended)

1. Push to GitHub.
2. Import project in vercel.com.
3. Add environment variables (see below).
4. Deploy.

### 7.2 Railway

1. Create new project → connect GitHub repo.
2. Add `DATABASE_URL` environment variable.
3. Deploy.

### 7.3 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection string (runtime) |
| `DATABASE_URL_UNPOOLED` | Yes | Direct PostgreSQL connection string for `drizzle-kit` |
| `BETTER_AUTH_SECRET` | Yes | Better Auth signing secret (≥32 chars) |
| `BETTER_AUTH_URL` | Yes | Public app URL for Better Auth |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Yes | Comma-separated trusted origins |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |
| `GOOGLE_CLIENT_ID` | For Google OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Google OAuth | Google OAuth client secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | For payments | Razorpay public key |
| `RAZORPAY_KEY_ID` | For payments | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | For payments | Razorpay secret key |
| `RESEND_API_KEY` | For email in prod | Resend API key |
| `EMAIL_FROM` | For email | Verified sender address |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | For image uploads | Cloudinary cloud name |
| `NEXT_PUBLIC_CLOUDINARY_FESTIVAL_PRESET` | For image uploads | Cloudinary upload preset |
| `CLOUDINARY_API_KEY` | For image uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For image uploads | Cloudinary API secret |
| `CRON_SECRET` | Required in prod | Secret for `/api/v1/cron` Bearer auth |

`JWT_SECRET` is no longer used.

### 7.4 Database Setup

```bash
pnpm db:setup  # starts Docker + pushes schema + seeds
```

```bash
pnpm db:start    # docker compose up -d
pnpm db:push     # drizzle-kit push
pnpm db:seed     # seeds Super Admin + sample festival
pnpm db:studio   # open Drizzle Studio
```

---

## 8. Open Questions & Recommended Follow-ups

### 8.1 Feature Check Unification

`FeatureService` (config-only) and `getEffectiveFeatureEnabled` (config + overrides) are used inconsistently. Super Admin overrides via `/super-admin/plan-features` may not apply to all features. **Recommendation:** Migrate all checks to `getEffectiveFeatureEnabled` and add missing keys to `PLAN_FEATURE_TOGGLE_KEYS`.

### 8.2 STANDARD vs PRO Differentiation

`TIER_CONFIG.STANDARD` and `TIER_CONFIG.PRO` currently have identical boolean feature flags. The only runtime difference is resource limits. **Recommendation:** Decide which features should be PRO-only and update `pricing.ts` to match the product plan.

### 8.3 Post-Expiry Read-Only Window

All tiers currently use `postExpiryAccess: "delete"` and `dataRetentionDays: 0`. A read-only window for STANDARD/PRO after expiry is not implemented. **Recommendation:** If read-only is desired, implement `ensureFestivalWritable(festivalId)` guards and a tier-aware cleanup cron.

### 8.4 Renewal / Subscription Model

All current plans are one-time 90-day purchases. A recurring subscription model (Razorpay Subscriptions) is not wired up.

### 8.5 Email Verification

Better Auth tracks `emailVerified`, but an explicit email-verification step at sign-up is not enforced in the current flow.

### 8.6 Multi-Festival Management

`multiFestivalManagement: true` is in `TIER_CONFIG.PRO` (and `STANDARD`), but no dedicated UI or service for managing multiple festivals under one account exists.

---

## Appendix: Key Files Index

| Area | Primary File(s) |
|------|----------------|
| Tier config + limits | `src/config/pricing.ts` |
| Feature flags (config-only) | `src/features/plan-features/services/features.ts` |
| Effective features (config + overrides) | `src/features/plan-features/services/plan-features.service.ts` |
| Plan feature toggle keys | `src/config/plan-features.config.ts` |
| Feature hooks (client) | `src/features/plan-features/hooks/use-feature.ts` |
| Sidebar gating | `src/config/sidebar.config.ts` |
| Dashboard layout | `src/app/dashboard/[slug]/layout.tsx` |
| Better Auth config | `src/core/auth/better-auth/auth.ts` |
| Participant session | `src/core/auth/participant-session.ts` |
| Stage portal session | `src/core/auth/stage-portal-session.ts` |
| Festival lifecycle | `src/features/festivals/services/festival-lifecycle.service.ts` |
| Festival status | `src/features/festivals/services/festival-status.service.ts` |
| Festival access | `src/features/festivals/services/festival-access.service.ts` |
| Usage counters | `src/features/festivals/services/usage-counter.service.ts` |
| Auth audit log | `src/features/auth/services/audit-log.service.ts` |
| Payment | `src/features/payments/services/razorpay.service.ts` |
| Participants | `src/features/participants/services/participant.service.ts` |
| Participant profile | `src/features/participants/services/participant-profile-url.ts` |
| QR codes | `src/features/participants/actions/qr.actions.ts` |
| Programmes | `src/features/programmes/services/programme.service.ts` |
| Programme status | `src/features/programmes/services/programme-status.service.ts` |
| Programme reporting | `src/features/programmes/services/programme-reporting.service.ts` |
| Programme team leads | `src/features/programme-team-leads/services/programme-team-lead.service.ts` |
| Groups | `src/features/groups/services/group.service.ts` |
| Categories | `src/features/categories/services/category.service.ts` |
| Assignments | `src/features/assignments/services/assignment.service.ts` |
| Stages | `src/features/stages/services/stage.service.ts` |
| Off-stage judging | `src/features/stages/services/off-stage.service.ts` |
| Stage portal | `src/features/stage-portal/actions/stage-portal-credential.actions.ts` |
| Schedule | `src/features/schedule/actions/schedule.actions.ts` |
| Scoring policy | `src/features/judgement/services/scoring-policy.service.ts` |
| Results | `src/features/results/services/results.service.ts` |
| Results calculator | `src/features/results/services/results-calculator.ts` |
| Leaderboard | `src/features/results/services/leaderboard.service.ts` |
| Announcer desk | `src/features/announcement/services/announcement-desk.service.ts` |
| General entries | `src/features/general-entries/services/general-entries.service.ts` |
| Food entry | `src/features/food-entry/services/food-entry.service.ts` |
| Exports | `src/features/exports/services/export-orchestrator.service.ts` |
| Judge management | `src/features/judges/services/judge.service.ts` |
| Notifications | `src/features/notifications/services/notification.service.ts` |
| Admin | `src/features/admin/services/admin.service.ts` |
| Admin analytics | `src/features/admin/services/analytics.service.ts` |
| Templates | `src/features/posters/services/poster-editor-preview.service.ts` |
| Storage | `src/features/festivals/services/storage-usage.service.ts` |
| Public festival | `src/features/festivals/services/festival-public-validation.service.ts` |
| News | `src/features/news/actions/news.actions.ts` |
| Media | `src/features/media/services/media.service.ts` |
