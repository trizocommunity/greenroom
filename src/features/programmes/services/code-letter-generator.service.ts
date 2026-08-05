import { randomInt, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignmentMember as assignmentMemberTable,
  programmeAssignment as assignmentTable,
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeCodeLetter as codeLetterTable,
  programmeReportingSession as prsTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

async function findAssignmentMemberId(
  tx: any,
  programmeId: string,
  participantId: string,
): Promise<string | null> {
  // Returns the `programme_assignment_member.id` for GROUP programmes (where
  // recipients are addressed per-member). For INDIVIDUAL programmes, returns
  // null — INDIVIDUAL code letters are addressed by participantId on the
  // `programme_assignment` row, not via the member table.
  const member = await tx.query.programmeAssignmentMember.findFirst({
    where: eq(assignmentMemberTable.participantId, participantId),
    with: {
      assignment: { columns: { id: true, programmeId: true } },
    },
  });
  if (member?.assignment?.programmeId === programmeId) return member.id;
  return null;
}

export function sequentialAlphabetCode(indexOneBased: number): string {
  let n = Math.max(1, indexOneBased);
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const t = arr[i];
    arr[i] = arr[j]!;
    arr[j] = t!;
  }
}

export type CodeLetterEntry = { participantId: string; code: string };

export const CodeLetterGeneratorService = {
  async generateForIndividualSession(
    session: {
      id: string;
      festivalId: string;
      programmeId: string;
    },
    reportedParticipants: Array<{ participantId: string | null }>,
    actorName: string,
    txIn?: any,
  ): Promise<CodeLetterEntry[]> {
    const participantCodes: CodeLetterEntry[] = [];
    const nowStr = serverNowIso();

    // Filter out rows without participantId
    const shuffled = reportedParticipants.filter(
      (r): r is { participantId: string } => Boolean(r.participantId),
    );
    shuffleInPlace(shuffled);

    const run = async (tx: any) => {
      // 1. Find existing assignments for this session
      const existing = await tx.query.programmeCodeLetter.findMany({
        where: eq(codeLetterTable.reportingSessionId, session.id),
        with: {
          programmeCodeLetterRecipients: true,
        },
      });

      const usedCodes = new Set(existing.map((e: any) => e.code));
      const assignedParticipantIds = new Set<string>();
      for (const e of existing) {
        for (const r of e.programmeCodeLetterRecipients) {
          if (r.participantId) assignedParticipantIds.add(r.participantId);
        }
      }

      // 2. Filter out participants who already have codes
      const toAssign = shuffled.filter(
        (s) => !assignedParticipantIds.has(s.participantId),
      );
      if (toAssign.length === 0) return;

      let ordinal = 0;
      for (const row of toAssign) {
        let code = "";
        do {
          ordinal += 1;
          code = sequentialAlphabetCode(ordinal);
        } while (usedCodes.has(code));

        const codeLetterId = randomUUID();
        await tx.insert(codeLetterTable).values({
          id: codeLetterId,
          festivalId: session.festivalId,
          reportingSessionId: session.id,
          programmeId: session.programmeId,
          code,
          issuedBy: actorName,
          updatedAt: nowStr,
        } as any);

        const memberId = await findAssignmentMemberId(
          tx,
          session.programmeId,
          row.participantId,
        );

        await tx.insert(codeLetterRecipientTable).values({
          id: randomUUID(),
          codeLetterId: codeLetterId,
          participantId: row.participantId,
          assignmentMemberId: memberId,
          updatedAt: nowStr,
        } as any);

        participantCodes.push({ participantId: row.participantId, code });
      }
    };

    if (txIn) {
      await run(txIn);
    } else {
      await db.transaction(async (tx) => {
        await run(tx);
      });
    }

    return participantCodes;
  },

  async generateForGroupSession(
    session: {
      id: string;
      festivalId: string;
      programmeId: string;
    },
    reportedParticipants: Array<{
      participantId: string | null;
      groupId: string | null;
      teamNumber: number | null;
    }>,
    actorName: string,
    txIn?: any,
  ): Promise<CodeLetterEntry[]> {
    const participantCodes: CodeLetterEntry[] = [];
    const nowStr = serverNowIso();

    const run = async (tx: any) => {
      // 1. Find existing assignments
      const existing = await tx.query.programmeCodeLetter.findMany({
        where: eq(codeLetterTable.reportingSessionId, session.id),
        with: {
          programmeCodeLetterRecipients: true,
        },
      });

      const usedCodes = new Set(existing.map((e: any) => e.code));
      const assignedParticipantIds = new Set<string>();
      for (const e of existing) {
        for (const r of e.programmeCodeLetterRecipients) {
          if (r.participantId) assignedParticipantIds.add(r.participantId);
        }
      }

      // 2. Group by team
      type TeamBucket = {
        participantIds: Set<string>;
        teamAssignmentId: string | null;
      };
      const byTeam = new Map<string, TeamBucket>();

      for (const row of reportedParticipants) {
        if (row.participantId && assignedParticipantIds.has(row.participantId))
          continue;

        const teamKey =
          row.groupId != null && row.teamNumber != null
            ? `${row.groupId}\0${row.teamNumber}`
            : `legacy:${row.participantId}`;
        let bucket = byTeam.get(teamKey);
        if (!bucket) {
          bucket = {
            participantIds: new Set<string>(),
            teamAssignmentId: null,
          };
          byTeam.set(teamKey, bucket);
        }
        if (row.participantId) bucket.participantIds.add(row.participantId);
      }

      const teamBuckets = Array.from(byTeam.values());
      if (teamBuckets.length === 0) return;

      shuffleInPlace(teamBuckets);

      let ordinal = 0;
      for (const bucket of teamBuckets) {
        let code = "";
        do {
          ordinal += 1;
          code = sequentialAlphabetCode(ordinal);
        } while (usedCodes.has(code));

        const codeLetterId = randomUUID();
        await tx.insert(codeLetterTable).values({
          id: codeLetterId,
          festivalId: session.festivalId,
          reportingSessionId: session.id,
          programmeId: session.programmeId,
          code,
          issuedBy: actorName,
          updatedAt: nowStr,
        } as any);
        for (const participantId of bucket.participantIds) {
          const memberId = await findAssignmentMemberId(
            tx,
            session.programmeId,
            participantId,
          );
          await tx.insert(codeLetterRecipientTable).values({
            id: randomUUID(),
            codeLetterId: codeLetterId,
            participantId,
            assignmentMemberId: memberId,
            updatedAt: nowStr,
          } as any);
          participantCodes.push({ participantId, code });
        }
      }
    };

    if (txIn) {
      await run(txIn);
    } else {
      await db.transaction(async (tx) => {
        await run(tx);
      });
    }

    return participantCodes;
  },

  async generateFromSpinWheel(
    session: {
      id: string;
      festivalId: string;
      programmeId: string;
    },
    codeAssignments: Array<{
      teamNumber: number | null;
      groupId?: string | null;
      participantId?: string | null;
      code: string;
    }>,
    reportedParticipants: Array<{
      participantId: string | null;
      groupId: string | null;
      teamNumber: number | null;
    }>,
    actorName: string,
    txIn?: any,
  ): Promise<CodeLetterEntry[]> {
    const participantCodes: CodeLetterEntry[] = [];
    const nowStr = serverNowIso();

    const run = async (tx: any) => {
      // Under the XOR invariant, GROUP programmes store ONE
      // programme_reported_participant row per team (keyed by reportingSessionId +
      // assignmentId). When the spin payload targets a GROUP team
      // (groupId+teamNumber, no participantId), use that single reported row
      // as the "team was reported" signal, then fan out recipients to every
      // team member loaded from programme_assignment_member.
      const teamAssignments = codeAssignments.filter(
        (a) => !a.participantId && a.groupId && a.teamNumber != null,
      );
      const singleMemberAssignments = codeAssignments.filter(
        (a) => !!a.participantId,
      );

      const teamAssignmentRows = await Promise.all(
        teamAssignments.map(async (a) => {
          const reportedRow = reportedParticipants.find(
            (p) =>
              p.groupId === a.groupId &&
              p.teamNumber === a.teamNumber &&
              p.participantId !== null,
          );
          if (!reportedRow) return { assignment: a, members: [] as string[] };

          const teamMemberRows = await tx
            .select({ participantId: assignmentMemberTable.participantId })
            .from(assignmentMemberTable)
            .innerJoin(
              assignmentTable,
              eq(assignmentTable.id, assignmentMemberTable.assignmentId),
            )
            .where(
              and(
                eq(assignmentTable.programmeId, session.programmeId),
                eq(assignmentTable.groupId, a.groupId ?? ""),
                eq(assignmentTable.teamNumber, a.teamNumber ?? 1),
              ),
            );

          let members = teamMemberRows.map(
            (r: { participantId: string }) => r.participantId,
          );

          // Transitional fallback: if the team was created before the
          // XOR migration ran and `programme_assignment_member` rows were never
          // backfilled, derive the member list from legacy programme_assignment
          // rows that still carry `participantId` + matching `groupId`/`teamNumber`.
          if (members.length === 0) {
            const legacyRows = await tx
              .select({ participantId: assignmentTable.participantId })
              .from(assignmentTable)
              .where(
                and(
                  eq(assignmentTable.programmeId, session.programmeId),
                  eq(assignmentTable.groupId, a.groupId ?? ""),
                  eq(assignmentTable.teamNumber, a.teamNumber ?? 1),
                ),
              );
            members = legacyRows
              .map((r: { participantId: string | null }) => r.participantId)
              .filter((p: string | null): p is string => Boolean(p));
          }
          return { assignment: a, members };
        }),
      );

      const allAssignments = [
        ...teamAssignmentRows.map((t) => t.assignment),
        ...singleMemberAssignments,
      ];
      const memberLookup = new Map<string, string[]>();
      for (const t of teamAssignmentRows) {
        memberLookup.set(
          `${t.assignment.groupId}:${t.assignment.teamNumber}`,
          t.members,
        );
      }

      for (const assignment of allAssignments) {
        let teamParticipants: Array<{ participantId: string | null }> = [];

        if (assignment.participantId) {
          teamParticipants = reportedParticipants.filter(
            (p) => p.participantId === assignment.participantId,
          );
        } else if (
          assignment.teamNumber !== null &&
          assignment.teamNumber !== undefined &&
          assignment.groupId
        ) {
          const members =
            memberLookup.get(
              `${assignment.groupId}:${assignment.teamNumber}`,
            ) ?? [];
          teamParticipants = members.map((pid) => ({
            participantId: pid,
          }));
          if (teamParticipants.length === 0) {
            throw new Error(
              `No team members found for ${assignment.groupId} team ${assignment.teamNumber}`,
            );
          }
        }

        if (teamParticipants.length === 0) {
          throw new Error(`No reported participants found for assignment`);
        }

        const codeLetterId = randomUUID();
        await tx.insert(codeLetterTable).values({
          id: codeLetterId,
          festivalId: session.festivalId,
          reportingSessionId: session.id,
          programmeId: session.programmeId,
          code: assignment.code,
          issuedBy: actorName,
          updatedAt: nowStr,
        } as any);

        for (const participant of teamParticipants) {
          if (participant.participantId) {
            const memberId = await findAssignmentMemberId(
              tx,
              session.programmeId,
              participant.participantId,
            );
            await tx.insert(codeLetterRecipientTable).values({
              id: randomUUID(),
              codeLetterId: codeLetterId,
              participantId: participant.participantId,
              assignmentMemberId: memberId,
              updatedAt: nowStr,
            } as any);
            participantCodes.push({
              participantId: participant.participantId,
              code: assignment.code,
            });
          }
        }
      }
    };

    if (txIn) {
      await run(txIn);
    } else {
      await db.transaction(async (tx) => {
        await run(tx);
      });
    }

    return participantCodes;
  },

  async clearSessionCodeLetters(reportingSessionId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const codeLetters = await tx.query.programmeCodeLetter.findMany({
        where: eq(codeLetterTable.reportingSessionId, reportingSessionId),
        columns: { id: true },
      });

      if (codeLetters.length > 0) {
        const codeLetterIds = codeLetters.map((cl) => cl.id);
        await tx
          .delete(codeLetterRecipientTable)
          .where(inArray(codeLetterRecipientTable.codeLetterId, codeLetterIds));
      }

      await tx
        .delete(codeLetterTable)
        .where(eq(codeLetterTable.reportingSessionId, reportingSessionId));
    });
  },
};
