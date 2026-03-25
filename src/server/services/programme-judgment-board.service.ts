"use server";

import { prisma } from "@/lib/db";

export type JudgingAssignmentRow = {
  assignmentId: string;
  teamNumber: number;
  student: { id: string; name: string; chestNumber: string | null } | null;
  group: { id: string; name: string } | null;
  result: {
    id: string;
    points: number;
    grade: string | null;
    position: number | null;
    remarks: string | null;
    isPublished: boolean;
  } | null;
};

export type JudgingProgrammeRow = {
  programmeId: string;
  programmeName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  category: { id: string; name: string } | null;
  status: string;

  // When a judge link exists and is still unused.
  openJudgeSession: { startedAt: Date } | null;

  /**
   * Populated for judged programmes (ENDED/PUBLISHED).
   * Used to render a compact "code letter -> points + grade" list.
   */
  codeLetters?: { code: string; points: number; grade: string | null }[];

  assignments: JudgingAssignmentRow[];
};

export type ProgrammeJudgingBoardStage = {
  stage: { id: string; name: string } | null;
  programmesToJudge: JudgingProgrammeRow[];
};

export type ProgrammeJudgingBoard = {
  stages: ProgrammeJudgingBoardStage[];
  judgedProgrammes: JudgingProgrammeRow[];
};

/**
 * Build a stage-based judging board:
 * - Top: reporting ended programmes (STARTED) grouped by stage.
 * - Bottom: judged programmes (ENDED/PUBLISHED) across all stages.
 */
export async function getProgrammeJudgingBoard(
  festivalId: string,
): Promise<ProgrammeJudgingBoard> {
  const assignedRows = await prisma.programmeAssignment.groupBy({
    by: ["programmeId"],
    where: { festivalId },
  });

  const programmeIds = assignedRows.map((r) => r.programmeId);
  if (programmeIds.length === 0) {
    return { stages: [], judgedProgrammes: [] };
  }

  // Determine stage per programme using the earliest schedule entry.
  const scheduleEntries = await prisma.scheduleEntry.findMany({
    where: {
      festivalId,
      type: "PROGRAMME",
      programmeId: { in: programmeIds },
    },
    select: {
      programmeId: true,
      startTime: true,
      stage: { select: { id: true, name: true } },
    },
    orderBy: [{ startTime: "asc" }],
  });

  const stageByProgrammeId = new Map<
    string,
    { id: string; name: string } | null
  >();
  for (const entry of scheduleEntries) {
    if (!entry.programmeId) continue; // Schedule entries may be null-linked.
    if (!stageByProgrammeId.has(entry.programmeId)) {
      stageByProgrammeId.set(entry.programmeId, entry.stage);
    }
  }

  const programmes = await prisma.programme.findMany({
    where: { id: { in: programmeIds } },
    select: {
      id: true,
      name: true,
      status: true,
      type: true,
      category: { select: { id: true, name: true } },
      judgeSessions: {
        where: { usedAt: null },
        take: 1,
        orderBy: { startedAt: "desc" },
        select: { startedAt: true },
      },
      assignments: {
        select: {
          id: true,
          teamNumber: true,
          student: { select: { id: true, name: true, chestNumber: true } },
          group: { select: { id: true, name: true } },
          result: {
            select: {
              id: true,
              points: true,
              grade: true,
              position: true,
              remarks: true,
              isPublished: true,
            },
          },
        },
      },
    },
  });

  const programmesToJudge: JudgingProgrammeRow[] = programmes
    .filter((p) => p.status === "STARTED")
    .map((p) => ({
      programmeId: p.id,
      programmeName: p.name,
      programmeType: p.type,
      category: p.category,
      status: p.status,
      openJudgeSession: p.judgeSessions[0]
        ? { startedAt: p.judgeSessions[0]!.startedAt }
        : null,
      assignments: p.assignments.map((a) => ({
        assignmentId: a.id,
        teamNumber: a.teamNumber,
        student: a.student
          ? {
              id: a.student.id,
              name: a.student.name,
              chestNumber: a.student.chestNumber,
            }
          : null,
        group: a.group ? { id: a.group.id, name: a.group.name } : null,
        result: a.result
          ? {
              id: a.result.id,
              points: a.result.points,
              grade: a.result.grade,
              position: a.result.position,
              remarks: a.result.remarks,
              isPublished: a.result.isPublished,
            }
          : null,
      })),
    }));

  const judgedProgrammes: JudgingProgrammeRow[] = programmes
    .filter((p) => p.status === "ENDED" || p.status === "PUBLISHED")
    .map((p) => ({
      programmeId: p.id,
      programmeName: p.name,
      programmeType: p.type,
      category: p.category,
      status: p.status,
      openJudgeSession: p.judgeSessions[0]
        ? { startedAt: p.judgeSessions[0]!.startedAt }
        : null,
      assignments: p.assignments.map((a) => ({
        assignmentId: a.id,
        teamNumber: a.teamNumber,
        student: a.student
          ? {
              id: a.student.id,
              name: a.student.name,
              chestNumber: a.student.chestNumber,
            }
          : null,
        group: a.group ? { id: a.group.id, name: a.group.name } : null,
        result: a.result
          ? {
              id: a.result.id,
              points: a.result.points,
              grade: a.result.grade,
              position: a.result.position,
              remarks: a.result.remarks,
              isPublished: a.result.isPublished,
            }
          : null,
      })),
    }));

  const stageNames = new Map<string, { id: string; name: string } | null>();
  // Include stages even if they currently have 0 STARTED programmes.
  // This keeps tabs consistent (min height / stable layout).
  for (const [, stage] of stageByProgrammeId.entries()) {
    const key = stage?.id ?? "__none__";
    if (!stageNames.has(key)) {
      stageNames.set(key, stage);
    }
  }

  const stages: ProgrammeJudgingBoardStage[] = [];
  for (const [, stage] of stageNames.entries()) {
    const programmesInStage = programmesToJudge.filter((p) => {
      const s = stageByProgrammeId.get(p.programmeId) ?? null;
      if (stage === null) return s === null;
      if (s === null) return false;
      return s.id === stage.id;
    });
    stages.push({ stage, programmesToJudge: programmesInStage });
  }

  // Sort stages by name (null stage last).
  stages.sort((a, b) => {
    const an = a.stage?.name ?? "";
    const bn = b.stage?.name ?? "";
    if (!a.stage) return 1;
    if (!b.stage) return -1;
    return an.localeCompare(bn, undefined, { sensitivity: "base" });
  });

  // Keep programmes stable order (name).
  for (const s of stages) {
    s.programmesToJudge.sort((a, b) =>
      a.programmeName.localeCompare(b.programmeName, undefined, {
        sensitivity: "base",
      }),
    );
  }
  judgedProgrammes.sort((a, b) =>
    a.programmeName.localeCompare(b.programmeName, undefined, {
      sensitivity: "base",
    }),
  );

  // Attach code letters (and resolve points/grade per code letter) for judged programmes.
  if (judgedProgrammes.length > 0) {
    await Promise.all(
      judgedProgrammes.map(async (p) => {
        const latestUsedJudgeSession =
          await prisma.programmeJudgeSession.findFirst({
            where: { programmeId: p.programmeId, usedAt: { not: null } },
            orderBy: { startedAt: "desc" },
            select: { reportingSessionId: true },
          });

        if (!latestUsedJudgeSession?.reportingSessionId) return;

        const codeLetters = await prisma.programmeCodeLetter.findMany({
          where: {
            programmeId: p.programmeId,
            reportingSessionId: latestUsedJudgeSession.reportingSessionId,
          },
          orderBy: { issuedAt: "asc" },
          select: {
            code: true,
            recipients: { select: { studentId: true } },
          },
        });

        const assignmentByStudentId = new Map<
          string,
          { points: number; grade: string | null }
        >();

        for (const a of p.assignments) {
          const sid = a.student?.id;
          if (!sid || !a.result) continue;
          assignmentByStudentId.set(sid, {
            points: a.result.points,
            grade: a.result.grade,
          });
        }

        p.codeLetters = codeLetters.map((cl) => {
          let found:
            | { points: number; grade: string | null }
            | undefined;

          for (const r of cl.recipients) {
            const row = assignmentByStudentId.get(r.studentId);
            if (row) {
              found = row;
              break;
            }
          }

          return {
            code: cl.code,
            points: found?.points ?? 0,
            grade: found?.grade ?? null,
          };
        });
      }),
    );
  }

  return { stages, judgedProgrammes };
}
