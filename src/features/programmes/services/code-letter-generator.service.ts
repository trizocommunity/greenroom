import { randomInt, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeCodeLetter as codeLetterTable,
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
    const nowStr = new Date().toISOString();

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
          assignedParticipantIds.add(r.participantId);
        }
      }

      // 2. Filter out participants who already have codes
      const toAssign = shuffled.filter(
        (s) => !assignedParticipantIds.has(s.participantId),
      );
      if (toAssign.length === 0) return;

      let ordinal = 0;
      for (const row of toAssign) {
        // Find next available letter that isn't already used
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

        await tx.insert(codeLetterRecipientTable).values({
          id: randomUUID(),
          codeLetterId: codeLetterId,
          participantId: row.participantId,
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
    const nowStr = new Date().toISOString();

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
          assignedParticipantIds.add(r.participantId);
        }
      }

      // 2. Group by team
      type TeamBucket = { participantIds: Set<string> };
      const byTeam = new Map<string, TeamBucket>();

      for (const row of reportedParticipants) {
        // Skip participants who already have a code
        if (row.participantId && assignedParticipantIds.has(row.participantId))
          continue;

        const teamKey =
          row.groupId != null && row.teamNumber != null
            ? `${row.groupId}\0${row.teamNumber}`
            : `legacy:${row.participantId}`;
        let bucket = byTeam.get(teamKey);
        if (!bucket) {
          bucket = { participantIds: new Set<string>() };
          byTeam.set(teamKey, bucket);
        }
        if (row.participantId) bucket.participantIds.add(row.participantId);
      }

      const teamBuckets = Array.from(byTeam.values());
      if (teamBuckets.length === 0) return;

      shuffleInPlace(teamBuckets);

      let ordinal = 0;
      for (const bucket of teamBuckets) {
        // Find next available letter
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
          await tx.insert(codeLetterRecipientTable).values({
            id: randomUUID(),
            codeLetterId: codeLetterId,
            participantId,
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
    const nowStr = new Date().toISOString();

    const run = async (tx: any) => {
      for (const assignment of codeAssignments) {
        let teamParticipants: Array<{ participantId: string | null }> = [];

        // Prefer a single participant (spin per participant). Team-wide assignment only
        // when no participantId is provided (legacy / bulk).
        if (assignment.participantId) {
          teamParticipants = reportedParticipants.filter(
            (p) => p.participantId === assignment.participantId,
          );
        } else if (
          assignment.teamNumber !== null &&
          assignment.teamNumber !== undefined
        ) {
          teamParticipants = reportedParticipants.filter(
            (p) =>
              assignment.groupId !== undefined &&
              assignment.groupId !== null &&
              p.groupId === assignment.groupId &&
              p.teamNumber === assignment.teamNumber &&
              p.participantId !== null,
          );
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
            await tx.insert(codeLetterRecipientTable).values({
              id: randomUUID(),
              codeLetterId: codeLetterId,
              participantId: participant.participantId,
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
