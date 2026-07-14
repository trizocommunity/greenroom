import { and, count, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  programme as programmeTable,
  result as resultTable,
} from "@/core/database/schema";
import { AppError } from "@/core/errors/errors";
import { resolveScoringPolicy } from "@/features/judgment/services/scoring-policy.service";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";
import { ResultModel } from "@/features/results/repositories/result.repository";
import { calculatePosition } from "@/features/results/services/results-calculator";

export type BasicScoreRow =
  | { kind: "assignment"; assignmentId: string; points: number }
  | { kind: "team"; groupId: string; teamNumber: number; points: number };

function validatePoints(points: number) {
  if (!Number.isFinite(points) || points < 0 || points > 100) {
    throw new AppError("Score must be between 0 and 100.");
  }
}

async function countTeamMembers(
  programmeId: string,
  groupId: string,
  teamNumber: number,
): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(assignmentTable)
    .where(
      and(
        eq(assignmentTable.programmeId, programmeId),
        eq(assignmentTable.groupId, groupId),
        eq(assignmentTable.teamNumber, teamNumber),
      ),
    );
  return Math.max(1, row?.c ?? 0);
}

export async function saveBasicProgrammeScores(input: {
  festivalId: string;
  programmeId: string;
  rows: BasicScoreRow[];
}) {
  const programme = await db.query.programme.findFirst({
    where: eq(programmeTable.id, input.programmeId),
    columns: {
      id: true,
      festivalId: true,
      categoryId: true,
      type: true,
    },
  });

  if (!programme || programme.festivalId !== input.festivalId) {
    throw new AppError("Programme not found.");
  }

  const assignments = await db.query.programmeAssignment.findMany({
    where: eq(assignmentTable.programmeId, input.programmeId),
    columns: {
      id: true,
      groupId: true,
      teamNumber: true,
    },
  });

  if (assignments.length === 0) {
    throw new AppError("No assignments found for this programme.");
  }

  const pointsByAssignment = new Map<string, number>();

  for (const row of input.rows) {
    validatePoints(row.points);
    const rounded = Math.round(row.points);

    if (row.kind === "assignment") {
      if (!assignments.some((a) => a.id === row.assignmentId)) {
        throw new AppError("Invalid assignment for this programme.");
      }
      pointsByAssignment.set(row.assignmentId, rounded);
      continue;
    }

    const teamAssignments = assignments.filter(
      (a) =>
        a.groupId === row.groupId && (a.teamNumber ?? 1) === row.teamNumber,
    );
    if (teamAssignments.length === 0) {
      throw new AppError("No assignments found for this team.");
    }
    for (const a of teamAssignments) {
      pointsByAssignment.set(a.id, rounded);
    }
  }

  if (pointsByAssignment.size === 0) {
    throw new AppError("Enter at least one score before saving.");
  }

  const allPoints = Array.from(pointsByAssignment.values());
  const resolvedByAssignment = new Map<
    string,
    {
      grade: string | null;
      awardPoints: number;
      policyVersion: number;
      remarks: string;
    }
  >();

  for (const [assignmentId, points] of pointsByAssignment) {
    const assignment = assignments.find((a) => a.id === assignmentId)!;
    let participantsCount = 1;
    if (programme.type === "GROUP" && assignment.groupId) {
      participantsCount = await countTeamMembers(
        input.programmeId,
        assignment.groupId,
        assignment.teamNumber ?? 1,
      );
    }

    const policyResolved = await resolveScoringPolicy({
      festivalId: input.festivalId,
      programme: {
        id: programme.id,
        categoryId: programme.categoryId,
        type: programme.type,
      },
      participantsCount,
      points,
    });

    const remarks =
      policyResolved.grade === null
        ? "No grade (below threshold)"
        : "Grade resolved by scoring policy";

    resolvedByAssignment.set(assignmentId, {
      grade: policyResolved.grade,
      awardPoints: policyResolved.awardPoints,
      policyVersion: policyResolved.policyVersion,
      remarks,
    });
  }

  for (const [assignmentId, points] of pointsByAssignment) {
    const resolved = resolvedByAssignment.get(assignmentId)!;
    const position = calculatePosition(points, allPoints);

    await ResultModel.upsert(assignmentId, {
      festivalId: input.festivalId,
      programmeId: input.programmeId,
      assignmentId,
      grade: resolved.grade,
      position,
      points,
      awardPoints: resolved.awardPoints,
      scoringPolicyVersion: resolved.policyVersion,
      remarks: resolved.remarks,
      isPublished: false,
    });
  }

  await updateProgrammeStatus(input.programmeId);

  return { savedCount: pointsByAssignment.size };
}

export async function assertProgrammeReadyToPublish(programmeId: string) {
  const [assignmentRow] = await db
    .select({ c: count() })
    .from(assignmentTable)
    .where(eq(assignmentTable.programmeId, programmeId));

  const [resultRow] = await db
    .select({ c: count() })
    .from(resultTable)
    .where(eq(resultTable.programmeId, programmeId));

  const assignmentTotal = assignmentRow?.c ?? 0;
  const resultTotal = resultRow?.c ?? 0;

  if (assignmentTotal === 0) {
    throw new AppError("This programme has no assignments.");
  }
  if (resultTotal < assignmentTotal) {
    throw new AppError(
      "Publish when every assigned student or team has a saved score.",
    );
  }
}
