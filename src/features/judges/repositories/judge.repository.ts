import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  judgementScore as judgementScoreTable,
  judge as judgeTable,
  stage as stageTable,
} from "@/core/database/schema";

export type FestivalJudgeWithAssignments = {
  id: string;
  name: string;
  description: string | null;
  activities: Array<{
    configId: string;
    judgingMode: string;
    status: string;
    programme: { id: string; name: string } | null;
    stage: { id: string; name: string } | null;
    judgedPointsCount: number;
    averagePoints: number | null;
  }>;
  programmes: Array<{ id: string; name: string }>;
  /** Stages this judge has actually judged at (derived from judgement history). */
  stages: Array<{ id: string; name: string }>;
  /** Stages this judge is explicitly assigned to (judge_stage_assignment). */
  assignedStages: Array<{ id: string; name: string }>;
};

export async function listFestivalJudgesWithAssignments(
  festivalId: string,
): Promise<FestivalJudgeWithAssignments[]> {
  const judges = await db.query.judge.findMany({
    where: eq(judgeTable.festivalId, festivalId),
    orderBy: [asc(judgeTable.name)],
    with: {
      judgementConfigJudges: {
        with: {
          judgementConfig: {
            columns: { id: true, judgingMode: true, status: true },
            with: {
              programme: { columns: { id: true, name: true } },
              programmeReportingSession: {
                columns: { id: true, stageId: true },
              },
            },
          },
        },
      },
      stageAssignments: {
        with: {
          stage: { columns: { id: true, name: true } },
        },
      },
    },
  });

  const stageIds = Array.from(
    new Set(
      judges.flatMap((judge) =>
        judge.judgementConfigJudges
          .map((row) => row.judgementConfig.programmeReportingSession?.stageId)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  );

  const stages =
    stageIds.length > 0
      ? await db.query.stage.findMany({
          where: inArray(stageTable.id, stageIds),
          columns: { id: true, name: true },
        })
      : [];
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const judgeIds = judges.map((judge) => judge.id);
  const configIds = Array.from(
    new Set(
      judges.flatMap((judge) =>
        judge.judgementConfigJudges.map((row) => row.judgementConfig.id),
      ),
    ),
  );
  const configIdSet = new Set(configIds);
  const judgementScores =
    judgeIds.length > 0 && configIds.length > 0
      ? await db.query.judgementScore.findMany({
          where: inArray(judgementScoreTable.judgeId, judgeIds),
          columns: {
            judgeId: true,
            configId: true,
            score: true,
          },
        })
      : [];
  const scoreStatsByJudgeConfig = new Map<
    string,
    { totalPoints: number; count: number }
  >();
  for (const row of judgementScores) {
    if (!configIdSet.has(row.configId)) continue;
    const key = `${row.judgeId}:${row.configId}`;
    const prev = scoreStatsByJudgeConfig.get(key) ?? {
      totalPoints: 0,
      count: 0,
    };
    prev.totalPoints += row.score;
    prev.count += 1;
    scoreStatsByJudgeConfig.set(key, prev);
  }

  return judges.map((judge) => {
    const programmeMap = new Map<string, { id: string; name: string }>();
    const stageMap = new Map<string, { id: string; name: string }>();

    const activities = judge.judgementConfigJudges.map((row) => {
      const config = row.judgementConfig;
      const programme = config.programme
        ? {
            id: config.programme.id,
            name: config.programme.name,
          }
        : null;
      const stageId = config.programmeReportingSession?.stageId ?? null;
      const stageRecord = stageId ? stageById.get(stageId) : null;
      const stage = stageRecord
        ? {
            id: stageRecord.id,
            name: stageRecord.name,
          }
        : null;

      if (programme) programmeMap.set(programme.id, programme);
      if (stage) stageMap.set(stage.id, stage);
      const scoreStats = scoreStatsByJudgeConfig.get(
        `${judge.id}:${config.id}`,
      );
      const judgedPointsCount = scoreStats?.count ?? 0;
      const averagePoints =
        scoreStats && scoreStats.count > 0
          ? Number((scoreStats.totalPoints / scoreStats.count).toFixed(2))
          : null;

      return {
        configId: config.id,
        judgingMode: config.judgingMode,
        status: config.status,
        programme,
        stage,
        judgedPointsCount,
        averagePoints,
      };
    });

    return {
      id: judge.id,
      name: judge.name,
      description: judge.description,
      activities,
      programmes: Array.from(programmeMap.values()),
      stages: Array.from(stageMap.values()),
      assignedStages: judge.stageAssignments.map((row) => row.stage),
    };
  });
}
