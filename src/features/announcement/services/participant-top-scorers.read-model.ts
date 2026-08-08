import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  participant as participantTable,
  programmeAssignment,
  programmeAssignmentMember,
  programme as programmeTable,
  result as resultTable,
} from "@/core/database/schema";

export type ParticipantTopScorerRow = {
  id: string;
  rank: number;
  name: string;
  gender: string;
  groupName: string;
  categoryName: string;
  chestNumber: string | null;
  stagePoints: number;
  offstagePoints: number;
  totalPoints: number;
  programmes: {
    id: string;
    name: string;
    type: string;
    stageType: string;
    points: number;
  }[];
};

export async function getParticipantTopScorers(
  festivalId: string,
): Promise<ParticipantTopScorerRow[]> {
  const [participants, results, assignments, assignmentMembers] =
    await Promise.all([
      db.query.participant.findMany({
        where: eq(participantTable.festivalId, festivalId),
        with: {
          group: { columns: { name: true } },
          category: { columns: { name: true } },
        },
      }),
      db
        .select({
          id: resultTable.id,
          points: resultTable.points,
          awardPoints: resultTable.awardPoints,
          isPublished: resultTable.isPublished,
          programmeId: resultTable.programmeId,
          programmeName: programmeTable.name,
          programmeType: programmeTable.type,
          programmeStageType: programmeTable.stageType,
          assignmentId: resultTable.assignmentId,
        })
        .from(resultTable)
        .innerJoin(
          programmeTable,
          eq(resultTable.programmeId, programmeTable.id),
        )
        .where(
          and(
            eq(resultTable.festivalId, festivalId),
            eq(resultTable.isPublished, true),
          ),
        ),
      db.query.programmeAssignment.findMany({
        where: eq(programmeAssignment.festivalId, festivalId),
      }),
      db.query.programmeAssignmentMember.findMany({
        where: eq(programmeAssignmentMember.festivalId, festivalId),
      }),
    ]);

  const assignmentToParticipants = new Map<string, string[]>();
  for (const a of assignments) {
    if (a.participantId) {
      assignmentToParticipants.set(a.id, [a.participantId]);
    }
  }
  for (const am of assignmentMembers) {
    const list = assignmentToParticipants.get(am.assignmentId) ?? [];
    list.push(am.participantId);
    assignmentToParticipants.set(am.assignmentId, list);
  }

  const participantPoints = new Map<
    string,
    {
      stage: number;
      offstage: number;
      programmes: ParticipantTopScorerRow["programmes"];
    }
  >();

  for (const p of participants) {
    participantPoints.set(p.id, { stage: 0, offstage: 0, programmes: [] });
  }

  for (const r of results) {
    const pts = r.awardPoints ?? r.points ?? 0;
    const isStage = r.programmeStageType === "STAGE";
    const participantsInAssignment =
      assignmentToParticipants.get(r.assignmentId) ?? [];

    for (const pid of participantsInAssignment) {
      const data = participantPoints.get(pid);
      if (data) {
        if (isStage) data.stage += pts;
        else data.offstage += pts;
        data.programmes.push({
          id: r.programmeId,
          name: r.programmeName,
          type: r.programmeType,
          stageType: r.programmeStageType,
          points: pts,
        });
      }
    }
  }

  return participants
    .map((p) => {
      const data = participantPoints.get(p.id)!;
      return {
        id: p.id,
        rank: 0, // Computed below
        name: p.name,
        gender: p.gender,
        groupName: p.group?.name ?? "-",
        categoryName: p.category?.name ?? "-",
        chestNumber: p.chestNumber,
        stagePoints: data.stage,
        offstagePoints: data.offstage,
        totalPoints: data.stage + data.offstage,
        programmes: data.programmes,
      };
    })
    .filter((p) => p.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
