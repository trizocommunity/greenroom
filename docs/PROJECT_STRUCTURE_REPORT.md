# Greenroom Project Structure Report

**Generated:** April 24, 2026  
**Project:** Trizo Greenroom - Festival Management Platform  
**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, PostgreSQL, Tailwind CSS

---

## 📁 Root Directory Structure

```
greenroom/
├── .agent/                    # AI agent skills & configurations
├── .cursor/                   # Cursor IDE plans & settings
├── .qoder/                    # Qoder agent configurations
├── .qodo/                     # Qodo workflows
├── .vscode/                   # VS Code settings
├── docs/                      # Documentation (22 items)
├── drizzle/                   # Database migrations
├── public/                    # Static assets
├── scripts/                   # Deployment scripts
├── src/                       # Main source code (440 items)
├── .biomeignore               # Biome linter ignore
├── .gitignore                 # Git ignore
├── biome.json                 # Biome configuration
├── components.json            # shadcn/ui components config
├── drizzle.config.ts          # Drizzle ORM config
├── next.config.ts             # Next.js config
├── package.json               # Dependencies
├── postcss.config.mjs         # PostCSS config
├── tailwind.config.ts          # Tailwind CSS config
├── tsconfig.json              # TypeScript config
└── vercel.json                # Vercel deployment config
```

---

## 📊 File Statistics

| Category | Count |
|----------|-------|
| TypeScript Files (.ts) | 69 |
| TSX Component Files (.tsx) | 55 |
| Total Source Files | ~124 |
| Database Tables | 30+ |
| API Routes | 25 |
| React Components | 162 |

---

## 🗂️ Source Directory (`src/`)

### 1. App Router (`src/app/`) - 132 items

| Route Group | Purpose | Pages |
|-------------|---------|-------|
| `(admin)` | Super Admin Dashboard | 17 items |
| `(auth)` | Authentication flows | 6 items |
| `(festivalPublic)` | Public festival sites | 13 items |
| `(overview)` | User profile/overview | 3 items |
| `(public)` | Marketing website | 8 items |
| `(student)` | Student/Participant area | 18 items |
| `api/` | API Routes | 25 items |
| `dashboard/` | Festival admin dashboard | 35 items |

#### Detailed Route Structure:

```
src/app/
├── (admin)/
│   └── super-admin/
│       ├── analytics/
│       ├── audit-logs/
│       ├── festivals/[id]/, [slug]/
│       ├── payments/
│       ├── plan-features/
│       ├── support/[ticketId]/
│       └── users/
│
├── (auth)/
│   ├── forgot-password/
│   ├── login/
│   ├── onboarding/
│   ├── register/
│   └── reset-password/
│
├── (festivalPublic)/[slug]/
│   ├── [studentSlug]/
│   ├── about/
│   ├── gallery/
│   ├── news/
│   ├── participant/[studentId]/
│   ├── programmes/
│   ├── results/
│   └── sessions/
│
├── (overview)/profile/
│   └── festivals/[slug]/expired/
│
├── (public)/
│   ├── about/
│   ├── contact/
│   ├── features/
│   ├── pricing/
│   └── services/
│
├── (student)/[slug]/[studentSlug]/
│   ├── all-programmes/
│   ├── assign-programmes/
│   ├── assigned-programmes/
│   └── leader/(protected)/
│       ├── all-programmes/
│       ├── assign-programmes/
│       ├── programme-reporting/
│       ├── student-reporting/
│       └── team-reporting/
│
├── api/
│   ├── auth/
│   │   ├── forgot-password/route.ts
│   │   ├── login/route.ts          [RATE_LIMITED]
│   │   ├── logout/route.ts
│   │   ├── me/route.ts
│   │   ├── register/route.ts       [RATE_LIMITED]
│   │   └── reset-password/route.ts  [RATE_LIMITED, AUDIT_LOGGED]
│   ├── cron/cleanup/
│   ├── festival/
│   ├── festivals/[slug]/expired-results-pdf/
│   ├── health/db/
│   ├── my-festival/
│   ├── payments/
│   │   ├── history/
│   │   ├── status/
│   │   └── verify/
│   ├── profile/festivals/[slug]/expired-results-pdf/
│   ├── super-admin/
│   │   ├── analytics/
│   │   ├── payments/
│   │   └── users/[id]/, users/
│   ├── team-leader/
│   │   ├── logout/
│   │   ├── request-otp/route.ts    [RATE_LIMITED]
│   │   └── verify-otp/route.ts     [RATE_LIMITED]
│   └── upload/route.ts             [NEW - SECURE, RATE_LIMITED]
│
├── dashboard/[slug]/
│   ├── content/
│   │   ├── categories/
│   │   ├── gallery/
│   │   ├── groups/
│   │   ├── news/
│   │   └── programmes/
│   ├── festival-live/FestivalLiveClient.tsx
│   ├── members/
│   ├── notifications/
│   ├── payments/
│   ├── programmes/
│   │   ├── [programmeId]/
│   │   ├── add/
│   │   └── manage/
│   ├── schedule/
│   ├── settings/
│   └── students/
│       ├── [studentId]/
│       ├── add/
│       └── qr-scanner/
│
├── festival-setup/
└── judge/
```

---

### 2. Components (`src/components/`) - 162 items

| Category | Items | Purpose |
|----------|-------|---------|
| `about/` | 1 | About page components |
| `admin/` | 8 | Admin dashboard components |
| `auth/` | 8 | Authentication forms & flows |
| `common/` | 7 | Shared utility components |
| `contact/` | 1 | Contact page components |
| `dashboard/` | 9 | Festival dashboard components |
| `features/` | 1 | Feature showcase components |
| `festival/` | 53 | Festival-specific components |
| `festival-setup/` | 1 | Setup wizard components |
| `home/` | 5 | Homepage sections |
| `judge/` | 1 | Judge interface components |
| `layout/` | 3 | Layout wrappers |
| `pricing/` | 2 | Pricing page components |
| `profile/` | 14 | User profile components |
| `programme/` | 1 | Programme display components |
| `providers/` | 1 | Context providers |
| `services/` | 1 | Services page components |
| `student/` | 9 | Student portal components |
| `super-admin/` | 5 | Super admin components |
| `ui/` | 31 | shadcn/ui base components |

---

### 3. Library (`src/lib/`) - 36 items

| File/Folder | Purpose |
|-------------|---------|
| `api-error.ts` | API error formatting utilities |
| `app-enums.ts` | Application enums & constants |
| `auth/` | Authentication utilities (4 items) |
| `axios.ts` | Axios HTTP client config |
| `cloudinary.ts` | Cloudinary upload helper [SECURE] |
| `config.ts` | Application configuration |
| `db.ts` | Database connection (Drizzle) |
| `email.ts` | Email service integration |
| `errors.ts` | Error handling utilities |
| `features*.ts` | Feature flag system |
| `festival-public-validation.ts` | Public site validation |
| `festival-status.ts` | Festival status management |
| `format-countdown-hms.ts` | Time formatting |
| `programme-*.ts` | Programme business logic |
| `qr-pdf-utils.ts` | QR code & PDF generation |
| `query-keys.ts` | React Query cache keys |
| `rate-limit.ts` | Rate limiting utility [SECURITY] |
| `razorpay.ts` | Payment gateway config |
| `results-calculator.ts` | Results computation |
| `slug.ts` | URL slug utilities |
| `sms.ts` | SMS service integration |
| `student-profile-url.ts` | Student URL generation |
| `team-leader/` | Team leader auth (3 items) |
| `tier.ts` | Subscription tier logic |
| `utils.ts` | General utilities |
| `validations/` | Zod schemas (3 items) |

---

### 4. Server (`src/server/`) - 77 items

| Folder | Items | Purpose |
|--------|-------|---------|
| `actions/` | 28 | Server Actions (Next.js) |
| `controllers/` | 2 | API controllers |
| `db/` | 2 | Database schema & types |
| `loader/` | 4 | Data loading utilities |
| `models/` | 11 | Database models (repository pattern) |
| `policies/` | 0 | Authorization policies (empty) |
| `services/` | 30 | Business logic services |

#### Server Actions (`src/server/actions/`):
- `admin.actions.ts` - Super admin operations
- `auth.actions.ts` - Authentication actions
- `festival.actions.ts` - Festival CRUD
- `payment.actions.ts` - Payment processing
- `profile.ts` - Profile management
- `team.actions.ts` - Team management
- `user-festival.actions.ts` - User-festival relationships

#### Services (`src/server/services/`):
- `audit-log.service.ts` - Audit logging
- `festival-context.service.ts` - Festival context
- `festival-lifecycle-policy.service.ts` - Lifecycle management
- `plan-expiry.service.ts` - Plan expiration
- `storage-usage.service.ts` - Storage tracking
- `team-leader-auth.service.ts` - Team leader authentication
- `usage-counter.service.ts` - Usage limits
- And 23 more...

---

### 5. Configuration (`src/config/`)

| File | Purpose |
|------|---------|
| `plan-features.config.ts` | Plan feature definitions |
| `pricing.ts` | Pricing configuration |
| `routes.ts` | Route definitions & URLs |
| `sidebar.config.ts` | Sidebar navigation |

---

### 6. Types (`src/types/`)

| File | Purpose |
|------|---------|
| `actions.ts` | Action response types |
| `festival.ts` | Festival entity types |

---

### 7. Services (`src/services/`)

| File | Purpose |
|------|---------|
| `festival.api.ts` | Festival API client |
| `payment.api.ts` | Payment API client |
| `user.api.ts` | User API client |

---

### 8. Hooks (`src/hooks/`)

22 custom React hooks including:
- `useAssignments.ts`
- `useCurrentUser.ts`
- `useFeature.ts`
- `useFestivalReadOnly.ts`
- `useFestivals.ts`
- `useMembers.ts`
- `usePayment*.ts`
- `useProgrammes.ts`
- `useStudents.ts`
- And more...

---

## 🗄️ Database Schema (Drizzle)

### Tables (30+ tables):

| Table | Purpose |
|-------|---------|
| `audit_log` | Security audit trail |
| `category` | Programme categories |
| `expired_festival_result` | Archived results |
| `festival` | Festival entities |
| `festival_lifecycle_event` | Lifecycle tracking |
| `festival_member` | Festival membership |
| `feedback` | User feedback |
| `group` | Participant groups |
| `news` | Festival news |
| `password_reset_token` | Password reset tokens |
| `payment` | Payment records |
| `photo_gallery` | Gallery images |
| `plan_expiration_alert` | Plan expiry notifications |
| `programme` | Festival programmes |
| `programme_notification` | Programme notifications |
| `programme_participant` | Programme assignments |
| `realtime_outbox` | Realtime event queue |
| `schedule_entry` | Schedule items |
| `session` | User sessions |
| `stage_assignment` | Stage assignments |
| `student` | Participant students |
| `support_ticket` | Support system |
| `team_leader_auth` | Team leader auth |
| `user` | User accounts |

### Enums:
- `CategoryType`, `FestivalStatus`, `Gender`, `GlobalRole`
- `GroupType`, `InstitutionType`, `PaymentStatus`
- `ProgrammeStatus`, `ProgrammeType`, `Tier`
- And more...

---

## 🔒 Security Features

| Feature | Implementation |
|---------|----------------|
| Rate Limiting | `src/lib/rate-limit.ts` (LRU cache) |
| Authentication | JWT with secure cookies |
| Authorization | Session-based with role checks |
| Audit Logging | `audit_log` table + service |
| Input Validation | Zod schemas |
| Password Security | bcrypt (salt 10), SHA-256 tokens |
| File Uploads | Signed Cloudinary uploads |
| Security Headers | CSP, HSTS, X-Frame-Options |

### Rate-Limited Endpoints:
- `/api/auth/login` - 5/15min
- `/api/auth/register` - 3/15min
- `/api/auth/forgot-password` - 3/15min
- `/api/auth/reset-password` - 3/15min
- `/api/team-leader/request-otp` - 5/15min
- `/api/team-leader/verify-otp` - 5/15min
- `/api/upload` - 10/hour

---

## 📦 Key Dependencies

| Category | Packages |
|----------|----------|
| Framework | next@16.1.6, react@19.2.1 |
| Database | drizzle-orm, pg |
| Auth | jose, bcryptjs |
| UI | @radix-ui/*, tailwindcss, framer-motion |
| Forms | react-hook-form, zod |
| Payments | razorpay |
| Email | resend |
| Utils | date-fns, qrcode, jspdf, xlsx |

---

## 🎯 Architecture Patterns

1. **Next.js App Router** - File-based routing with route groups
2. **Server Actions** - Form submissions & mutations
3. **Repository Pattern** - Database models in `src/server/models/`
4. **Service Layer** - Business logic in `src/server/services/`
5. **Drizzle ORM** - Type-safe database operations
6. **React Query** - Server state management
7. **Zod Validation** - Runtime type safety
8. **Middleware** - Security headers & route protection

---

## 📚 Documentation (`docs/`)

| Document | Purpose |
|----------|---------|
| `architecture/` | System architecture docs (7 items) |
| `plans/` | Plan definitions (3 items) |
| `DATABASE-MIGRATION-FIX.md` | Migration guide |
| `DEPLOYMENT.md` | Deployment instructions |
| `DESIGN_SYSTEM.md` | UI/UX guidelines |
| `PROGRAMME-REPORTING*.md` | Reporting features (4 docs) |
| `realtime-*.md` | Realtime architecture |
| `RESET-FUNCTIONALITY-IMPLEMENTATION.md` | Reset feature |
| `TEAM-REPORTING-FIXES.md` | Team reporting |

---

## 🚀 Deployment

- **Platform:** Vercel
- **Database:** PostgreSQL
- **File Storage:** Cloudinary (signed uploads)
- **Email:** Resend
- **Payments:** Razorpay
- **Analytics:** Vercel Analytics + Speed Insights

---

## 📈 Project Scale

| Metric | Value |
|--------|-------|
| Total Files | ~440 |
| Lines of Code | ~25,000+ (estimated) |
| Components | 162 |
| API Routes | 25 |
| Database Tables | 30+ |
| Server Actions | 28 |
| Services | 30 |
| Custom Hooks | 22 |

---

*Report generated automatically from codebase analysis.*
