import { and, desc, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  participant as participantTable,
  programme as programmeTable,
} from "@/core/database/schema";

export type ParticipantSummaryForParticipantPage = {
  id: string;
  name: string;
  profileSlug: string | null;
  chestNumber: string | null;
  isTeamLeader: boolean;
  groupId: string | null;
  group: { id: string; name: string; color: string } | null;
  category: { id: string; name: string; type: string | null } | null;
};

type DerivedTeamContextKey = {
  programmeId: string;
  groupId: string;
  teamNumber: number;
};

export async function getTeamLeaderMyParticipants(
  festivalId: string,
  leaderParticipantId: string,
) {
  const leader = await db.query.participant.findFirst({
    where: and(
      eq(participantTable.id, leaderParticipantId),
      eq(participantTable.festivalId, festivalId),
    ),
    with: {
      group: { columns: { id: true, name: true, color: true } },
    },
    columns: {
      id: true,
      groupId: true,
      profileSlug: true,
    },
  });

  if (!leader?.groupId) {
    return {
      myParticipants: [] as ParticipantSummaryForParticipantPage[],
      derivedTeamContexts: [] as DerivedTeamContextKey[],
    };
  }

  const derivedContextsRows = await db.query.programmeAssignment.findMany({
    where: and(
      eq(assignmentTable.festivalId, festivalId),
      eq(assignmentTable.participantId, leaderParticipantId),
      gte(assignmentTable.teamNumber, 1),
      isNotNull(assignmentTable.groupId),
    ),
    with: {
      programme: { columns: { type: true } },
    },
    columns: { programmeId: true, groupId: true, teamNumber: true },
  });

  // Filter for GROUP type programmes manually if not using a complex join
  const filteredDerived = derivedContextsRows.filter(
    (row) => row.programme?.type === "GROUP",
  );

  const contextsMap = new Map<string, DerivedTeamContextKey>();
  for (const row of filteredDerived) {
    if (!row.groupId) continue;
    const key = `${row.programmeId}:${row.groupId}:${row.teamNumber}`;
    contextsMap.set(key, {
      programmeId: row.programmeId,
      groupId: row.groupId,
      teamNumber: row.teamNumber,
    });
  }
  const derivedTeamContexts = Array.from(contextsMap.values());

  const myParticipantsMap = new Map<
    string,
    ParticipantSummaryForParticipantPage
  >();

  if (derivedTeamContexts.length > 0) {
    for (const ctx of derivedTeamContexts) {
      const participants = await db.query.programmeAssignment.findMany({
        where: and(
          eq(assignmentTable.festivalId, festivalId),
          eq(assignmentTable.programmeId, ctx.programmeId),
          eq(assignmentTable.groupId, ctx.groupId),
          eq(assignmentTable.teamNumber, ctx.teamNumber),
          isNotNull(assignmentTable.participantId),
        ),
        with: {
          participant: {
            with: {
              group: { columns: { id: true, name: true, color: true } },
              category: { columns: { id: true, name: true, type: true } },
            },
          },
        },
      });

      for (const p of participants) {
        if (!p.participant) continue;
        myParticipantsMap.set(p.participant.id, p.participant as any);
      }
    }
  }

  if (myParticipantsMap.size === 0) {
    const groupParticipants = await db.query.participant.findMany({
      where: and(
        eq(participantTable.festivalId, festivalId),
        eq(participantTable.groupId, leader.groupId),
      ),
      with: {
        group: { columns: { id: true, name: true, color: true } },
        category: { columns: { id: true, name: true, type: true } },
      },
      orderBy: [desc(participantTable.createdAt)],
    });

    for (const s of groupParticipants) myParticipantsMap.set(s.id, s as any);
  }

  return {
    myParticipants: Array.from(myParticipantsMap.values()),
    derivedTeamContexts,
  };
}

export async function getTeamLeaderGroupParticipantsForSelection(
  festivalId: string,
  leaderParticipantId: string,
) {
  const leader = await db.query.participant.findFirst({
    where: and(
      eq(participantTable.id, leaderParticipantId),
      eq(participantTable.festivalId, festivalId),
    ),
    columns: { groupId: true },
  });

  if (!leader?.groupId) {
    return { groupParticipants: [] as ParticipantSummaryForParticipantPage[] };
  }

  const groupParticipants = await db.query.participant.findMany({
    where: and(
      eq(participantTable.festivalId, festivalId),
      eq(participantTable.groupId, leader.groupId),
    ),
    with: {
      group: { columns: { id: true, name: true, color: true } },
      category: { columns: { id: true, name: true, type: true } },
    },
    orderBy: [desc(participantTable.createdAt)],
  });

  return { groupParticipants: groupParticipants as any[] };
}
