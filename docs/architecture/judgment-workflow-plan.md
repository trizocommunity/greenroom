# Judgment workflow — aligned with codebase

How **judgment** works **after programme reporting**: lifecycle statuses, status recompute, external judge links, and where to change code.

---

## Product story (target)

1. **Reporting finished** — attendance closed; code letters issued; programme is **ready for judgment** (marks / scores).
2. **Judgment in progress** — programme status `**STARTED`**: stage manager can create judge links; external judge may submit scores.
3. **Judgment complete (scores in, not necessarily public)** — programme status `**ENDED`** when every **reported** participant has a **result** (typically draft / unpublished).
4. **Leaderboard / public** — standings that respect `**isPublished`**; bulk publish moves programme to `**PUBLISHED**` when appropriate.

---

## Programme statuses (`ProgrammeStatus`)

Rough lifecycle:

`READY` → `ASSIGNED` → `SCHEDULED` → `REPORTING` → `STARTED` → `ENDED` → `PUBLISHED`

(`RESET` and `**JUDGED**` still exist on the enum and in Event Works filters; see below.)


| Status          | How it is reached (high level)                                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `**REPORTING**` | Stage manager **starts** reporting — `[programme-reporting.service.ts](../../src/features/programmes/services/programme-reporting.service.ts)` `start`.                                                                                                                  |
| `**STARTED`**   | Stage manager **Submit & Close** reporting — same file `close()`: locks session, requires code letters for every **reported** participant, sets programme `**STARTED`**, notifies (“ready for judgment”).                                                                |
| `**ENDED**`     | After external (or internal) scoring: when `**updateProgrammeStatus**` runs and there is a **closed** reporting session, and **every reported participant** has a **result**, but not all of those results are **published** yet.                                        |
| `**PUBLISHED`** | All results for **reported** participants are published (closed-session path), or bulk publish / `setProgrammePublished` as applicable.                                                                                                                                  |
| `**JUDGED`**    | **Not** set on the “closed reporting + external judge” path. It comes from `**updateProgrammeStatus`** when there is **no** closed reporting session and **every assignment** has a result (fallback branch), and from some unpublish paths via `setProgrammePublished`. |


---

## `updateProgrammeStatus` (two branches)

`[programme-status.service.ts](../../src/features/programmes/services/programme-status.service.ts)` `updateProgrammeStatus(programmeId, reportingSessionId?)`:

### A. Closed reporting session exists

Uses the **latest closed** `ProgrammeReportingSession` for the programme (or the one passed as `reportingSessionId` if it matches).

Status is derived only from **participants recorded on that session** (`programmeReportedParticipant`) and **results** tied to those assignments:

- Default: `**STARTED`**.
- If `reportedTotal > 0` and every reported assignment has a published result → `**PUBLISHED**` (sets `publishedAt`).
- Else if `reportedTotal > 0` and every reported assignment has a result → `**ENDED**`.
- If `**reportedTotal === 0**`, the `> 0` guards prevent jumping to `**ENDED**` / `**PUBLISHED**`; status stays `**STARTED**`.

`**JUDGED` is not used here.** “All scores in for reported rows” maps to `**ENDED`**, not `**JUDGED**`.

### B. No closed reporting session

Legacy / non-reporting flow: derives `**SCHEDULED**`, `**ASSIGNED**`, `**JUDGED**`, `**PUBLISHED**` from assignments, schedule entries, and results (see file for full conditions).

So: `**STARTED**` / `**ENDED**` are **not** overwritten by `**SCHEDULED`** when a closed session exists and this function is invoked with that programme state—**provided** the closed-session branch runs (it runs first whenever a closed session exists).

---

## External judgment flow


| Step                     | Code                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Judgment dashboard       | `[src/app/dashboard/[slug]/event-works/judgment/page.tsx](../../src/app/dashboard/[slug]/event-works/judgment/page.tsx)` — feature `**eventWorks.judgmentUI`**.                                                                                                                                                                     |
| Board data               | `[programme-judgment-board.service.ts](../../src/features/programmes/services/programme-judgment-board.service.ts)`: `**STARTED**` → “programmes to judge” (by stage); `**ENDED**` or `**PUBLISHED**` → “judged” history.                                                                                                           |
| Create judge link        | `[programme-judging.actions.ts](../../src/features/programmes/actions/programme-judging.actions.ts)` `createProgrammeJudgeLinkAction` — requires `**STARTED**`, closed reporting session, code letters; feature `**eventWorks.externalJudging**`. Revokes any other **open** judge session for that programme (single active link). |
| Judge opens / submits    | Same file: open lock + `submitProgrammeJudgeSessionAction` — writes `**result`** rows with `**isPublished: false**`, then `**updateProgrammeStatus(programmeId, reportingSessionId)**`.                                                                                                                                             |
| Standard/Pro marks route | Redirects to judgment — `[marks/page.tsx](../../src/app/dashboard/[slug]/event-works/marks/page.tsx)`.                                                                                                                                                                                                                              |


**Two feature flags:** `**eventWorks.judgmentUI`** (page) vs `**eventWorks.externalJudging**` (server actions). They can diverge; keep them aligned per product.

### Results data after judge submit

- **Code letters in Results / Marks** come from **`enrichProgrammesAssignmentsResultCodeLetters`** (latest closed reporting session → `programme_code_letter` + recipients), not a column on `result`, so the DB stays aligned even when migrations are out of sync.
- Immediately after upserting scores for all code-letter recipients, the server **deletes every other `result` row for that programme** (assignments not touched by that submission). That removes stale manual or old marks on non-reported rows so the programme cannot show a mix of “judged” and “not judged” scores.

---

## Leaderboard and public

- Event Works / leaderboard programme lists use `**isProgrammeInEventWorks**` (Standard includes `**STARTED**`, `**ENDED**`, `**JUDGED**`, `**PUBLISHED**`, etc.).
- **Standing / points** that should mirror “public” behaviour use results where `**isPublished`** is true — draft judge submissions do not move public standings until publish.
- **Bulk publish** (`results` actions) sets results published and can drive programme `**PUBLISHED`** via `**setProgrammePublished**` (plus revalidation, including judgment paths).

---

## Optional product follow-ups

- **Leaderboard “soon”** — decide whether `**ENDED`** programmes with unpublished marks show placeholders, hide until publish, or staff-only draft views (`leaderboard` services / `LeaderboardClient`).
- **Naming** — if `**JUDGED`** vs `**ENDED**` confuses operators, consider documentation-only clarification or a future enum/UI cleanup (larger change).

---

## Files checklist


| Area                            | Files                                                                                                                                                                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reporting close → `**STARTED**` | `[src/features/programmes/services/programme-reporting.service.ts](../../src/features/programmes/services/programme-reporting.service.ts)` (`close`)                                                                                                                                     |
| Status recompute                | `[src/features/programmes/services/programme-status.service.ts](../../src/features/programmes/services/programme-status.service.ts)` (`updateProgrammeStatus`, `setProgrammePublished`)                                                                                                  |
| Judgment UI / board             | `[judgment/page.tsx](../../src/app/dashboard/[slug]/event-works/judgment/page.tsx)`, `[programme-judgment-board.service.ts](../../src/features/programmes/services/programme-judgment-board.service.ts)`, `[JudgmentClient](../../src/components/dashboard/judgment/JudgmentClient.tsx)` |
| Judge actions                   | `[programme-judging.actions.ts](../../src/features/programmes/actions/programme-judging.actions.ts)`                                                                                                                                                                                     |
| Results & publish               | `[src/features/results/actions/results.actions.ts](../../src/features/results/actions/results.actions.ts)`, `Result` / `isPublished`                                                                                                                                                     |
| Event Works eligibility         | `[programme-status.service.ts](../../src/features/programmes/services/programme-status.service.ts)` (`getAllowedEventWorksStatuses`, etc.)                                                                                                                                               |
| Sidebar / plan features         | `[sidebar.config.ts](../../src/config/sidebar.config.ts)`, `[features-tags.ts](../../src/features/plan-features/services/features-tags.ts)`                                                                                                                                              |
| Related docs                    | `[programme-reporting-complete.md](./programme-reporting-complete.md)` if reporting close semantics are described there                                                                                                                                                                  |


---

## One-line summary

**Reporting close** sets `**STARTED`**; **external judge** submits draft **results**; `**updateProgrammeStatus`** (closed-session path) moves to `**ENDED**` when every **reported** participant is scored, then `**PUBLISHED`** when all those results are published — `**JUDGED**` is for other flows, not this path.