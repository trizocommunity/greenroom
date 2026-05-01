"use server";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  notInArray,
  sql,
} from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeCodeLetter as codeLetterTable,
  programmeJudgeSession as judgeSessionTable,
  programme as programmeTable,
  scheduleEntry as scheduleEntryTable,
} from "@/core/database/schema";

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
  openJudgeSession: { startedAt: string } | null;
  latestUsedJudgeSession: {
    startedAt: string;
    usedAt: string | null;
    createdBy: string | null;
    submittedByName: string | null;
    submittedByContact: string | null;
    submittedByNote: string | null;
  } | null;
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

export async function getProgrammeJudgingBoard(
  festivalId: string,
): Promise<ProgrammeJudgingBoard> {
  const assignedRows = await db
    .select({ programmeId: assignmentTable.programmeId })
    .from(assignmentTable)
    .where(eq(assignmentTable.festivalId, festivalId))
    .groupBy(assignmentTable.programmeId);

  const programmeIds = assignedRows.map((r) => r.programmeId);
  if (programmeIds.length === 0) {
    return { stages: [], judgedProgrammes: [] };
  }

  const scheduleEntries = await db.query.scheduleEntry.findMany({
    where: and(
      eq(scheduleEntryTable.festivalId, festivalId),
      eq(scheduleEntryTable.type, "PROGRAMME"),
      inArray(scheduleEntryTable.programmeId, programmeIds),
    ),
    with: {
      stage: { columns: { id: true, name: true } },
    },
    orderBy: [asc(scheduleEntryTable.startTime)],
  });

  const stageByProgrammeId = new Map<
    string,
    { id: string; name: string } | null
  >();
  for (const entry of scheduleEntries) {
    if (!entry.programmeId) continue;
    if (!stageByProgrammeId.has(entry.programmeId)) {
      stageByProgrammeId.set(entry.programmeId, entry.stage);
    }
  }

  const programmes = await db.query.programme.findMany({
    where: inArray(programmeTable.id, programmeIds),
    with: {
      category: { columns: { id: true, name: true } },
      assignments: {
        with: {
          student: { columns: { id: true, name: true, chestNumber: true } },
          group: { columns: { id: true, name: true } },
          result: {
            columns: {
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

  const openSessions = await db.query.programmeJudgeSession.findMany({
    where: and(
      inArray(judgeSessionTable.programmeId, programmeIds),
      isNull(judgeSessionTable.usedAt),
    ),
    orderBy: [
      asc(judgeSessionTable.programmeId),
      desc(judgeSessionTable.startedAt),
    ],
    columns: { programmeId: true, startedAt: true },
  });

  const latestOpenByProgrammeId = new Map<string, { startedAt: string }>();
  for (const s of openSessions) {
    if (!latestOpenByProgrammeId.has(s.programmeId)) {
      latestOpenByProgrammeId.set(s.programmeId, { startedAt: s.startedAt });
    }
  }

  const usedSessions = await db.query.programmeJudgeSession.findMany({
    where: and(
      inArray(judgeSessionTable.programmeId, programmeIds),
      isNotNull(judgeSessionTable.usedAt),
    ),
    orderBy: [
      asc(judgeSessionTable.programmeId),
      desc(judgeSessionTable.usedAt),
    ],
    columns: {
      programmeId: true,
      startedAt: true,
      usedAt: true,
      createdBy: true,
      submittedByName: true,
      submittedByContact: true,
      submittedByNote: true,
    },
  });

  const latestUsedByProgrammeId = new Map<
    string,
    {
      startedAt: string;
      usedAt: string | null;
      createdBy: string | null;
      submittedByName: string | null;
      submittedByContact: string | null;
      submittedByNote: string | null;
    }
  >();
  for (const s of usedSessions) {
    if (!latestUsedByProgrammeId.has(s.programmeId)) {
      latestUsedByProgrammeId.set(s.programmeId, {
        startedAt: s.startedAt,
        usedAt: s.usedAt,
        createdBy: s.createdBy ?? null,
        submittedByName: s.submittedByName ?? null,
        submittedByContact: s.submittedByContact ?? null,
        submittedByNote: s.submittedByNote ?? null,
      });
    }
  }

  const programmesToJudge: JudgingProgrammeRow[] = programmes
    .filter((p) => p.status === "STARTED")
    .map((p) => ({
      programmeId: p.id,
      programmeName: p.name,
      programmeType: p.type as any,
      category: p.category,
      status: p.status as any,
      openJudgeSession: latestOpenByProgrammeId.get(p.id) ?? null,
      latestUsedJudgeSession: latestUsedByProgrammeId.get(p.id) ?? null,
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
      programmeType: p.type as any,
      category: p.category,
      status: p.status as any,
      openJudgeSession: latestOpenByProgrammeId.get(p.id) ?? null,
      latestUsedJudgeSession: latestUsedByProgrammeId.get(p.id) ?? null,
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

  stages.sort((a, b) => {
    const an = a.stage?.name ?? "";
    const bn = b.stage?.name ?? "";
    if (!a.stage) return 1;
    if (!b.stage) return -1;
    return an.localeCompare(bn, undefined, { sensitivity: "base" });
  });

  for (const s of stages) {
    s.programmesToJudge.sort((a, b) =>
      a.programmeName.localeCompare(b.programmeName, undefined, {
        sensitivity: "base",
      }),
    );
  }

  judgedProgrammes.sort((a, b) => {
    const at = a.latestUsedJudgeSession?.usedAt
      ? new Date(a.latestUsedJudgeSession.usedAt).getTime()
      : 0;
    const bt = b.latestUsedJudgeSession?.usedAt
      ? new Date(b.latestUsedJudgeSession.usedAt).getTime()
      : 0;
    if (bt !== at) return bt - at;
    return a.programmeName.localeCompare(b.programmeName, undefined, {
      sensitivity: "base",
    });
  });

  if (judgedProgrammes.length > 0) {
    await Promise.all(
      judgedProgrammes.map(async (p) => {
        const latestUsedJudgeSession =
          await db.query.programmeJudgeSession.findFirst({
            where: and(
              eq(judgeSessionTable.programmeId, p.programmeId),
              isNotNull(judgeSessionTable.usedAt),
            ),
            orderBy: [desc(judgeSessionTable.startedAt)],
            columns: { reportingSessionId: true },
          });

        if (!latestUsedJudgeSession?.reportingSessionId) return;

        const codeLetters = await db.query.programmeCodeLetter.findMany({
          where: and(
            eq(codeLetterTable.programmeId, p.programmeId),
            eq(
              codeLetterTable.reportingSessionId,
              latestUsedJudgeSession.reportingSessionId,
            ),
          ),
          orderBy: [asc(codeLetterTable.issuedAt)],
          with: {
            programmeCodeLetterRecipients: { columns: { studentId: true } },
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
          let found: { points: number; grade: string | null } | undefined;

          for (const r of cl.programmeCodeLetterRecipients) {
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
