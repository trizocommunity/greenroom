# Judgment workflow — plan (aligned with codebase)

Simple notes for setting up **judgment** after **programme reporting**: what exists today, what you described for tomorrow, and where to change code.

---

## Words you used (target story)

1. **Reporting finished** — attendance closed; code letters issued; programme is **ready for judgment** (marks / scores).
2. **Judgment in progress** — use programme status **`STARTED`** for “we are judging this programme now” (or equivalent).
3. **Judgment finished** — **end** the programme (status **`ENDED`**) as the step *after* judgment, not the same moment as reporting.
4. **Leaderboard** — ended programmes should **show up soon** on the leaderboard (product decision: with unpublished marks, with placeholders, or only after some publish rule).
5. **Public festival** — when you **publish marks** (`isPublished` on results / programme **`PUBLISHED`**), visitors see them on the public site.

---

## What the code does today

### Programme statuses (`ProgrammeStatus` in Prisma)

`READY` → `ASSIGNED` → `SCHEDULED` → `REPORTING` → `STARTED` → `ENDED` → `JUDGED` → `PUBLISHED`

- **`REPORTING`** — set when stage manager **starts** reporting (`programme-reporting.service.ts` → `start`).
- **`ENDED`** — set when stage manager **Submit & Close** reporting (`close()`). So today, **“reporting ended” and “programme ENDED” happen together.**
- **`STARTED`** — exists on the enum and is allowed in **Event Works** (`programme-status.service.ts` → `getAllowedEventWorksStatuses`), but **nothing automatically sets it** in the reporting flow.
- **`JUDGED` / `PUBLISHED`** — driven by **results**: when every assignment has a result → `JUDGED`; when all results are published → `PUBLISHED` (`updateProgrammeStatus` + `setProgrammePublished`).

### `updateProgrammeStatus` (important gap)

`updateProgrammeStatus` **only** looks at assignments, schedule, and results. It **does not** read reporting sessions. It computes:

- `PUBLISHED` / `JUDGED` from results, else  
- **`SCHEDULED`** if there is a schedule entry, else `ASSIGNED` / `READY`.

So if this runs while the programme is **`REPORTING`**, **`STARTED`**, or **`ENDED`**, it can **overwrite** those with **`SCHEDULED`** (or another lower step). It is called from **schedule** and **assignment** actions and **results** actions.

**For the judgment workflow you need either:**

- extend `updateProgrammeStatus` to **preserve** or **respect** reporting + post-reporting phases (e.g. read `ProgrammeReportingSession.status === CLOSED`, or never downgrade from `ENDED`/`STARTED` without an explicit rule), **or**
- stop calling `updateProgrammeStatus` in paths that would clobber manual / phase-driven statuses (usually the weaker option).

### Leaderboard and public

- **Dashboard / student leaderboard** filter programmes with `isProgrammeInEventWorks` (includes `ENDED`, `JUDGED`, `PUBLISHED`, etc. for Standard).
- **Standing / points** in `LeaderboardClient` use results where **`isPublished`** is true — so **unpublished marks do not affect the public-style numbers** until publish.
- **Bulk publish** (`results` actions) sets results published and calls **`setProgrammePublished`** → programme **`PUBLISHED`** — this is what ties **“publish marks”** to **public** visibility (plus revalidation paths).

---

## Suggested direction for tomorrow (implementation sketch)

Decide the **exact** state machine, then wire it in three places: **reporting close**, **judgment UI / actions**, **status recompute**.

### Option A — Minimal change to your wording

| Step | Programme status | Notes |
|------|------------------|--------|
| Reporting live | `REPORTING` | unchanged |
| Reporting closed (submit) | **`STARTED`** instead of `ENDED` | “Ready for / in judgment” — you can still use `STARTED` only while someone is actively judging if you add a second action |
| Judgment complete | **`ENDED`** | explicit action or rule (e.g. all marks saved as draft) |
| All results entered | **`JUDGED`** | existing `updateProgrammeStatus` |
| Publish | **`PUBLISHED`** | existing publish flow |

### Option B — Extra clarity

Introduce an explicit **“reporting closed, not judged”** state if you need it in the UI. That would require a **new enum value** (e.g. `READY_TO_JUDGE`) unless you overload `STARTED` for both “queued” and “live judging”.

### Leaderboard “soon”

Clarify product rule, then implement in **`leaderboard.service.ts` / `LeaderboardClient`**:

- Show programme rows for **`ENDED`** with **no scores** yet (message: “Awaiting publish”), or  
- Only show after first **published** result, or  
- Show **draft** standings only to staff (separate query).

---

## Files to touch (checklist)

| Area | Files / services |
|------|------------------|
| Reporting → next status | `src/server/services/programme-reporting.service.ts` (`close`, maybe `reset` / `start`) |
| Status recompute safety | `src/server/services/programme-status.service.ts` (`updateProgrammeStatus`) |
| Judgment / marks UI | `src/app/dashboard/[slug]/event-works/marks/page.tsx`, `ResultsManagementClient.tsx`, related actions |
| Results & publish | `src/server/actions/results.ts`, `Result` model / `isPublished` |
| Event Works eligibility | `programme-status.service.ts` (`getAllowedEventWorksStatuses`) if new statuses appear |
| Badges / copy | `ProgrammeStatusBadge.tsx`, any programme lists |
| Docs | `docs/architecture/programme-reporting-complete.md` (update if close no longer means `ENDED`) |

---

## One-line summary

**Today:** closing reporting sets **`ENDED`** immediately; **`STARTED`** is unused in automation; **`updateProgrammeStatus`** can **reset** lifecycle statuses back to **`SCHEDULED`**. **Tomorrow:** decide the exact chain **`REPORTING` → `STARTED` → `ENDED` → `JUDGED` → `PUBLISHED`**, then align **reporting close**, **judgment actions**, **status recompute**, and **leaderboard / public** rules with that chain.
