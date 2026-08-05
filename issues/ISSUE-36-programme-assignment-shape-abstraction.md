# Programme Assignment GROUP/INDIVIDUAL Join Shape — Data-Layer Abstraction

## Status
- **Created**: 2026-08-04
- **Status**: Draft
- **Priority**: High
- **Complexity**: High
- **Blocks**: accurate participant profiles, correct exports, accurate notifications, judgement team-size counts, expired-PDF winner lines, schedule team counts, poster badge category, announcer group column for INDIVIDUAL. Any feature that needs to answer "what programmes is participant X in?" reliably.

## Summary

The codebase has a recurring bug pattern caused by one architectural gap: every read path that asks "what programmes is participant X in?" or "is participant X assigned to programme Y?" hand-rolls a JOIN between `programme_assignment` and `participant`, and almost every JOIN forgets the GROUP shape. The `programme_assignment` table has an XOR invariant (GROUP rows have `groupId` set + `participantId = NULL`; INDIVIDUAL rows have `participantId` set + `groupId = NULL`) and members of a GROUP live in a separate `programme_assignment_member` table. The audit found **30+ INDIVIDUAL-ONLY sites** that miss GROUP members and **10+ GROUP-ONLY sites** that miss INDIVIDUAL direct assignments. The fix is a canonical data-layer abstraction: a normalized `EnrolledProgramme` shape, two helpers (`getProgrammesForParticipant`, `getParticipantsForProgramme`), a `participant` relation that exposes GROUP memberships, and a migration of every consumer to the new helpers.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | New module location | `src/features/assignments/services/programme-membership.service.ts` (sits next to `assignment.service.ts`) |
| 2 | Helper return shape | `EnrolledProgramme` = `{ programmeId, programme, assignmentId, memberId, groupId, teamNumber, isTeamLeader, categoryId }` — same shape for both INDIVIDUAL and GROUP |
| 3 | Backed by | UNION query of `programme_assignment.participantId = ?` (INDIVIDUAL) and `programme_assignment_member.participantId = ?` (GROUP), joined back to `programme_assignment` for parent fields |
| 4 | Relation added | `programmeAssignmentMembers: many(programmeAssignmentMember)` on `participantRelations` |
| 5 | Brand type | `EnrolledProgramme` is a nominal type (branded string) so consumers can't accidentally swap it with raw `programmeAssignment` |
| 6 | Backwards compat | Old per-consumer JOINs are deleted; the helper is the only entry point for the "all programmes for a participant" question |
| 7 | Type guards | Reuse `isIndividualAssignment` / `isGroupAssignment` at `src/features/assignments/utils/assert-assignment-shape.ts:10-46` for any consumer that needs to branch |
| 8 | Tests | Integration tests at `src/test/integration/programme-membership.test.ts` (Issue D); unit tests at `src/features/assignments/services/programme-membership.service.test.ts` (mocks the UNION) |
| 9 | Relation `participant.assignments` stays | Yes — kept for any consumer that genuinely wants INDIVIDUAL-only data (e.g. some admin filters). Helpers don't depend on it. |
| 10 | Team-lead detection | Helper joins `programme_team_lead` to populate `isTeamLeader`. Mirrors `assignment.service.ts:108-148` pattern. |

## Problem Statement

The full audit of 94+ read paths turned up:

- **30 INDIVIDUAL-ONLY sites** — join `programmeAssignment.participantId = X` and miss GROUP members
- **10 GROUP-ONLY sites** — join `programmeAssignment.groupId = X` and miss INDIVIDUAL direct assignments
- **1 broken schedule count** — `COUNT(DISTINCT teamNumber)` over-counts when multiple groups share team numbers
- **1 broken relation** — `participant.assignments = many(programmeAssignment)` resolves via `participantId` only (`src/core/database/relations.ts:174`); no relation from `participant` to `programme_assignment_member` exists

### Affected sites (consolidated)

**Public profile / participant views (5 sites — fixed via central loader):**
- `src/app/(participant)/[slug]/[participantSlug]/page.tsx:166` — "Your programmes" cards on landing page
- `src/app/(participant)/[slug]/[participantSlug]/layout.tsx:85-91` — navbar status pill
- `src/app/(participant)/[slug]/[participantSlug]/assigned-programmes/page.tsx:62` — full programme list
- `src/app/dashboard/[slug]/pre-event-works/participants/[participantSlug]/page.tsx:54-74` — admin view
- `src/components/festival/pre-event-works/participants/ParticipantProfileView.tsx:70,329-368` — assignments table

**Drawer (1 site — different bug):**
- `src/components/festival/pre-event-works/participants/ParticipantDetailsDialog.tsx:47-49` — filters by `a.participantId === participant.id`; rejects synthetic GROUP rows because spread preserves `participantId: null` on GROUP rows

**Announcer (1 site):**
- `src/features/announcement/services/announcer.service.ts:67-87,209` — Group column for INDIVIDUAL is blank because `groupName` is joined via `assignment.groupId` only. Participant column works (line 117-122 has the INDIVIDUAL fallback), Group column does not.

**Exports (2 sites):**
- `src/features/exports/services/generators/call-list.generator.ts:123-152` — inner join on `participantId` at line 135
- `src/features/exports/services/generators/valuation-sheet.generator.ts:66-79` — inner join on `participantId` at line 76

**Notifications (1 site):**
- `src/features/notifications/services/notification.service.ts:51-104` — `resolveRecipients` for `programmeId`-scoped events iterates `row.participantId` only; GROUP members never receive programme-wide emails (`REPORTING_STARTED`, `REPORTING_CLOSED`, `PROGRAMME_STATUS_CHANGED`)

**Judgement (2 sites):**
- `src/features/judgement/actions/judgement.actions.ts:1962-2020` — `submitJudgeScoresAction` counts GROUP members via `programmeAssignment.participantId` at lines 1977-2000; GROUP teams always get `participantsCount = 1`

**Expired PDF (1 site):**
- `src/features/festivals/services/festival-expiration.service.ts:337-383` — `participantIds = assignmentRows.map(a => a.participantId)`; GROUP results show "—" in the archived PDF

**Schedule (1 site):**
- `src/features/schedule/actions/schedule.actions.ts:243-257` — `COUNT(DISTINCT teamNumber)` should be `COUNT(DISTINCT (groupId, teamNumber))`. With two groups each having Team 1, this reports 1 team when there are really 2.

**Poster preview (1 site):**
- `src/features/posters/services/poster-editor-preview.service.ts:99-115` — `categoryNameFromFirstProgramme` joins `participantId`; GROUP members get `"—"` in badge category

**Participant "All programmes" count (1 site — also filed separately as Issue 7):**
- `src/app/(participant)/[slug]/[participantSlug]/all-programmes/page.tsx:125-144` — count filters on `assignment.groupId`; INDIVIDUAL assignments invisible. Same bug at line 199-215 for `individualProgrammeAssignments`.

**Assignment update duplicate check (1 site):**
- `src/features/assignments/services/assignment.service.ts:393-400` — Update conflict check uses `eq(programmeAssignment.participantId, nextParticipantId)` only; does not detect a GROUP-membership on `programme_assignment_member`

**Assignment createIndividualAssignment cap (1 site):**
- `src/features/assignments/services/assignment.service.ts:220-244` — `maxParticipantsPerGroup` check counts INDIVIDUAL assignments only; GROUP-shape teams with members already filled are not detected

## Out of Scope

- Schema changes to `programme_assignment`. The XOR invariant stays as-is.
- Renaming `programme_assignment_member`. The helper uses the existing table.
- Removing the redundant `participant.assignments` Drizzle relation. It stays for any consumer that genuinely wants INDIVIDUAL-only data (e.g. some admin filters).
- Migrating the 8 tactical-issue screenshots; the helper fixes them automatically as consumers migrate.
- Ejecting `AssignmentService.getAll`'s synthetic fan-out. The helper coexists with `AssignmentService.getAll` — the helper is for participant-centric questions, `getAll` is for programme-centric with fan-out.

## Solution

### 1. Add the missing relation

`src/core/database/relations.ts` near line 174 (inside `participantRelations`):

```ts
programmeAssignmentMembers: many(programmeAssignmentMember),
```

(Required to keep Drizzle's relation graph consistent when consumers want both `assignments` and `programmeAssignmentMembers` in one query.)

### 2. New helper module

`src/features/assignments/services/programme-membership.service.ts`:

```ts
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  participant as participantTable,
  programme as programmeTable,
  programmeAssignment,
  programmeAssignmentMember,
  programmeTeamLead,
} from "@/core/database/schema";

/** Branded type so consumers can't confuse it with raw programmeAssignment rows. */
export type EnrolledProgramme = {
  programmeId: string;
  programme: typeof programmeTable.$inferSelect;
  assignmentId: string;
  /** programme_assignment_member.id; null for INDIVIDUAL direct, set for GROUP members. */
  memberId: string | null;
  groupId: string | null;
  teamNumber: number | null;
  isTeamLeader: boolean;
  categoryId: string;
};

export type EnrolledParticipant = {
  participantId: string;
  participant: typeof participantTable.$inferSelect;
  assignmentId: string;
  memberId: string | null;
  groupId: string | null;
  teamNumber: number | null;
  isTeamLeader: boolean;
};

export const ProgrammeMembershipService = {
  /**
   * All programmes a participant is enrolled in, regardless of shape.
   * - INDIVIDUAL: matches via programme_assignment.participantId
   * - GROUP: matches via programme_assignment_member.participantId
   * Scoped to festivalId for safety.
   */
  async getProgrammesForParticipant(
    participantId: string,
    festivalId: string,
  ): Promise<EnrolledProgramme[]> {
    // Branch A: INDIVIDUAL direct
    const individualRows = await db
      .select({
        assignmentId: programmeAssignment.id,
        programmeId: programmeAssignment.programmeId,
        groupId: programmeAssignment.groupId,
        teamNumber: programmeAssignment.teamNumber,
      })
      .from(programmeAssignment)
      .where(
        and(
          eq(programmeAssignment.participantId, participantId),
          eq(programmeAssignment.festivalId, festivalId),
          isNull(programmeAssignment.groupId),
        ),
      );

    // Branch B: GROUP via programme_assignment_member
    const groupRows = await db
      .select({
        memberId: programmeAssignmentMember.id,
        assignmentId: programmeAssignment.id,
        programmeId: programmeAssignment.programmeId,
        groupId: programmeAssignment.groupId,
        teamNumber: programmeAssignment.teamNumber,
      })
      .from(programmeAssignmentMember)
      .innerJoin(
        programmeAssignment,
        eq(programmeAssignment.id, programmeAssignmentMember.assignmentId),
      )
      .where(
        and(
          eq(programmeAssignmentMember.participantId, participantId),
          eq(programmeAssignmentMember.festivalId, festivalId),
        ),
      );

    // Union (in JS, after-the-fact dedupe by programmeId; if a participant is in
    // the same programme twice via both shapes, surface once).
    const programmeIds = Array.from(
      new Set([...individualRows.map((r) => r.programmeId), ...groupRows.map((r) => r.programmeId)]),
    );

    if (programmeIds.length === 0) return [];

    // Fetch programmes
    const programmes = await db.query.programme.findMany({
      where: and(
        inArray(programmeTable.id, programmeIds),
        eq(programmeTable.festivalId, festivalId),
      ),
    });

    // Fetch team-lead status for the GROUP shape (assignmentId + teamNumber → lead participant)
    const assignmentIds = Array.from(
      new Set([...individualRows.map((r) => r.assignmentId), ...groupRows.map((r) => r.assignmentId)]),
    );
    const leadRows = await db
      .select({
        programmeId: programmeTeamLead.programmeId,
        groupId: programmeTeamLead.groupId,
        teamNumber: programmeTeamLead.teamNumber,
        participantId: programmeTeamLead.participantId,
      })
      .from(programmeTeamLead)
      .where(
        and(
          eq(programmeTeamLead.participantId, participantId),
          inArray(programmeTeamLead.programmeId, programmeIds),
        ),
      );
    const leadKey = (p: typeof leadRows[number]) => `${p.programmeId}:${p.groupId}:${p.teamNumber}`;

    // Build per-programme entries (one per programme)
    return programmes.map((programme) => {
      const indiv = individualRows.find((r) => r.programmeId === programme.id);
      const grp = groupRows.find((r) => r.programmeId === programme.id);
      const isLead = grp
        ? leadKey({
            programmeId: programme.id,
            groupId: grp.groupId!,
            teamNumber: grp.teamNumber!,
            participantId,
          }) in Object.fromEntries(leadRows.map((l) => [leadKey(l), true]))
        : false;

      return {
        programmeId: programme.id,
        programme,
        assignmentId: (indiv ?? grp)!.assignmentId,
        memberId: grp?.memberId ?? null,
        groupId: (indiv?.groupId ?? grp?.groupId) ?? null,
        teamNumber: (indiv?.teamNumber ?? grp?.teamNumber) ?? null,
        isTeamLeader: Boolean(isLead),
        categoryId: programme.categoryId,
      };
    });
  },

  /**
   * All participants enrolled in a programme (one row per participant).
   * - INDIVIDUAL: one row per direct assignment
   * - GROUP: one row per programme_assignment_member row
   */
  async getParticipantsForProgramme(programmeId: string): Promise<EnrolledParticipant[]> {
    // Branch A: INDIVIDUAL
    const individualRows = await db
      .select({
        assignmentId: programmeAssignment.id,
        participantId: programmeAssignment.participantId,
        groupId: programmeAssignment.groupId,
        teamNumber: programmeAssignment.teamNumber,
        participant: participantTable,
      })
      .from(programmeAssignment)
      .innerJoin(participantTable, eq(participantTable.id, programmeAssignment.participantId))
      .where(
        and(
          eq(programmeAssignment.programmeId, programmeId),
          isNotNull(programmeAssignment.participantId),
        ),
      );

    // Branch B: GROUP
    const groupRows = await db
      .select({
        assignmentId: programmeAssignment.id,
        memberId: programmeAssignmentMember.id,
        participantId: programmeAssignmentMember.participantId,
        groupId: programmeAssignment.groupId,
        teamNumber: programmeAssignment.teamNumber,
        participant: participantTable,
      })
      .from(programmeAssignmentMember)
      .innerJoin(
        programmeAssignment,
        eq(programmeAssignment.id, programmeAssignmentMember.assignmentId),
      )
      .innerJoin(participantTable, eq(participantTable.id, programmeAssignmentMember.participantId))
      .where(eq(programmeAssignment.programmeId, programmeId));

    // Team-lead info
    const assignmentIds = Array.from(
      new Set([...individualRows.map((r) => r.assignmentId), ...groupRows.map((r) => r.assignmentId)]),
    );
    const leadRows = await db
      .select({
        assignmentId: programmeAssignment.id,
        programmeId: programmeTeamLead.programmeId,
        groupId: programmeTeamLead.groupId,
        teamNumber: programmeTeamLead.teamNumber,
        leadParticipantId: programmeTeamLead.participantId,
      })
      .from(programmeTeamLead)
      .innerJoin(programmeAssignment, and(
        eq(programmeAssignment.programmeId, programmeTeamLead.programmeId),
        eq(programmeAssignment.groupId, programmeTeamLead.groupId),
        eq(programmeAssignment.teamNumber, programmeTeamLead.teamNumber),
      ))
      .where(inArray(programmeAssignment.id, assignmentIds));

    return [
      ...individualRows.map((r) => ({
        participantId: r.participantId!,
        participant: r.participant,
        assignmentId: r.assignmentId,
        memberId: null,
        groupId: r.groupId,
        teamNumber: r.teamNumber,
        isTeamLeader: false,
      })),
      ...groupRows.map((r) => {
        const lead = leadRows.find(
          (l) => l.assignmentId === r.assignmentId && l.leadParticipantId === r.participantId,
        );
        return {
          participantId: r.participantId,
          participant: r.participant,
          assignmentId: r.assignmentId,
          memberId: r.memberId,
          groupId: r.groupId,
          teamNumber: r.teamNumber,
          isTeamLeader: Boolean(lead),
        };
      }),
    ];
  },
};
```

### 3. Central loader normalization (fixes 5 sites at once)

`src/features/participants/repositories/participant.repository.ts:51-69`:

```ts
export async function findParticipantByFestivalAndProfileSlug(
  festivalId: string,
  profileSlug: string,
) {
  const base = await db.query.participant.findFirst({
    where: and(
      eq(participants.festivalId, festivalId),
      eq(participants.profileSlug, profileSlug),
    ),
    with: { category: true, group: true },
  });
  if (!base) return null;
  const enrolled = await ProgrammeMembershipService.getProgrammesForParticipant(base.id, base.festivalId);
  return { ...base, assignedProgrammes: enrolled };
}
```

The 5 consumers replace `participant.assignments` references with `participant.assignedProgrammes`:

| Consumer | Old | New |
|---|---|---|
| `src/app/(participant)/[slug]/[participantSlug]/page.tsx:166-180` | `participant.assignments` | `participant.assignedProgrammes` |
| `src/app/(participant)/[slug]/[participantSlug]/layout.tsx:85-91` | `participant.assignments` | `participant.assignedProgrammes` |
| `src/app/(participant)/[slug]/[participantSlug]/assigned-programmes/page.tsx:62-87` | `participant.assignments` | `participant.assignedProgrammes` |
| `src/app/dashboard/[slug]/pre-event-works/participants/[participantSlug]/page.tsx:54-74` | `participant.assignments` | `participant.assignedProgrammes` |
| `src/components/festival/pre-event-works/participants/ParticipantProfileView.tsx:70` | `participant.assignments` | `participant.assignedProgrammes` |

`ParticipantAssignedProgrammeCards.tsx` already consumes a shaped array (no direct DB access) so the change cascades through its props.

### 4. Per-consumer fixes

| File | Change |
|---|---|
| `src/components/festival/pre-event-works/participants/ParticipantDetailsDialog.tsx:47-49` | Filter: `a.participant?.id === participant.id \|\| a.participantId === participant.id` |
| `src/features/announcement/services/announcer.service.ts:67-87` | Add second `leftJoin` on `participantTable.groupId` to a second `groupTable` alias; select `participantGroupName: participantGroupTable.name`. Update line 209 to `groupName: r.groupName ?? r.participantGroupName ?? null`. |
| `src/features/exports/services/generators/call-list.generator.ts:123-152` | Replace inner join with `ProgrammeMembershipService.getParticipantsForProgramme(programmeId)` |
| `src/features/exports/services/generators/valuation-sheet.generator.ts:66-79` | Same as above |
| `src/features/notifications/services/notification.service.ts:51-104` | Replace `row.participantId` iteration with `getParticipantsForProgramme(programmeId)` |
| `src/features/judgement/actions/judgement.actions.ts:1962-2020` | `teamMembers` query: count via `programmeAssignmentMember` instead of `programmeAssignment` |
| `src/features/festivals/services/festival-expiration.service.ts:337-383` | `participantIds` resolver: use `getParticipantsForProgramme(programmeId)` |
| `src/features/schedule/actions/schedule.actions.ts:243-257` | `COUNT(DISTINCT teamNumber)` → `COUNT(DISTINCT (groupId, teamNumber))` |
| `src/features/posters/services/poster-editor-preview.service.ts:99-115` | `categoryNameFromFirstProgramme`: use `getProgrammesForParticipant(participantId, festivalId)` to find first programme |
| `src/app/(participant)/[slug]/[participantSlug]/all-programmes/page.tsx:125-144` | Count query: left join `participantTable` + `or(eq(assignment.groupId, participant.groupId), eq(participantTable.groupId, participant.groupId))` |
| `src/app/(participant)/[slug]/[participantSlug]/all-programmes/page.tsx:199-215` | Same fix for `individualProgrammeAssignments` |
| `src/features/assignments/services/assignment.service.ts:393-400` | Update conflict check: also query `programme_assignment_member` for next participant |
| `src/features/assignments/services/assignment.service.ts:220-244` | `maxParticipantsPerGroup` count: include both INDIVIDUAL rows AND GROUP member rows for the group |

### 5. Type guard exports

Re-export `isIndividualAssignment` / `isGroupAssignment` from `programme-membership.service` for any consumer that needs to branch on shape after receiving the normalized result:

```ts
export { isIndividualAssignment, isGroupAssignment } from "@/features/assignments/utils/assert-assignment-shape";
```

### 6. Tests

Unit tests at `src/features/assignments/services/programme-membership.service.test.ts` — mock the UNION branches and assert the normalized shape for each combination.

Integration tests at `src/test/integration/programme-membership.test.ts` (Issue D) — real DB; covers both shapes, both directions, mixed-shape participants, empty cases, cross-festival scoping.

## Phased Implementation Order

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| A.1 | Add relation | `programmeAssignmentMembers` on `participantRelations` | `npm run typecheck`; existing tests pass |
| A.2 | Helper module | `programme-membership.service.ts` with both helpers + `EnrolledProgramme` type | Unit tests pass with mocked DB |
| A.3 | Central loader | `findParticipantByFestivalAndProfileSlug` exposes `assignedProgrammes`; 5 consumer files use it | All 5 consumer pages render correctly; manual smoke test |
| A.4 | Drawer filter | `ParticipantDetailsDialog.tsx` uses `a.participant?.id === participant.id \|\| a.participantId === participant.id` | Manual: drawer shows GROUP assignments |
| A.5 | Announcer | Add `participantGroupName` fallback to `getAnnouncerQueue` and `getPublishedResults` | Manual: Qira'th shows group name |
| A.6 | Exports | `call-list`, `valuation-sheet` use helper | Manual: GROUP team members appear in printed call list |
| A.7 | Notifications | `resolveRecipients` uses helper for programme-scoped events | Manual: GROUP members receive programme-wide emails |
| A.8 | Judgement | `submitJudgeScoresAction` team-size count uses helper | Unit test confirms correct team size for GROUP |
| A.9 | Expired PDF | `festival-expiration.service.ts` winner line uses helper | Manual: GROUP winner name in archived PDF |
| A.10 | Schedule | `COUNT(DISTINCT (groupId, teamNumber))` | Manual: two groups with Team 1 → counted as 2 |
| A.11 | Poster preview | `categoryNameFromFirstProgramme` uses helper | Manual: badge shows category for GROUP members |
| A.12 | All-programmes count | `all-programmes/page.tsx` uses helper | Manual: Salman sees Qira'th 6/6 |
| A.13 | Assignment update conflict | `assignment.service.ts:393-400` queries `programme_assignment_member` too | Unit test: re-assigning a GROUP member is flagged |
| A.14 | Assignment createIndividualAssignment cap | `assignment.service.ts:220-244` counts both shapes | Unit test: GROUP-shape teams with members already filled are detected |
| A.15 | Integration tests | `programme-membership.test.ts` | CI green |

## Files Touched

**New**
- `src/features/assignments/services/programme-membership.service.ts`
- `src/features/assignments/services/programme-membership.service.test.ts`
- `src/test/integration/programme-membership.test.ts`

**Modified**
- `src/core/database/relations.ts:174` (add `programmeAssignmentMembers` relation)
- `src/features/participants/repositories/participant.repository.ts:51-69` (expose `assignedProgrammes`)
- `src/app/(participant)/[slug]/[participantSlug]/page.tsx:166`
- `src/app/(participant)/[slug]/[participantSlug]/layout.tsx:85`
- `src/app/(participant)/[slug]/[participantSlug]/assigned-programmes/page.tsx:62`
- `src/app/dashboard/[slug]/pre-event-works/participants/[participantSlug]/page.tsx:54-74`
- `src/components/festival/pre-event-works/participants/ParticipantProfileView.tsx:70`
- `src/components/festival/pre-event-works/participants/ParticipantDetailsDialog.tsx:47-49`
- `src/features/announcement/services/announcer.service.ts:67-87,209`
- `src/features/exports/services/generators/call-list.generator.ts:123-152`
- `src/features/exports/services/generators/valuation-sheet.generator.ts:66-79`
- `src/features/notifications/services/notification.service.ts:51-104`
- `src/features/judgement/actions/judgement.actions.ts:1962-2020`
- `src/features/festivals/services/festival-expiration.service.ts:337-383`
- `src/features/schedule/actions/schedule.actions.ts:243-257`
- `src/features/posters/services/poster-editor-preview.service.ts:99-115`
- `src/app/(participant)/[slug]/[participantSlug]/all-programmes/page.tsx:125-215`
- `src/features/assignments/services/assignment.service.ts:220-244,393-400`

## Verification

- Existing unit tests pass
- New unit tests at `programme-membership.service.test.ts` pass
- New integration tests at `programme-membership.test.ts` pass
- Manual: open Qira'th in Announcer → Group column shows the participant's group, not "—"
- Manual: open Salman (team leader) → All programmes shows 6/6 for Qira'th
- Manual: download call list export for a festival with GROUP programmes → GROUP members appear
- Manual: send a programme-scoped notification → GROUP members receive it
- Manual: badge preview for a GROUP member shows the category
- Manual: archived PDF for an EXPIRED festival with GROUP results shows the GROUP winner
- Manual: schedule page with two groups, each having Team 1, shows 2 teams (not 1)

## Migration / Rollout

- Phase A.1–A.2 are zero-consumer changes (just adding the helper). Land first.
- Phase A.3 changes 5 consumer files in one PR; each file's behaviour is mechanically the same (just iterate the new array).
- Phases A.4–A.14 are independent and can land as separate PRs.
- Phase A.15 is test-only.

## Out-of-Scope Notes

- The 8 tactical issue files in the working plan are subsumed by this issue. The 8 bugs all melt away as their consumers migrate to the helper.
- We do NOT propose to delete `AssignmentService.getAll`'s synthetic fan-out. That function is for "all assignments across a programme" (programme-centric, fan-out per member). The new helper is for "all programmes for a participant" (participant-centric). They coexist.
- We do NOT propose to remove `participant.assignments` relation. Some consumers may legitimately want INDIVIDUAL-only data (e.g. some admin filters). The helper is the recommended path for the "all programmes" question, but the relation stays.
