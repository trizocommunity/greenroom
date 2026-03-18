# STANDARD Plan Workflow (Codebase Walkthrough)

This document explains the end-to-end workflow for a **STANDARD** festival plan and maps each stage to the main **project structure**: where the UI lives, what the server does, how data flows, and why that step exists.

---

## 1. Big picture: how the app is structured

### UI routes (what you click)

- Pages live in `src/app/dashboard/[slug]/...`
- “Client” interactive UIs live in `src/components/festival/pre-works/...` (Pre-Works) and `src/components/dashboard/event-works/...` (Event-works).

### Server actions + services (what the app validates and persists)

- Server mutations/reads are under `src/server/actions/...`
- Business rules live in `src/server/services/...`
- Data access helpers live in `src/server/models/...`

### Database (what is stored)

Key Prisma models in `prisma/schema.prisma`:

- `Group`, `Student`, `Category`
- `Programme` and `ProgrammeAssignment`
- `Stage` and `ScheduleEntry`
- `Result`

---

## 2. Standard plan: what features matter in the workflow

Compared to BASIC, STANDARD enables the “full pipeline”:

- Pre-Works scheduling stack: `Stage Management`, `Schedule`, `Sessions`
- Event-works results stack: `Marks`, `Results`, `Leaderboard`

In the codebase, this gating is primarily enforced via:

- `src/server/services/plan-features.service.ts` (`getEffectiveFeatureEnabled`)
- `src/config/pricing.ts` (`TIER_CONFIG.STANDARD`)
- Sidebar/page gating via `src/components/common/FeatureGate.tsx` and server redirects/not-found.

---

## 3. End-to-end workflow (the exact journey)

Your current mental flow is correct; here is the “where/what/how/why” mapping.

### Step A: Create Groups → Categories → Students


| Where                                                                                | What                                                     | How it works (code path)                                                                                                         | Why                                                                                      |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/app/dashboard/[slug]/pre-works/groups/page.tsx` + `src/components/.../groups/`* | Create `Group` entities                                  | UI -> server actions (`src/server/actions/...`) -> Prisma models/services (`src/server/services/*`, `src/server/models/*`) -> DB | Groups are required for student/team membership and for filtering/assignment constraints |
| `src/app/dashboard/[slug]/pre-works/categories/page.tsx` + categories UI             | Create `Category`                                        | Same pattern: UI -> actions -> services/models -> Prisma                                                                         | Categories define programme type grouping and validation for assignments                 |
| `src/app/dashboard/[slug]/pre-works/students/page.tsx` + students UI                 | Create `Student` and link them to `Group` and `Category` | Server validates festival access/expiry and writes to `Student`                                                                  | Students are the participants used in `ProgrammeAssignment`                              |


---

### Step B: Create Programmes (tie to Category)


| Where                                                                                        | What                                                                               | How it works                                                                      | Why                                                                                 |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/app/dashboard/[slug]/pre-works/programmes/page.tsx` + `src/components/.../programmes/*` | Create `Programme` with `categoryId`, `type` (INDIVIDUAL/GROUP), stageType, limits | `createProgrammeAction` -> `ProgrammeService.create` -> `prisma.programme.create` | Programmes are the “events/competitions” that later receive assignments and results |
| Status badge on the programmes list                                                          | Show programme lifecycle badge                                                     | UI reads `programme.status` and renders `ProgrammeStatusBadge`                    | Helps users understand why a programme does/doesn’t appear in Event-works           |


Code references:

- Programmes UI: `src/components/festival/pre-works/programmes/ProgrammesClient.tsx`
- Programme status badge: `src/components/festival/ProgrammeStatusBadge.tsx`
- Status lifecycle logic: `src/server/services/programme-status.service.ts`

---

### Step C: Assign Students/Teams to Programmes (ProgrammeAssignment)


| Where                                                                                          | What                              | How it works                                                                                              | Why                                                                                    |
| ---------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/app/dashboard/[slug]/pre-works/assignments/page.tsx` + `src/components/.../assignments/*` | Create `ProgrammeAssignment` rows | UI -> server actions -> `AssignmentService.create/update/delete` -> Prisma write to `ProgrammeAssignment` | Assignments are the “participant list” required to calculate and publish marks/results |


How Standard plan status is maintained:

- After assignments are created/updated/deleted, we recompute programme status:
  - Implemented in `src/server/services/assignment.service.ts`
  - Calls `updateProgrammeStatus(programmeId)`

Why this matters:

- `Programme.status` drives Event-works visibility and the new empty-state instructions.

---

### Step D: Create Stages + Build the Schedule (ScheduleEntry)


| Where                                                                         | What                                                                   | How it works                                                                                                                        | Why                                                                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/app/dashboard/[slug]/pre-works/stage-management/page.tsx`                | Create `Stage`                                                         | UI -> actions/services -> Prisma `Stage`                                                                                            | Stages are the venue where programme entries can be scheduled                         |
| `src/app/dashboard/[slug]/pre-works/schedule/page.tsx` + `ScheduleClient.tsx` | Add programmes to schedule (creates `ScheduleEntry` of type PROGRAMME) | `createScheduleEntry/updateScheduleEntry/deleteScheduleEntry` in `src/server/actions/schedule.actions.ts` -> Prisma `ScheduleEntry` | Schedule is what unlocks Event-works on STANDARD/PRO (programmes must be “scheduled”) |


Status lifecycle linkage:

- When a schedule entry is created/updated/deleted for a programme, we recompute status in:
  - `src/server/actions/schedule.actions.ts`
  - Calls `updateProgrammeStatus(programmeId)`

---

### Step E: Marks → Results → Publish


| Where                                                   | What                                        | How it works                                                                            | Why                                                      |
| ------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/app/dashboard/[slug]/event-works/marks/page.tsx`   | Enter marks and scoring                     | Marks UI writes `Result` rows linked to `ProgrammeAssignment`                           | Results are stored per assignment and become publishable |
| `src/app/dashboard/[slug]/event-works/results/page.tsx` | View programme results (explore/management) | `ResultsManagementClient` / `ResultsExploreClient` read from prisma `Result`            | Users review computed outcome per programme              |
| `src/server/actions/results.ts`                         | Publish/unpublish                           | `bulkPublishProgrammeResults` updates `Result.isPublished` and updates programme status | Publication defines what is shown in public Event-works  |


Code references:

- Results actions: `src/server/actions/results.ts`
- Programme status update on results: `src/server/actions/results.ts` calls `updateProgrammeStatus(programmeId)`

---

### Step F: Leaderboard (publish standings)


| Where                                                       | What                   | How it works                                                                                | Why                                                                          |
| ----------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/app/dashboard/[slug]/event-works/leaderboard/page.tsx` | Display final rankings | Leaderboard reads from `festival.results` + `programme.status` gating + `LeaderboardClient` | Leaderboard depends on published results and on what programmes are “passed” |
| Publish action                                              | Make standings live    | `publishTeamStandings` writes `festival.teamStandings`                                      | Keeps leaderboard stable and shareable                                       |


How STANDARD/PRO gating is enforced:

- `src/server/services/programme-status.service.ts` defines which statuses count as “Event-works passed”
- Event-works pages filter programmes accordingly and show the correct instruction when empty.

---

## 4. Why programme status + gating is essential (the “why” behind the system)

Without a programme lifecycle:

- a programme might appear in Event-works before it is scheduled (STANDARD/PRO)
- results might be confusing because no programme has reached the proper stage

With status:

- STANDARD/PRO users see programmes in Event-works only when they reach the required milestone (Scheduled or later)
- empty states explain the missing requirement and provide a direct CTA back to the right Pre-Works page.

---

## 5. Quick index of “where” to look in the codebase

- Pre-Works pages: `src/app/dashboard/[slug]/pre-works/*`
- Pre-Works UI clients:
  - `src/components/festival/pre-works/groups/*`
  - `src/components/festival/pre-works/students/*`
  - `src/components/festival/pre-works/programmes/*`
  - `src/components/festival/pre-works/assignments/*`
  - `src/components/festival/pre-works/stage-management/*`
  - `src/components/festival/pre-works/schedule/*`
- Event-works pages:
  - `src/app/dashboard/[slug]/event-works/marks/page.tsx`
  - `src/app/dashboard/[slug]/event-works/results/page.tsx`
  - `src/app/dashboard/[slug]/event-works/leaderboard/page.tsx`
- Status lifecycle logic:
  - `src/server/services/programme-status.service.ts`
  - updated from assignments/schedule/results

