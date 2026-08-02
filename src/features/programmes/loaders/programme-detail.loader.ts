import "server-only";

import { and, count, countDistinct, desc, eq, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  auditLog,
  judgementConfig as judgementConfigTable,
  judgementScore as judgementScoreTable,
  judge as judgeTable,
  participant as participantTable,
  programme as programmeTable,
  programmeTeamLead as programmeTeamLeadTable,
  programmeReportedParticipant as reportedParticipantTable,
  programmeReportingSession as reportingSessionTable,
  result as resultTable,
  user as userTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";

export interface ProgrammeDetailForDrawer {
  programme: {
    id: string;
    name: string;
    type: "INDIVIDUAL" | "GROUP";
    createdByEmail: string | null;
    createdByName: string | null;
    publishedByEmail: string | null;
    publishedByName: string | null;
    publishedAt: string | null;
  };
  counts: {
    totalAssigned: number;
    reported: number;
    judged: number;
    scored: number;
    published: number;
    announced: number;
  };
  reportingSession: {
    startedAt: string | null;
    startedByName: string | null;
    endedAt: string | null;
    endedByName: string | null;
  } | null;
  judgingSession: {
    judgeCount: number;
    scoreCount: number;
  } | null;
  results: {
    savedAt: string | null;
    savedByName: string | null;
    publishedAt: string | null;
    publishedByName: string | null;
    announcedAt: string | null;
    announcedByName: string | null;
  };
  teamLeads: Record<
    string,
    Record<
      number,
      {
        participantId: string;
        participantName: string;
        chestNumber: string | null;
      }
    >
  >;
  auditTimeline: Array<{
    at: string;
    action: string;
    actorName: string;
    actorEmail: string | null;
    targetType: string;
    targetId: string;
  }>;
}

async function resolveActorName(actorId: string, actorRole: string) {
  if (actorRole === "TEAM_LEADER") {
    const participant = await db.query.participant.findFirst({
      where: eq(participantTable.id, actorId),
      columns: { name: true },
    });
    return {
      name: participant?.name ?? "Team Leader",
      email: null as string | null,
    };
  }
  if (actorRole === "JUDGE") {
    const judge = await db.query.judge.findFirst({
      where: eq(judgeTable.id, actorId),
      columns: { name: true },
    });
    return { name: judge?.name ?? "Judge", email: null as string | null };
  }
  const user = await db.query.user.findFirst({
    where: eq(userTable.id, actorId),
    columns: { displayName: true, fullName: true, email: true },
  });
  return {
    name: user?.displayName || user?.fullName || user?.email || actorRole,
    email: user?.email ?? null,
  };
}

/** Read-only, drawer-scoped summary of a single programme's lifecycle. No transaction needed. */
export async function getProgrammeDetailForDrawer(
  programmeId: string,
): Promise<ProgrammeDetailForDrawer> {
  const programme = await db.query.programme.findFirst({
    where: eq(programmeTable.id, programmeId),
  });
  if (!programme) throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);

  const [
    totalAssignedRows,
    reportedRows,
    scoredRows,
    judgedRows,
    publishedRows,
    announcedRows,
    reportingSession,
    judgingConfig,
    teamLeadRows,
    resultRows,
    auditRows,
  ] = await Promise.all([
    db
      .select({ c: count() })
      .from(assignmentTable)
      .where(eq(assignmentTable.programmeId, programmeId)),
    db
      .select({ c: count() })
      .from(reportedParticipantTable)
      .innerJoin(
        assignmentTable,
        eq(reportedParticipantTable.assignmentId, assignmentTable.id),
      )
      .where(eq(assignmentTable.programmeId, programmeId)),
    db
      .select({ c: countDistinct(judgementScoreTable.codeLetterId) })
      .from(judgementScoreTable)
      .innerJoin(
        judgementConfigTable,
        eq(judgementScoreTable.configId, judgementConfigTable.id),
      )
      .where(eq(judgementConfigTable.programmeId, programmeId)),
    db
      .select({ c: countDistinct(judgementScoreTable.judgeId) })
      .from(judgementScoreTable)
      .innerJoin(
        judgementConfigTable,
        eq(judgementScoreTable.configId, judgementConfigTable.id),
      )
      .where(eq(judgementConfigTable.programmeId, programmeId)),
    db
      .select({ c: count() })
      .from(resultTable)
      .where(
        and(
          eq(resultTable.programmeId, programmeId),
          eq(resultTable.isPublished, true),
        ),
      ),
    db
      .select({ c: count() })
      .from(resultTable)
      .where(
        and(
          eq(resultTable.programmeId, programmeId),
          eq(resultTable.isAnnounced, true),
        ),
      ),
    db.query.programmeReportingSession.findFirst({
      where: eq(reportingSessionTable.programmeId, programmeId),
      orderBy: [desc(reportingSessionTable.createdAt)],
      columns: {
        startedAt: true,
        startedBy: true,
        endedAt: true,
        endedBy: true,
      },
    }),
    db.query.judgementConfig.findFirst({
      where: eq(judgementConfigTable.programmeId, programmeId),
      orderBy: [desc(judgementConfigTable.createdAt)],
      columns: { id: true },
      with: { judges: { columns: { id: true } } },
    }),
    db.query.programmeTeamLead.findMany({
      where: eq(programmeTeamLeadTable.programmeId, programmeId),
      with: {
        participant: { columns: { id: true, name: true, chestNumber: true } },
      },
    }),
    db.query.result.findMany({
      where: eq(resultTable.programmeId, programmeId),
      columns: {
        updatedAt: true,
        savedByName: true,
        savedByEmail: true,
        publishedByName: true,
        publishedByEmail: true,
        announcedAt: true,
        announcedByName: true,
        announcedByEmail: true,
      },
      orderBy: [desc(resultTable.updatedAt)],
      limit: 1,
    }),
    db
      .select()
      .from(auditLog)
      .where(sql`${auditLog.metadata}->>'programmeId' = ${programmeId}`)
      .orderBy(desc(auditLog.createdAt))
      .limit(100),
  ]);

  const teamLeads: ProgrammeDetailForDrawer["teamLeads"] = {};
  for (const row of teamLeadRows as any[]) {
    teamLeads[row.groupId] ??= {};
    teamLeads[row.groupId][row.teamNumber] = {
      participantId: row.participantId,
      participantName: row.participant?.name ?? "",
      chestNumber: row.participant?.chestNumber ?? null,
    };
  }

  const latestResult = resultRows[0];

  const auditTimeline = await Promise.all(
    auditRows.map(async (row) => {
      const actor = await resolveActorName(row.actorId, row.actorRole);
      return {
        at: row.createdAt,
        action: row.action,
        actorName: actor.name,
        actorEmail: actor.email,
        targetType: row.targetType,
        targetId: row.targetId,
      };
    }),
  );

  return {
    programme: {
      id: programme.id,
      name: programme.name,
      type: programme.type,
      createdByEmail: programme.createdByEmail,
      createdByName: programme.createdByName,
      publishedByEmail: programme.publishedByEmail,
      publishedByName: programme.publishedByName,
      publishedAt: programme.publishedAt,
    },
    counts: {
      totalAssigned: totalAssignedRows[0]?.c ?? 0,
      reported: reportedRows[0]?.c ?? 0,
      judged: judgedRows[0]?.c ?? 0,
      scored: scoredRows[0]?.c ?? 0,
      published: publishedRows[0]?.c ?? 0,
      announced: announcedRows[0]?.c ?? 0,
    },
    reportingSession: reportingSession
      ? {
          startedAt: reportingSession.startedAt,
          startedByName: reportingSession.startedBy,
          endedAt: reportingSession.endedAt,
          endedByName: reportingSession.endedBy,
        }
      : null,
    judgingSession: judgingConfig
      ? {
          judgeCount: judgingConfig.judges.length,
          scoreCount: scoredRows[0]?.c ?? 0,
        }
      : null,
    results: {
      savedAt: latestResult?.updatedAt ?? null,
      savedByName: latestResult?.savedByName ?? null,
      publishedAt: null,
      publishedByName: latestResult?.publishedByName ?? null,
      announcedAt: latestResult?.announcedAt ?? null,
      announcedByName: latestResult?.announcedByName ?? null,
    },
    teamLeads,
    auditTimeline,
  };
}
