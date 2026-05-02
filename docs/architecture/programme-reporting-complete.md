# Programme reporting — end-to-end (simple guide)

This document describes **programme reporting** as implemented in the codebase: what it does, how data flows, and where the main code lives. Wording is kept short and plain.

---

## What it is

**Programme reporting** is the step **before judgement** where a **stage manager** runs a live “who showed up?” window for a **scheduled programme**. They tick who is **reported**, then either **stop without codes** or **submit and issue codes** (A, B, C…). Students and team leaders get **notifications**; students get **code letters** after a successful close.

---

## Who can use it

| Area | Rule |
|------|------|
| **Dashboard UI** | Festival roles: `OWNER`, `ADMIN`, `STAGE_MANAGER`, or `SUPER_ADMIN` (see `event-works/reporting/page.tsx`). |
| **Server actions** | Same access via `assertStageManagerAccess` in `programme-reporting.actions.ts` (also allows owner/super-admin paths). |
| **Plan** | Requires the **`schedule`** feature (`getEffectiveFeatureEnabled(tier, "schedule")`). Basic tier typically has `schedule: false`; the reporting page returns **404** if the feature is off. |
| **Sidebar** | The **Reporting** nav item is hidden when `canManageSchedule` is false (`FestivalDashboardSidebar.tsx`). |

---

## Main route

- **Stage manager board:** `/dashboard/[slug]/event-works/reporting`
- Implementation: `src/app/dashboard/[slug]/event-works/reporting/page.tsx` + `ProgrammeReportingClient.tsx`

---

## Database (Prisma)

| Model | Role |
|-------|------|
| **`ProgrammeReportingSession`** | One row per **schedule entry** (`@@unique([scheduleEntryId])`). Holds status, times, 5‑minute window end, lock flag. |
| **`ProgrammeReportedParticipant`** | One row per **reported** assignment in that session (links `assignmentId`, optional `studentId`, `groupId`, `teamNumber`). |
| **`ProgrammeCodeLetter`** | Issued **on close**; has `code` (unique per session). |
| **`ProgrammeCodeLetterRecipient`** | Links each letter to **students** who should see that code. |
| **`ProgrammeNotification`** | In-app rows for students; event types include `REPORTING_*`, `CODE_LETTER_ISSUED`, `PROGRAMME_STATUS_CHANGED`. |

Statuses: `NOT_STARTED` → `IN_PROGRESS` → `RESET` **or** `CLOSED`. See `ProgrammeReportingStatus` in `schema.prisma`.

---

## Lifecycle (simple)

1. **List board** — `listByFestival` loads schedule entries that have assigned programmes; each entry has at most one reporting session (latest) with reported rows and code letters.
2. **Start** — Creates session if missing; sets `IN_PROGRESS`, `windowEndsAt` = now + **5 minutes**, sets programme status to **`REPORTING`**, notifies assigned students + team leaders (`REPORTING_STARTED`, `PROGRAMME_STATUS_CHANGED`).
3. **Mark** — Stage manager toggles assignments (single or bulk). Rows go into `ProgrammeReportedParticipant` with `groupId` / `teamNumber` copied from the assignment. Affected students get `REPORTING_PARTICIPANT_MARKED`.
4. **Stop / Reset** — Sets session to **`RESET`**, clears the window, programme back to **`SCHEDULED`**. User-facing copy: **“Reporting closed”** — no codes (`REPORTING_RESET`).
5. **Submit / Close** — Only from **`IN_PROGRESS`**. Session becomes **`CLOSED`**, **locked**, codes created, programme status **`STARTED`** (ready for judgment / external marks). User-facing: **“Reporting ended”**. Broad notifications + `PROGRAMME_STATUS_CHANGED` (“ready for judgment”) + per-student `CODE_LETTER_ISSUED`.
6. **Schedule change** — `unlockByScheduleEntryChange` sets locked sessions back to **unlocked** + status **`RESET`** when the schedule entry is edited (see `schedule.actions.ts`).

---

## GROUP vs INDIVIDUAL programmes

- **INDIVIDUAL** — Each **reported student** is one unit. At close, reported students are **shuffled**; each gets the next letter **A, B, C, …** (one letter row + one recipient per student).
- **GROUP** — Reported rows are grouped by **`(groupId, teamNumber)`** (legacy single-student rows use a per-student key). **Teams** are shuffled; **one code letter per team**, and **every student in that team** is attached as recipients of the same letter. All members of a team see the **same** code.

Validation: GROUP assignments must have `teamNumber >= 1`; INDIVIDUAL must not use “extra” team slots in a way the service rejects (see `markParticipant` / `markParticipantsBulk`).

---

## Codes (letters)

- Generated with **`sequentialAlphabetCode`** (spreadsheet-style: 1→A, 26→Z, 27→AA, …).
- **Order of which team/person gets which letter** is **random** (shuffle), but the multiset of codes is always that sequence for the number of teams or students reported.
- **`getCodeForStudentFromLetters`** (`src/lib/programme-reporting-code.ts`) finds a student’s code by scanning letter recipients — used on student and leader UIs when lists include `codeLetters` + `recipients`.

---

## Notifications and realtime

- **`NotificationService.dispatch`** resolves recipients: by `programmeId` (all assigned students) and optionally **team leaders** for groups in that programme (`includeTeamLeadersForProgramme`).
- Channels: **`IN_APP`** (DB rows), **`REALTIME`** (in-process bus per server), **`EMAIL`** (selected events).
- **SSE:** `GET /api/realtime/notifications?studentId=…` — students subscribe; **`useProgrammeNotifications`** invalidates queries on events and still **polls every 15s** as backup.

---

## Programme status ties

| Action | Programme `status` |
|--------|---------------------|
| Start | `REPORTING` |
| Reset | `SCHEDULED` |
| Close | `STARTED` |

---

## UI surfaces (where users see it)

| Surface | Purpose |
|---------|---------|
| **`ProgrammeReportingClient`** | Stage manager: start/stop/close, roster, countdown (`ReportingEndsInCountdown`), codes after close. |
| **Student** `assigned-programmes`, **home**, **leader dashboard**, **`AllProgrammesClient`** | Ongoing reporting + countdown + code via `getCodeForStudentFromLetters` / `getStudentOngoingProgrammesAction`. |
| **Stage manager hub** | Card link to `/event-works/reporting` when plan allows (`stage-manager/page.tsx`). |

---

## Key files (reference)

| Path | Purpose |
|------|---------|
| `src/features/programmes/services/programme-reporting.service.ts` | Core logic: list, start, reset, mark, bulk mark, close, unlock. |
| `src/features/programmes/actions/programme-reporting.actions.ts` | Server actions, auth, `revalidatePath` after mutations. |
| `src/features/notifications/services/notification.service.ts` | Recipient resolution and dispatch. |
| `src/server/services/realtime-notification-bus.service.ts` | Realtime fan-out. |
| `src/app/api/realtime/notifications/route.ts` | SSE stream. |
| `src/hooks/useProgrammeNotifications.ts` | Student notification hook. |
| `src/lib/programme-reporting-code.ts` | Resolve code from letters for a student. |
| `src/components/programme/ReportingEndsInCountdown.tsx` | Shared countdown UI. |
| `src/lib/format-countdown-hms.ts` | HH:MM:SS formatting for countdowns. |

---

## Related docs

For a shorter note focused on notifications and the old workflow naming, see `programme-reporting-notifications-workflow.md` in this folder. For **programme status after close** (`STARTED`) through external judgment, **`ENDED`**, and **`PUBLISHED`**, see `judgment-workflow-plan.md`. **This file** is the fuller **code-aligned** picture (GROUP teams, plan gating, and file map).
