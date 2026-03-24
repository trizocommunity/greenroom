# Programme Reporting + Centralized Notifications

For a **full end-to-end** description (data model, GROUP vs individual, plan gating, file map), see [`programme-reporting-complete.md`](./programme-reporting-complete.md).

## Overview

This workflow adds a live reporting lifecycle before judgement for `STANDARD` festivals:

1. Stage manager starts reporting for a scheduled programme.
2. Assigned students and team leaders receive live notifications.
3. Stage manager marks reported participants.
4. 5-minute reporting window is tracked by session metadata.
5. Stage manager closes reporting, session becomes locked.
6. For each close, reported students receive **sequential letters** `A`, `B`, `C`, … (then `AA`, `AB`, … beyond 26). **Which student gets which letter** is **random** (shuffled order); the multiset of codes is always that alphabet block for the batch. Each pair is stored as one `ProgrammeCodeLetter` + recipient; `code` is unique **per reporting session**, not globally.
7. Students/leaders see ongoing sessions and notifications without refresh.

## Core Domain Models

- `ProgrammeReportingSession`
  - Source of truth for reporting lifecycle.
  - Tracks status, window, actor metadata, lock state.
- `ProgrammeReportedParticipant`
  - Participant attendance rows linked to assignment.
- `ProgrammeCodeLetter`
  - One row per reported student at close. `code` is `A`/`B`/… within that session (`@@unique([reportingSessionId, code])`). Legacy rows may still exist from the old global-unique `code` constraint.
- `ProgrammeNotification`
  - In-app notification record for student/user recipients.

## State Machine

- `NOT_STARTED -> IN_PROGRESS` (`start`)
- `IN_PROGRESS -> RESET` (`stop/reset` — user-facing: **reporting closed**, no codes)
- `IN_PROGRESS -> CLOSED` (`submit/close` — user-facing: **reporting ended**, codes issued)
- `RESET -> IN_PROGRESS` (`start` again)

`CLOSED` sessions are locked (`isLocked=true`).  
Lock is released when related schedule entry changes.

## Centralized Notification Service

`NotificationService.dispatch` accepts:

- `eventType`
- `festivalId`
- `targets` (programme/student based)
- `context` (title/body/payload)
- `channels` (`IN_APP`, `REALTIME`, `EMAIL`)

Responsibilities:

- Resolve recipients from assignments + leader groups.
- Persist in-app notification rows.
- Emit realtime events via in-process stream bus.
- Send leader emails via email provider integration.

## Realtime Delivery

- SSE endpoint: `/api/realtime/notifications?studentId=<id>`
- Event source: `RealtimeNotificationBus`
- Client hook subscribes and invalidates notification queries.
- Polling fallback remains active for resilience.

## UI Surfaces

- Dashboard: `event-works/reporting` for stage managers (Standard+ only; gated by the `schedule` plan feature, same as Basic having no schedule/stage tools).
- Student notifications page.
- Team leader notifications page.
- Student and leader dashboards show current/ongoing programme reporting when relevant; students see **their** code via letter+recipient lookup (not a single programme-wide code).
- Stage manager Live Reporting UI: before start, only programme details + Start; while live, Stop/Submit + roster; when closed, read-only roster with per-row codes.

## Integration Notes

- `CODE_LETTER_ISSUED` for GROUP programmes uses title “Team code issued” and body “Your team’s code is …”. Individual programmes keep “Code letter” wording.
- Group programme enrollments: `AssignmentService.bulkCreate` requires an explicit integer `teamNumber` (≥ 1) on each row; `AssignmentService.create` for a student on a GROUP programme requires `teamNumber` as well.
- Schedule updates/unlinks invoke reporting unlock by `scheduleEntryId`.
- Reporting status updates use explicit writes (`REPORTING`, `ENDED`) without replacing existing schedule/assignment structure.
- Existing support notifications remain separate and unaffected.
