/**
 * Backfill script for the programme_assignment XOR invariant.
 *
 * Pre-conditions:
 *   1. Migration `drizzle/0040_programme_assignment_member.sql` has run.
 *   2. Migration `drizzle/0041_programme_type_xor_invariant.sql` has run.
 *
 * Effects:
 *   - For each (programmeId, groupId, teamNumber) group of GROUP programme
 *     assignments where multiple rows exist (one per member), collapse to a
 *     single survivor row. Member ids are recorded in `programme_assignment_member`.
 *   - Sets `participantId = NULL` on every surviving GROUP row.
 *   - Remaps any `result.assignmentId` and `programme_reported_participant.assignmentId`
 *     pointing at deleted rows to the survivor's id.
 *   - Reports orphaned assignment ids that need manual attention and exits non-zero.
 *
 * Usage: `npm run migrate:xor`
 *   (run with DATABASE_URL pointing at a restored production copy first)
 */

import { randomUUID } from "node:crypto";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment,
  programmeAssignmentMember,
  programmeReportedParticipant,
  programme as programmeTable,
  result,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

type AssignmentRow = typeof programmeAssignment.$inferSelect;

async function main() {
  console.log("[migrate:xor] starting backfill");
  const programmes = await db
    .select({ id: programmeTable.id, type: programmeTable.type })
    .from(programmeTable);
  const groupProgrammes = programmes.filter((p) => p.type === "GROUP");
  console.log(`[migrate:xor] GROUP programmes: ${groupProgrammes.length}`);

  let collapsedAssignments = 0;
  let memberRowsInserted = 0;
  let resultRemappings = 0;
  let reportedParticipantRemappings = 0;
  const orphans: string[] = [];

  for (const programme of groupProgrammes) {
    const rows: AssignmentRow[] = await db
      .select()
      .from(programmeAssignment)
      .where(eq(programmeAssignment.programmeId, programme.id));
    const groupRows = rows.filter((r) => r.groupId != null);
    if (groupRows.length === 0) continue;

    const teams = new Map<string, AssignmentRow[]>();
    for (const r of groupRows) {
      const key = `${r.groupId}:${r.teamNumber ?? 1}`;
      const arr = teams.get(key) ?? [];
      arr.push(r);
      teams.set(key, arr);
    }

    for (const [, members] of teams) {
      const survivor = pickSurvivor(members);
      const losers = members.filter((m) => m.id !== survivor.id);
      if (losers.length === 0) continue;

      const existingMembers = await db
        .select({
          participantId: programmeAssignmentMember.participantId,
        })
        .from(programmeAssignmentMember)
        .where(eq(programmeAssignmentMember.assignmentId, survivor.id));

      const seenPids = new Set(existingMembers.map((m) => m.participantId));
      for (const r of members) {
        if (r.participantId && !seenPids.has(r.participantId)) {
          await db.insert(programmeAssignmentMember).values({
            id: randomUUID(),
            assignmentId: survivor.id,
            participantId: r.participantId,
            festivalId: r.festivalId,
            assignedAt: r.assignedAt,
            createdAt: serverNowIso(),
            updatedAt: serverNowIso(),
            createdByEmail: r.createdByEmail,
            createdByName: r.createdByName,
          });
          seenPids.add(r.participantId);
          memberRowsInserted += 1;
        }
      }

      const loserIds = losers.map((l) => l.id);
      await db
        .update(result)
        .set({ assignmentId: survivor.id })
        .where(inArray(result.assignmentId, loserIds));
      const [countRes] = await db
        .select({ c: count() })
        .from(result)
        .where(
          and(
            inArray(result.assignmentId, loserIds),
            sql`${result.assignmentId} <> ${survivor.id}`,
          ),
        );
      resultRemappings += Number(countRes?.c ?? 0);

      await db
        .update(programmeReportedParticipant)
        .set({ assignmentId: survivor.id })
        .where(inArray(programmeReportedParticipant.assignmentId, loserIds));
      const [rptCount] = await db
        .select({ c: count() })
        .from(programmeReportedParticipant)
        .where(inArray(programmeReportedParticipant.assignmentId, loserIds));
      reportedParticipantRemappings += Number(rptCount?.c ?? 0);

      await db
        .delete(programmeAssignment)
        .where(inArray(programmeAssignment.id, loserIds));
      collapsedAssignments += loserIds.length;
    }
  }

  await db
    .update(programmeAssignment)
    .set({ participantId: null })
    .where(
      sql`${programmeAssignment.participantId} IS NOT NULL AND ${programmeAssignment.groupId} IS NOT NULL`,
    );

  const survivorCheck = await db
    .select({
      programmeId: programmeAssignment.programmeId,
      groupId: programmeAssignment.groupId,
      teamNumber: programmeAssignment.teamNumber,
    })
    .from(programmeAssignment)
    .where(
      sql`${programmeAssignment.groupId} IS NOT NULL AND ${programmeAssignment.participantId} IS NOT NULL`,
    );
  if (survivorCheck.length > 0) {
    orphans.push(
      `${survivorCheck.length} GROUP assignment rows still have non-null participantId`,
    );
  }

  console.log(
    `[migrate:xor] collapsed ${collapsedAssignments} redundant assignment rows, ` +
      `inserted ${memberRowsInserted} member rows, remapped ${resultRemappings} results, ` +
      `${reportedParticipantRemappings} reporting rows`,
  );
  if (orphans.length > 0) {
    console.error("[migrate:xor] warnings:", orphans);
    process.exitCode = 1;
  } else {
    console.log("[migrate:xor] done");
  }
}

function pickSurvivor(rows: AssignmentRow[]): AssignmentRow {
  const withLead = rows.find((r) => r.createdByEmail !== null);
  if (withLead) return withLead;
  return rows.reduce((a, b) =>
    new Date(a.assignedAt).getTime() <= new Date(b.assignedAt).getTime()
      ? a
      : b,
  );
}

main().catch((err) => {
  console.error("[migrate:xor] failed", err);
  process.exitCode = 1;
});
