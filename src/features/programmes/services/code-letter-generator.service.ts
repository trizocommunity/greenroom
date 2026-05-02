import { randomInt, randomUUID } from "node:crypto";
import { and, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeCodeLetter as codeLetterTable,
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeReportedParticipant as reportedParticipantTable,
  programmeReportingSession as prsTable,
} from "@/core/database/schema";

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

export type CodeLetterEntry = { studentId: string; code: string };

export const CodeLetterGeneratorService = {
  async generateForIndividualSession(
    session: {
      id: string;
      festivalId: string;
      programmeId: string;
    },
    reportedParticipants: Array<{ studentId: string | null }>,
    actorName: string,
  ): Promise<CodeLetterEntry[]> {
    const studentCodes: CodeLetterEntry[] = [];
    const nowStr = new Date().toISOString();
    const shuffled = reportedParticipants.filter((r): r is { studentId: string } =>
      Boolean(r.studentId),
    );
    shuffleInPlace(shuffled);

    await db.transaction(async (tx) => {
      let ordinal = 0;
      for (const row of shuffled) {
        ordinal += 1;
        const code = sequentialAlphabetCode(ordinal);
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
        await tx.insert(codeLetterRecipientTable).values({
          id: randomUUID(),
          codeLetterId: codeLetterId,
          studentId: row.studentId,
          updatedAt: nowStr,
        } as any);
        studentCodes.push({ studentId: row.studentId, code });
      }
    });

    return studentCodes;
  },

  async generateForGroupSession(
    session: {
      id: string;
      festivalId: string;
      programmeId: string;
    },
    reportedParticipants: Array<{
      studentId: string | null;
      groupId: string | null;
      teamNumber: number | null;
    }>,
    actorName: string,
  ): Promise<CodeLetterEntry[]> {
    const studentCodes: CodeLetterEntry[] = [];
    const nowStr = new Date().toISOString();

    type TeamBucket = { studentIds: Set<string> };
    const byTeam = new Map<string, TeamBucket>();

    for (const row of reportedParticipants) {
      const teamKey =
        row.groupId != null && row.teamNumber != null
          ? `${row.groupId}\0${row.teamNumber}`
          : `legacy:${row.studentId}`;
      let bucket = byTeam.get(teamKey);
      if (!bucket) {
        bucket = { studentIds: new Set<string>() };
        byTeam.set(teamKey, bucket);
      }
      if (row.studentId) bucket.studentIds.add(row.studentId);
    }

    const teamBuckets = Array.from(byTeam.values());
    shuffleInPlace(teamBuckets);

    await db.transaction(async (tx) => {
      let ordinal = 0;
      for (const bucket of teamBuckets) {
        ordinal += 1;
        const code = sequentialAlphabetCode(ordinal);
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
        for (const studentId of bucket.studentIds) {
          await tx.insert(codeLetterRecipientTable).values({
            id: randomUUID(),
            codeLetterId: codeLetterId,
            studentId,
            updatedAt: nowStr,
          } as any);
          studentCodes.push({ studentId, code });
        }
      }
    });

    return studentCodes;
  },

  async generateFromSpinWheel(
    session: {
      id: string;
      festivalId: string;
      programmeId: string;
    },
    codeAssignments: Array<{ teamNumber: number; code: string }>,
    reportedParticipants: Array<{
      studentId: string | null;
      groupId: string | null;
      teamNumber: number | null;
    }>,
    actorName: string,
  ): Promise<CodeLetterEntry[]> {
    const studentCodes: CodeLetterEntry[] = [];
    const nowStr = new Date().toISOString();

    await db.transaction(async (tx) => {
      for (const assignment of codeAssignments) {
        const teamParticipants = reportedParticipants.filter(
          (p) =>
            p.groupId !== null &&
            p.teamNumber === assignment.teamNumber &&
            p.studentId !== null,
        );

        if (teamParticipants.length === 0) {
          throw new Error(
            `Team ${assignment.teamNumber} has no reported participants`,
          );
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
          if (participant.studentId) {
            await tx.insert(codeLetterRecipientTable).values({
              id: randomUUID(),
              codeLetterId: codeLetterId,
              studentId: participant.studentId,
              updatedAt: nowStr,
            } as any);
            studentCodes.push({
              studentId: participant.studentId,
              code: assignment.code,
            });
          }
        }
      }
    });

    return studentCodes;
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
