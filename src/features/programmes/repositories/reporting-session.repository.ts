import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignmentMember as assignmentMemberTable,
  programmeAssignment as assignmentTable,
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeCodeLetter as codeLetterTable,
  participant as participantTable,
  programme as programmeTable,
  programmeReportingSession as prsTable,
  programmeReportedParticipant as reportedParticipantTable,
  scheduleEntry as scheduleEntryTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import type { ReportingDomainEvent } from "@/features/programmes/domain/reporting-events";
import {
  type Assignment,
  type AssignmentMember,
  type CodeLetter,
  type ProgrammeType,
  type ReportedParticipant,
  ReportingSession,
  type ReportingSessionState,
  type ReportingStatus,
} from "@/features/programmes/domain/reporting-session.aggregate";

function mapDbSessionToState(
  session: Record<string, unknown>,
  programme: { id: string; type: ProgrammeType; status: string; name: string },
  reported: ReportedParticipant[],
  codeLetters: CodeLetter[],
  assignments: Assignment[],
): ReportingSessionState {
  return {
    id: session.id as string,
    festivalId: session.festivalId as string,
    programmeId: session.programmeId as string,
    stageId: (session.stageId as string | null) ?? null,
    scheduleEntryId: (session.scheduleEntryId as string | null) ?? null,
    status: session.status as ReportingStatus,
    isLocked: Boolean(session.isLocked),
    startedAt: (session.startedAt as string | null) ?? null,
    startedBy: (session.startedBy as string | null) ?? null,
    endedAt: (session.endedAt as string | null) ?? null,
    endedBy: (session.endedBy as string | null) ?? null,
    checkoutCompletedAt: (session.checkoutCompletedAt as string | null) ?? null,
    windowEndsAt: (session.windowEndsAt as string | null) ?? null,
    programmeType: programme.type,
    programmeStatus: programme.status,
    programmeName: programme.name,
    reportedParticipants: reported,
    codeLetters,
    assignments,
  };
}

function mapReportedParticipant(
  row: Record<string, unknown>,
): ReportedParticipant {
  return {
    id: row.id as string,
    reportingSessionId: row.reportingSessionId as string,
    assignmentId: row.assignmentId as string,
    participantId: (row.participantId as string | null) ?? null,
    groupId: (row.groupId as string | null) ?? null,
    teamNumber: (row.teamNumber as number | null) ?? null,
    assignmentMemberId: (row.assignmentMemberId as string | null) ?? null,
    reportedBy: (row.reportedBy as string | null) ?? null,
    reportedAt: (row.reportedAt as string | null) ?? null,
  };
}

function mapCodeLetter(row: Record<string, unknown>): CodeLetter {
  return {
    id: row.id as string,
    code: row.code as string,
    issuedAt: row.issuedAt as string,
    issuedBy: (row.issuedBy as string | null) ?? null,
    queuePosition: (row.queuePosition as number | null) ?? null,
    revealedAt: (row.revealedAt as string | null) ?? null,
    revealedBy: (row.revealedBy as string | null) ?? null,
    recipients:
      (row.programmeCodeLetterRecipients as Array<{
        participantId: string;
        assignmentMemberId: string | null;
      }>) ?? [],
  };
}

function mapAssignment(row: Record<string, unknown>): Assignment {
  return {
    id: row.id as string,
    programmeId: row.programmeId as string,
    participantId: (row.participantId as string | null) ?? null,
    groupId: (row.groupId as string | null) ?? null,
    teamNumber: (row.teamNumber as number | null) ?? null,
  };
}

async function fetchAssignments(programmeId: string): Promise<Assignment[]> {
  const rows = await db.query.programmeAssignment.findMany({
    where: eq(assignmentTable.programmeId, programmeId),
    columns: {
      id: true,
      programmeId: true,
      participantId: true,
      groupId: true,
      teamNumber: true,
    },
  });
  return rows.map(mapAssignment);
}

export const ReportingSessionRepository = {
  async loadById(id: string): Promise<ReportingSession> {
    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, id),
      with: {
        programme: {
          columns: { id: true, type: true, status: true, name: true },
        },
        programmeReportedParticipants: true,
        programmeCodeLetters: {
          with: {
            programmeCodeLetterRecipients: {
              columns: { participantId: true, assignmentMemberId: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new Error("Reporting session not found");
    }

    const assignments = await fetchAssignments(session.programmeId);

    const state = mapDbSessionToState(
      session,
      session.programme as {
        id: string;
        type: ProgrammeType;
        status: string;
        name: string;
      },
      session.programmeReportedParticipants.map(mapReportedParticipant),
      session.programmeCodeLetters.map(mapCodeLetter),
      assignments,
    );

    return new ReportingSession(state);
  },

  async loadByProgramme(
    programmeId: string,
    festivalId: string,
  ): Promise<ReportingSession> {
    const session = await db.query.programmeReportingSession.findFirst({
      where: and(
        eq(prsTable.festivalId, festivalId),
        eq(prsTable.programmeId, programmeId),
      ),
      with: {
        programme: {
          columns: { id: true, type: true, status: true, name: true },
        },
        programmeReportedParticipants: true,
        programmeCodeLetters: {
          with: {
            programmeCodeLetterRecipients: {
              columns: { participantId: true, assignmentMemberId: true },
            },
          },
        },
      },
    });

    if (session) {
      const assignments = await fetchAssignments(programmeId);
      const state = mapDbSessionToState(
        session,
        session.programme as {
          id: string;
          type: ProgrammeType;
          status: string;
          name: string;
        },
        session.programmeReportedParticipants.map(mapReportedParticipant),
        session.programmeCodeLetters.map(mapCodeLetter),
        assignments,
      );
      return new ReportingSession(state);
    }

    const programme = await db.query.programme.findFirst({
      where: eq(programmeTable.id, programmeId),
      columns: {
        id: true,
        festivalId: true,
        type: true,
        status: true,
        name: true,
      },
    });
    if (!programme || programme.festivalId !== festivalId) {
      throw new Error("Programme not found for this festival");
    }

    const latestEntry = await db.query.scheduleEntry.findFirst({
      where: and(
        eq(scheduleEntryTable.festivalId, festivalId),
        eq(scheduleEntryTable.programmeId, programmeId),
        eq(scheduleEntryTable.type, "PROGRAMME"),
      ),
      orderBy: [sql`${scheduleEntryTable.startTime} desc`],
      columns: { id: true, stageId: true },
    });

    const assignments = await fetchAssignments(programmeId);

    const state: ReportingSessionState = {
      id: randomUUID(),
      festivalId,
      programmeId,
      stageId: latestEntry?.stageId ?? null,
      scheduleEntryId: latestEntry?.id ?? null,
      status: "NOT_STARTED",
      isLocked: false,
      startedAt: null,
      startedBy: null,
      endedAt: null,
      endedBy: null,
      checkoutCompletedAt: null,
      windowEndsAt: null,
      programmeType: programme.type,
      programmeStatus: programme.status,
      programmeName: programme.name,
      reportedParticipants: [],
      codeLetters: [],
      assignments,
    };

    return new ReportingSession(state);
  },

  async findAssignmentByChestNumber(
    reportingSessionId: string,
    chestNumber: string,
  ): Promise<{
    assignmentId: string;
    participantId: string;
    teamNumber: number | null;
  } | null> {
    const normalizedChestNumber = chestNumber.trim().toUpperCase();
    if (!normalizedChestNumber) return null;

    const session = await db.query.programmeReportingSession.findFirst({
      where: eq(prsTable.id, reportingSessionId),
      columns: { programmeId: true, festivalId: true },
      with: {
        programme: { columns: { type: true } },
      },
    });
    if (!session) return null;

    const participant = await db.query.participant.findFirst({
      where: and(
        eq(participantTable.festivalId, session.festivalId),
        sql`UPPER(${participantTable.chestNumber}) = ${normalizedChestNumber}`,
      ),
      columns: { id: true },
    });
    if (!participant) return null;

    if (session.programme?.type === "GROUP") {
      const member = await db.query.programmeAssignmentMember.findFirst({
        where: eq(assignmentMemberTable.participantId, participant.id),
        with: {
          assignment: {
            columns: {
              id: true,
              programmeId: true,
              teamNumber: true,
            },
          },
        },
      });
      if (member?.assignment?.programmeId === session.programmeId) {
        return {
          assignmentId: member.assignment.id,
          participantId: participant.id,
          teamNumber: member.assignment.teamNumber,
        };
      }
    } else {
      const assignment = await db.query.programmeAssignment.findFirst({
        where: and(
          eq(assignmentTable.programmeId, session.programmeId),
          eq(assignmentTable.participantId, participant.id),
        ),
        columns: { id: true, teamNumber: true },
      });
      if (assignment) {
        return {
          assignmentId: assignment.id,
          participantId: participant.id,
          teamNumber: assignment.teamNumber,
        };
      }
    }

    return null;
  },

  async save(session: ReportingSession): Promise<ReportingDomainEvent[]> {
    const events = session.getEvents();
    const state = session.toState();
    const nowStr = serverNowIso();

    await db.transaction(async (tx) => {
      const existing = await tx.query.programmeReportingSession.findFirst({
        where: eq(prsTable.id, state.id),
        columns: { id: true },
      });

      const sessionValues = {
        id: state.id,
        festivalId: state.festivalId,
        scheduleEntryId: state.scheduleEntryId,
        programmeId: state.programmeId,
        stageId: state.stageId,
        status: state.status,
        isLocked: state.isLocked,
        startedAt: state.startedAt,
        startedBy: state.startedBy,
        endedAt: state.endedAt,
        endedBy: state.endedBy,
        checkoutCompletedAt: state.checkoutCompletedAt,
        windowEndsAt: state.windowEndsAt,
        updatedAt: nowStr,
      };

      if (existing) {
        await tx
          .update(prsTable)
          .set(sessionValues)
          .where(eq(prsTable.id, state.id));
      } else {
        await tx.insert(prsTable).values(sessionValues as any);
      }

      await tx
        .delete(reportedParticipantTable)
        .where(eq(reportedParticipantTable.reportingSessionId, state.id));

      if (state.reportedParticipants.length > 0) {
        const rows = state.reportedParticipants.map((p) => ({
          id: p.id,
          reportingSessionId: state.id,
          assignmentId: p.assignmentId,
          participantId: p.participantId,
          groupId: p.groupId,
          teamNumber: p.teamNumber,
          assignmentMemberId: p.assignmentMemberId,
          reportedBy: p.reportedBy,
          reportedAt: p.reportedAt,
        }));
        await tx.insert(reportedParticipantTable).values(rows as any);
      }
    });

    session.clearEvents();
    return events;
  },
};
