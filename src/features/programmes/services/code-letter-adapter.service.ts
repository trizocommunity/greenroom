import { randomInt, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignmentMember as assignmentMemberTable,
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeCodeLetter as codeLetterTable,
  programmeReportedParticipant as reportedParticipantTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import type {
  CheckoutCompleted,
  ReportingReopened,
  ReportingReset,
} from "@/features/programmes/domain/reporting-events";
import { type CheckoutRow, groupIntoUnits, unitKey } from "./scratch-code-plan";

export function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const t = arr[i];
    arr[i] = arr[j]!;
    arr[j] = t!;
  }
}

export type CodeLetterEntry = { participantId: string; code: string };

export async function findAssignmentMemberId(
  tx: any,
  programmeId: string,
  participantId: string,
): Promise<string | null> {
  const member = await tx.query.programmeAssignmentMember.findFirst({
    where: eq(assignmentMemberTable.participantId, participantId),
    with: {
      assignment: { columns: { id: true, programmeId: true } },
    },
  });
  if (member?.assignment?.programmeId === programmeId) return member.id;
  return null;
}

async function clearSessionCodeLettersTx(
  tx: any,
  reportingSessionId: string,
): Promise<void> {
  const codeLetters = await tx.query.programmeCodeLetter.findMany({
    where: eq(codeLetterTable.reportingSessionId, reportingSessionId),
    columns: { id: true },
  });

  if (codeLetters.length > 0) {
    const codeLetterIds = codeLetters.map((cl: { id: string }) => cl.id);
    await tx
      .delete(codeLetterRecipientTable)
      .where(inArray(codeLetterRecipientTable.codeLetterId, codeLetterIds));
  }

  await tx
    .delete(codeLetterTable)
    .where(eq(codeLetterTable.reportingSessionId, reportingSessionId));
}

async function insertCodeLetter(
  tx: any,
  session: { id: string; festivalId: string; programmeId: string },
  code: string,
  queuePosition: number,
  actorName: string,
  nowStr: string,
): Promise<string> {
  const codeLetterId = randomUUID();
  await tx.insert(codeLetterTable).values({
    id: codeLetterId,
    festivalId: session.festivalId,
    reportingSessionId: session.id,
    programmeId: session.programmeId,
    code,
    queuePosition,
    issuedBy: actorName,
    updatedAt: nowStr,
  } as any);
  return codeLetterId;
}

async function insertRecipient(
  tx: any,
  codeLetterId: string,
  participantId: string,
  assignmentMemberId: string | null,
  nowStr: string,
): Promise<void> {
  await tx.insert(codeLetterRecipientTable).values({
    id: randomUUID(),
    codeLetterId,
    participantId,
    assignmentMemberId,
    updatedAt: nowStr,
  } as any);
}

async function loadReportedParticipants(
  tx: any,
  reportingSessionId: string,
): Promise<CheckoutRow[]> {
  return tx.query.programmeReportedParticipant.findMany({
    where: eq(reportedParticipantTable.reportingSessionId, reportingSessionId),
  });
}

export const CodeLetterAdapter = {
  /**
   * Materialises the whole draw the moment checkout closes.
   *
   * One `programme_code_letter` row per scratchable tile, carrying its shuffled
   * `code` and its checkout-order `queuePosition`. Every tile starts
   * unscratched (`revealedAt` null) — the code exists in the DB but is not
   * shown to anyone until its owner scratches it.
   */
  async onCheckoutCompleted(
    event: CheckoutCompleted,
    txIn?: any,
  ): Promise<void> {
    const session = {
      id: event.reportingSessionId,
      festivalId: event.festivalId,
      programmeId: event.programmeId,
    };
    const nowStr = serverNowIso();

    const run = async (tx: any) => {
      // Checkout is a one-shot gate, but a retried dispatch must not double up.
      const existing = await tx.query.programmeCodeLetter.findMany({
        where: eq(codeLetterTable.reportingSessionId, event.reportingSessionId),
        columns: { id: true },
      });
      if (existing.length > 0) return;

      const rows = await loadReportedParticipants(tx, event.reportingSessionId);
      const unitsByKey = new Map(
        groupIntoUnits(rows, event.programmeType).map((u) => [u.key, u]),
      );

      for (const assignment of event.shuffledCodeAssignments) {
        const unit = unitsByKey.get(unitKey(assignment, event.programmeType));
        if (!unit) continue;

        const codeLetterId = await insertCodeLetter(
          tx,
          session,
          assignment.code,
          assignment.queuePosition,
          event.actorName,
          nowStr,
        );

        for (const recipient of unit.recipients) {
          const memberId =
            recipient.assignmentMemberId ??
            (await findAssignmentMemberId(
              tx,
              session.programmeId,
              recipient.participantId,
            ));
          await insertRecipient(
            tx,
            codeLetterId,
            recipient.participantId,
            memberId,
            nowStr,
          );
        }
      }
    };

    return txIn ? run(txIn) : db.transaction(run);
  },

  /**
   * Codes that have actually been scratched, flattened to one entry per
   * recipient. Unscratched tiles are excluded — their letters were never drawn,
   * so there is nothing to tell those participants.
   */
  async listRevealedCodes(
    reportingSessionId: string,
  ): Promise<CodeLetterEntry[]> {
    const rows = await db.query.programmeCodeLetter.findMany({
      where: eq(codeLetterTable.reportingSessionId, reportingSessionId),
      columns: { code: true, revealedAt: true },
      with: {
        programmeCodeLetterRecipients: { columns: { participantId: true } },
      },
    });

    const entries: CodeLetterEntry[] = [];
    for (const row of rows) {
      if (!row.revealedAt) continue;
      for (const recipient of row.programmeCodeLetterRecipients) {
        entries.push({
          participantId: recipient.participantId,
          code: row.code,
        });
      }
    }
    return entries;
  },

  async onReportingReset(event: ReportingReset, txIn?: any): Promise<void> {
    return txIn
      ? clearSessionCodeLettersTx(txIn, event.reportingSessionId)
      : db.transaction(async (tx) =>
          clearSessionCodeLettersTx(tx, event.reportingSessionId),
        );
  },

  async onReportingReopened(
    event: ReportingReopened,
    txIn?: any,
  ): Promise<void> {
    return txIn
      ? clearSessionCodeLettersTx(txIn, event.reportingSessionId)
      : db.transaction(async (tx) =>
          clearSessionCodeLettersTx(tx, event.reportingSessionId),
        );
  },
};
