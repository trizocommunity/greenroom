# Programme Team Lead + Full Programme Audit Trail (PRO Tier)

## Status
- **Created**: 2026-07-27
- **Status**: Partial (2026-08-05 audit) — Phases 1–2 on `develop`; 3–5 on parallel branch not yet merged; 6–9 still TODO
- **Priority**: High
- **Complexity**: Medium-High
- **Target tier**: PRO (graceful degradation on STANDARD and BASIC)
- **Implementation status (2026-07-27)**: Phases 1â€“2 (schema + migration + seed) are present on `develop`. Phases 3â€“5 (pricing flags, audit-log enum extensions, service/action layer, assignment integration) are merged on the parallel branch `issue-10-programme-team-lead-audit` (worktree `.claude/worktrees/error-handling-ui`, commit `301f496`) but **NOT YET on `develop`**. Phases 6â€“9 (frontend pickers, audit wiring, detail loader, drawer panels) are still TODO.

---

## Summary

Introduce a **programme team lead** concept â€” distinct from the existing `participant.isTeamLeader` â€” and ship a complete programme audit trail surfaced inside the programme card drawer. The new lead is collected at team-creation time inside a GROUP programme assignment (mandatory: save is blocked until exactly one lead per team is picked). The audit trail captures who/when across assignment, reporting, judging, scoring, publishing, and announcing, and is exposed to PRO-tier festivals only. STANDARD and BASIC festivals continue to see basic counts (reported/judged/scored/published) but no team-lead panel and no audit timeline.

The existing `participant.isTeamLeader` flag and its associated team-leader portal (with OTP verification) are **not touched**.

The database provider is **Neon** (per `issues/neon-database-adoption.md`). Local dev runs against the bundled docker postgres on `localhost:5433`.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | DB reset method | `pnpm db:reset` (= `db:clean && db:push && db:seed` from `package.json`); full migration re-run |
| 2 | Seed data | Modify existing `scripts/seed/programmes.ts` â€” no new seed file |
| 3 | PRO-only enforcement | Both backend and frontend |
| 4 | Tests | None for this iteration â€” manual QA only |
| 5 | Lead storage shape | New `programme_team_lead` table (DB-enforced uniqueness) |
| 6 | Is a lead required? | Mandatory â€” save blocked if missing |
| 7 | Team leader forms a team they're not on? | Yes â€” no link between portal operator and team membership |
| 8 | Lead removed from a team? | Block the delete until a replacement is appointed |
| 9 | `programme_team_lead` rows for INDIVIDUAL? | No â€” only GROUP |
| 10 | Existing `participant.isTeamLeader`? | Untouched |
| 11 | Audit-log vocabulary migrations | Enums extended in code (`audit-log.service.ts`); no migration needed for the existing row schema |
| 12 | DB schema changes | Added to BOTH `src/core/database/schema.ts` (so `db:push` includes them) AND as `drizzle/0007_programme_team_lead_and_audit_columns.sql` (for production migration history) |

---

## Problem Statement

1. **No concept of programme-level team lead.** Festival admins and team-leaders can create GROUP teams, but there's no record of which participant is the team's contact person, code-letter recipient primary, or notification target. Everything currently keys off the code letter, which is shared across the team.

2. **No programme-level audit trail.** The existing `audit_log` table only tracks `FESTIVAL`, `USER`, and `PAYMENT` actions (see `src/features/auth/services/audit-log.service.ts:7-22`). No record of: who created a programme, who published results, who opened/closed reporting, which judge submitted scores, when a team-lead was appointed/changed. The Reporting client has a partial timeline UI, but it's derivable and not stored.

3. **Tier-defined feature surface is implicit.** PRO-only behaviour is scattered across `isBasicTier` checks and curated feature tags. This issue formalizes two new PRO-only features using the existing pattern (`src/features/plan-features/services/features-tags.ts`).

4. **Programme card drawer is sparse.** `AssignmentsClient.tsx:754-1083` shows only high-level counts. No place to surface team-lead or audit-trail data consistently.

---

## Out of Scope

- Existing `participant.isTeamLeader` â€” untouched.
- Existing team-leader OTP/login flow (`src/core/auth/participant-guard.ts`, `participant-session.ts`) â€” untouched.
- Changing the GROUP result-storage model (separate planned issue).
- Audit log retention/pruning â€” none.
- Automated tests â€” manual QA only.

---

## Solution

### 1. Schema changes

**Add to `src/core/database/schema.ts`** (Track A â€” picked up by `db:push`):
- New table `programme_team_lead` with columns `id`, `programmeId` (FKâ†’programme, cascade), `groupId` (FKâ†’group, cascade), `teamNumber`, `participantId` (FKâ†’participant, cascade), `appointedBy`, `appointedByRole` (`"ADMIN" | "TEAM_LEADER"`), `appointedByName`, `appointedByEmail`, `appointedAt`, `createdAt`, `updatedAt`. Constraints: `UNIQUE (programmeId, groupId, teamNumber)`, indexes on `programmeId` and `participantId`.
- Add to `programme`: `createdByEmail`, `createdByName`, `publishedByEmail`, `publishedByName`.
- Add to `result`: `savedByEmail`, `savedByName`, `publishedByEmail`, `publishedByName`, `announcedByEmail`, `announcedByName`.

**Author matching SQL file** (Track B â€” production history):
- `drizzle/0007_programme_team_lead_and_audit_columns.sql` with identical DDL.

### 2. Feature flags

`src/config/pricing.ts`:
```ts
programmeTeamLead:    { BASIC: false, STANDARD: false, PRO: true }
programmeAuditDrawer: { BASIC: false, STANDARD: false, PRO: true }
```

`src/features/plan-features/services/features-tags.ts`:
```ts
"programme.teamLead":    { allowedTiers: ["PRO"] }
"programme.auditDrawer": { allowedTiers: ["PRO"] }
```

Frontend consumes via `useFeature("programme.teamLead")` and `useFeature("programme.auditDrawer")`. Server actions throw `AppError("FEATURE_NOT_AVAILABLE")` when `!isProTier(festival.tier)` â€” checked in every new server action AND every new feature-gated write path.

### 3. New service â€” `src/features/programme-team-leads/services/programme-team-lead.service.ts`

| Function | Behaviour | Audit log |
|---|---|---|
| `appointTeamLead(input)` | INSERT row; refuses if `programme.type !== "GROUP"`; refuses if participant not in team; refuses if a lead row already exists for the team (UI catches this earlier) | logs `APPOINT_TEAM_LEAD` |
| `replaceTeamLead(input)` | UPDATE same row's `participantId` + `appointedBy*` + `appointedAt` | logs `REPLACE_TEAM_LEAD` |
| `removeTeamLead(input)` | DELETE row; refuses if `programme.type === "GROUP"` and any member is being concurrently removed | logs `REMOVE_TEAM_LEAD` |
| `getTeamLeadForTeam({ programmeId, groupId, teamNumber })` | lookup | â€” |
| `getProgrammeTeamLeads(programmeId)` | grouped by `(groupId, teamNumber)` | â€” |

### 4. Assignment integration

`src/features/assignments/services/assignment.service.ts::assignParticipantsToProgramme` accepts a new input shape (GROUP only):
```ts
teamLeadsByTeam?: Record<`${groupId}:${teamNumber}`, participantId>
```

Validation, all inside the same transaction as the assignments INSERT:
- If programme is GROUP and any team has no lead picked â†’ throw `AppError("EACH_TEAM_MUST_HAVE_LEAD")`.
- If programme is GROUP and a picked lead is not in the team â†’ throw `AppError("LEAD_NOT_IN_TEAM")`.
- INSERT each `programme_team_lead` row.
- Logs `ASSIGN_PARTICIPANTS` + `APPOINT_TEAM_LEAD` per team.

`src/features/assignments/repositories/assignment.repository.ts::deleteAssignment` and the team-removal path at `assignment.service.ts:316-326` get an early check:
- If programme is GROUP and the assignment's `(groupId, teamNumber)` matches a `programme_team_lead` row:
  - If the deleted participant IS the lead and the team has only one remaining member â†’ return `{ ok: false, reason: "TEAM_WOULD_BE_EMPTY" }`.
  - If the deleted participant IS the lead and the team has other members â†’ require caller to pass `replacementLeadParticipantId`; if missing, return `{ ok: false, reason: "LEAD_MUST_BE_REPLACED", teamContext }`.
- Logs `REMOVE_ASSIGNMENT`.

### 5. Audit log vocabulary

Extend `src/features/auth/services/audit-log.service.ts`:
```ts
// New AuditAction values
"CREATE_PROGRAMME" | "UPDATE_PROGRAMME" | "DELETE_PROGRAMME"
"ASSIGN_PARTICIPANTS"  | "REMOVE_ASSIGNMENT"
"APPOINT_TEAM_LEAD" | "REPLACE_TEAM_LEAD" | "REMOVE_TEAM_LEAD"
"OPEN_REPORTING"   | "CLOSE_REPORTING"
"MARK_REPORTED"
"ISSUE_CODE_LETTER"
"SUBMIT_JUDGE_SCORES"
"SAVE_RESULT" | "PUBLISH_RESULTS" | "ANNOUNCE_RESULTS"

// New TargetType values
"PROGRAMME" | "PROGRAMME_ASSIGNMENT" | "PROGRAMME_TEAM_LEAD"
| "REPORTING_SESSION" | "JUDGEMENT_SCORE" | "RESULT"
```

Wiring locations (each calls `createAuditLog(...)` once per event):

| File | Events logged |
|---|---|
| `src/features/programmes/actions/programme.actions.ts` | CREATE/UPDATE_PROGRAMME |
| `src/features/assignments/services/assignment.service.ts` | ASSIGN_PARTICIPANTS, REMOVE_ASSIGNMENT |
| `src/features/programme-team-leads/services/programme-team-lead.service.ts` (new) | APPOINT/REPLACE/REMOVE_TEAM_LEAD |
| `src/features/programmes/services/programme-reporting.service.ts` | OPEN/CLOSE_REPORTING, MARK_REPORTED |
| `src/features/programmes/services/code-letter-generator.service.ts` | ISSUE_CODE_LETTER |
| `src/features/judgement/actions/judgement.actions.ts` | SUBMIT_JUDGE_SCORES |
| `src/features/results/actions/results.actions.ts` | SAVE_RESULT |
| `src/features/results/actions/publish-result.actions.ts` (or wherever bulk publish lives) | PUBLISH_RESULTS |
| `src/features/announcement/actions/announcement.actions.ts` | ANNOUNCE_RESULTS |

The existing `/super-admin/audit-logs` page already renders every entry in a flat table â€” no UI work needed there.

### 6. Programme detail loader â€” `src/features/programmes/loaders/programme-detail.loader.ts`

Single call site:
```ts
getProgrammeDetailForDrawer(programmeId): {
  programme: { id, name, type, createdByEmail, createdByName,
               publishedByEmail, publishedByName, publishedAt, ... },
  counts: { totalAssigned, reported, judged, scored, published, announced },
  reportingSession: { startedAt, startedByName, endedAt, endedByName } | null,
  judgingSession:   { judges, completedAt, scoreCount } | null,
  results:          { savedAt, savedByName, publishedAt, publishedByName,
                      announcedAt, announcedByName },
  teamLeads:        { [groupId]: { [teamNumber]: { participantId, participantName, chestNumber } } },
  auditTimeline:    Array<{ at, action, actorName, actorEmail, targetType, targetId }>,
}
```

Implemented as parallel `Promise.all` of indexed queries â€” no transaction needed (the loader is read-only).

### 7. Programme drawer UI

Three panels appended to the existing drawer at `AssignmentsClient.tsx:754-1083`:

- **Panel A â€” Summary (always visible).** Reporting started/closed (with names), reported count; judging started/completed, scored count; results saved/published/announced (with names).
- **Panel B â€” Programme Team Leads** (`useFeature("programme.teamLead") && programme.type === "GROUP"`). Per team: members list with lead badge (`Alice (#123) Â· LEAD`), code letters assigned.
- **Panel C â€” Audit Timeline** (`useFeature("programme.auditDrawer")`). Reverse-chronological audit-log entries scoped to this programme (action label, actor name + email, timestamp).

### 8. Frontend touchpoints (lead picker)

- `src/components/participant/team-leader/AssignProgrammesClient.tsx` â€” lead picker inline below each team box; save disabled until selection made.
- `src/components/festival/pre-event-works/assignments/AssignmentsClient.tsx` â€” same picker in admin team-creation flow; lead badge in the team row.
- All wrapped with `useFeature("programme.teamLead")`.

---

## Phased Implementation Order

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| 1 | **DB reset seed update** | Modify `scripts/seed/programmes.ts` GROUP branch to insert one `programme_team_lead` per team. Run `pnpm db:reset`. | `psql \d programme_team_lead`; seed summary lists â‰¥1 team leads |
| 2 | **Migration** | Track A: add `programme_team_lead` table + audit columns to `src/core/database/schema.ts`. Track B: author `drizzle/0007_programme_team_lead_and_audit_columns.sql` matching. Run `drizzle-kit push`. | Schema visible; SQL file matches |
| 3 | **Feature flags** | Two new flags in `pricing.ts`; two tags in `features-tags.ts`; `useFeature` returns false on STANDARD/BASIC, true on PRO. | Manual tier switch |
| 4 | **Audit log vocabulary** | Add enum values in `audit-log.service.ts`. No callers yet. | TS compiles |
| 5 | **Programme team lead â€” backend** | `programme-team-lead.service.ts` + actions; integration into `assignParticipantsToProgramme`; delete-block in repository. | Manual: assign team without lead â†’ error; with lead â†’ success |
| 6 | **Programme team lead â€” frontend** | Lead picker in `AssignProgrammesClient.tsx` and `AssignmentsClient.tsx`; lead badge in drawer. | Manual: form behaviour |
| 7 | **Audit log wiring** | `createAuditLog(...)` calls added in 9 files listed above. | Manual: trigger each event, verify `audit_log` rows |
| 8 | **Programme detail loader** | `getProgrammeDetailForDrawer(programmeId)`. | Manual: fetch by id, inspect shape |
| 9 | **Programme drawer UI** | Panels A (always), B (PRO lead, GROUP only), C (PRO audit). | Manual: PRO shows all 3; STANDARD shows only A |

Each phase = own branch + commit. Review at each step.

---

## Files Touched

### New
- `drizzle/0007_programme_team_lead_and_audit_columns.sql`
- `src/features/programme-team-leads/services/programme-team-lead.service.ts`
- `src/features/programme-team-leads/actions/programme-team-lead.actions.ts`
- `src/features/programmes/loaders/programme-detail.loader.ts`

### Modified
- `scripts/seed/programmes.ts` â€” insert `programme_team_lead` rows in GROUP branch
- `src/core/database/schema.ts` â€” add `programme_team_lead` + audit columns on `programme`/`result`
- `src/config/pricing.ts` â€” two new flags
- `src/features/plan-features/services/features-tags.ts` â€” two new tags
- `src/features/auth/services/audit-log.service.ts` â€” new enum values
- `src/features/assignments/services/assignment.service.ts` â€” accept `teamLeadsByTeam`, transactional lead insert, delete-block, audit call
- `src/features/assignments/repositories/assignment.repository.ts` â€” delete-block, audit call
- `src/components/participant/team-leader/AssignProgrammesClient.tsx` â€” lead picker
- `src/components/festival/pre-event-works/assignments/AssignmentsClient.tsx` â€” admin lead picker + 3 drawer panels
- 9 backend files listed in Â§"Audit log vocabulary" (audit-log wiring only)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `db:reset` accidentally drops shared data | All destructive commands require explicit invocation; no automation outside user action |
| `db:push` is not the same as `db:generate` + apply | We hand-author the SQL file for production history; dev uses `db:push` |
| Audit log grows unbounded | Accepted this iteration; retention ruled out of scope |
| `deleteAssignment` cascade surprises team leads | Pre-check returns structured error before SQL delete â€” no constraint-violation leaks |
| Lead insert fails when team doesn't exist yet | Insert order: assignments first, then `programme_team_lead` in same transaction |
| Drawer becomes slow with audit timeline | Loader uses indexed queries; pagination deferred |
| Feature flag changes break existing flows | New flags default to `false` everywhere except PRO â€” safe rollout |

---

## Manual QA Checklist

After Phase 9, manually verify:

1. `pnpm db:reset` produces expected seed (1 PRO festival, 3 groups Ã— 5 participants, 2 leaders each, GROUP programmes with leads).
2. PRO festival: assign a new GROUP programme with 2 teams â€” both save only after picking a lead.
3. PRO festival: try to delete the lead from a 1-member team â€” error appears, deletion refused.
4. PRO festival: replace the lead on a multi-member team â€” succeeds, drawer shows the new lead.
5. PRO festival: drawer shows all 3 panels with content.
6. STANDARD festival: lead picker hidden; drawer shows only Panel A.
7. BASIC festival: drawer shows only Panel A; no audit-trail entries written for tier-gated actions.
8. Audit log entries present for: programme create, assignment, team-lead appoint/replace, reporting open/close, code-letter issue, judge submit, result save/publish/announce.
9. New entries appear in `/super-admin/audit-logs` without further UI changes.
10. `participant.isTeamLeader` and the team-leader OTP portal still work exactly as before.

---

## References

- Tier helpers: `src/features/plan-features/services/tier.ts`
- Existing audit log: `src/features/auth/services/audit-log.service.ts`, `src/core/database/schema.ts:128`
- Existing super-admin audit-logs page: `src/app/(admin)/super-admin/audit-logs/page.tsx`
- Existing drawer: `src/components/festival/pre-event-works/assignments/AssignmentsClient.tsx:754-1083`
- Existing team-leader portal: `src/components/participant/team-leader/AssignProgrammesClient.tsx`
- DB client (Neon pooled): `src/core/database/client.ts`
- Drizzle config (Neon unpooled for migrations): `drizzle.config.ts`
- DB scripts: `package.json:15-25`
- Existing seed: `scripts/seed.ts` and `scripts/seed/programmes.ts`
- Related database infra decision: `issues/neon-database-adoption.md`
- Separate planned issue: GROUP result-row collapse (out of scope for this issue)
