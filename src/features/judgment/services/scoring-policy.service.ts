"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festivalScoringAwardRule as scoringAwardRuleTable,
  festivalScoringPolicy as scoringPolicyTable,
} from "@/core/database/schema";
import { AppError } from "@/core/errors/errors";

export type GradeRule = {
  grade: string;
  min: number;
  max: number;
};

export type AwardRule = {
  id?: string;
  criteriaType: "PARTICIPANT_RANGE" | "PROGRAMME_SET";
  rowLabel?: string | null;
  programmeIds?: string[] | null;
  categoryId?: string | null;
  programmeType?: "INDIVIDUAL" | "GROUP" | null;
  minParticipants: number;
  maxParticipants?: number | null;
  grade: string;
  awardPoints: number;
  priority: number;
};

export type ScoringPolicyData = {
  policyId: string | null;
  policyVersion: number;
  normalizeTo: number;
  noGradeBelow: number;
  gradeRules: GradeRule[];
  awardRules: AwardRule[];
  isPersisted: boolean;
};

const DEFAULT_GRADE_RULES: GradeRule[] = [
  { grade: "A+", min: 90, max: 100 },
  { grade: "A", min: 70, max: 89 },
  { grade: "B", min: 60, max: 69 },
  { grade: "C", min: 50, max: 59 },
];

const DEFAULT_AWARD_RULES: AwardRule[] = [
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "1",
    grade: "A+",
    minParticipants: 1,
    maxParticipants: 1,
    awardPoints: 6,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "1",
    grade: "A",
    minParticipants: 1,
    maxParticipants: 1,
    awardPoints: 5,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "1",
    grade: "B",
    minParticipants: 1,
    maxParticipants: 1,
    awardPoints: 3,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "1",
    grade: "C",
    minParticipants: 1,
    maxParticipants: 1,
    awardPoints: 1,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "2",
    grade: "A+",
    minParticipants: 2,
    maxParticipants: 2,
    awardPoints: 7,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "2",
    grade: "A",
    minParticipants: 2,
    maxParticipants: 2,
    awardPoints: 6,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "2",
    grade: "B",
    minParticipants: 2,
    maxParticipants: 2,
    awardPoints: 4,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "2",
    grade: "C",
    minParticipants: 2,
    maxParticipants: 2,
    awardPoints: 2,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "3",
    grade: "A+",
    minParticipants: 3,
    maxParticipants: 3,
    awardPoints: 10,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "3",
    grade: "A",
    minParticipants: 3,
    maxParticipants: 3,
    awardPoints: 9,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "3",
    grade: "B",
    minParticipants: 3,
    maxParticipants: 3,
    awardPoints: 6,
    priority: 100,
  },
  {
    criteriaType: "PARTICIPANT_RANGE",
    rowLabel: "3",
    grade: "C",
    minParticipants: 3,
    maxParticipants: 3,
    awardPoints: 3,
    priority: 100,
  },
];

const defaultScoringPolicyData = (): ScoringPolicyData => ({
  policyId: null,
  policyVersion: 1,
  normalizeTo: 100,
  noGradeBelow: 50,
  gradeRules: DEFAULT_GRADE_RULES,
  awardRules: DEFAULT_AWARD_RULES,
  isPersisted: false,
});

function isMissingScoringSchemaError(error: unknown): boolean {
  const dbError = error as
    | {
        code?: string;
        message?: string;
        cause?: { code?: string; message?: string };
      }
    | undefined;
  const code = dbError?.cause?.code ?? dbError?.code;
  const message = (
    dbError?.cause?.message ??
    dbError?.message ??
    ""
  ).toLowerCase();
  // Postgres: 42P01 = undefined_table, 42703 = undefined_column
  return (
    code === "42P01" ||
    code === "42703" ||
    message.includes("festival_scoring_policy") ||
    message.includes("festival_scoring_award_rule")
  );
}

function sanitizeGradeRules(input: unknown): GradeRule[] {
  if (!Array.isArray(input)) return DEFAULT_GRADE_RULES;
  const rules = input
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const grade = String(r.grade ?? "").trim();
      const min = Number(r.min);
      const max = Number(r.max);
      if (!grade || !Number.isFinite(min) || !Number.isFinite(max)) return null;
      return {
        grade: grade.toUpperCase(),
        min: Math.max(0, Math.min(100, Math.round(min))),
        max: Math.max(0, Math.min(100, Math.round(max))),
      } satisfies GradeRule;
    })
    .filter((v): v is GradeRule => Boolean(v))
    .sort((a, b) => b.max - a.max);
  return rules.length > 0 ? rules : DEFAULT_GRADE_RULES;
}

export async function getScoringPolicyWithRules(
  festivalId: string,
): Promise<ScoringPolicyData> {
  const fetchPolicy = () =>
    db.query.festivalScoringPolicy.findFirst({
      where: eq(scoringPolicyTable.festivalId, festivalId),
      columns: {
        id: true,
        version: true,
        normalizeTo: true,
        noGradeBelow: true,
        gradeRules: true,
      },
      with: {
        awardRules: {
          orderBy: [
            asc(scoringAwardRuleTable.priority),
            asc(scoringAwardRuleTable.grade),
          ],
        },
      },
    });

  let policy: Awaited<ReturnType<typeof fetchPolicy>>;
  try {
    policy = await fetchPolicy();
  } catch (error) {
    if (isMissingScoringSchemaError(error)) {
      console.error(
        "Scoring policy schema is missing in database; using defaults.",
        error,
      );
      return defaultScoringPolicyData();
    }
    throw error;
  }

  if (!policy) {
    return defaultScoringPolicyData();
  }

  return {
    policyId: policy.id,
    policyVersion: policy.version,
    normalizeTo: policy.normalizeTo,
    noGradeBelow: policy.noGradeBelow,
    gradeRules: sanitizeGradeRules(policy.gradeRules),
    awardRules: policy.awardRules.map((r) => ({
      id: r.id,
      criteriaType:
        (r.criteriaType as "PARTICIPANT_RANGE" | "PROGRAMME_SET") ??
        "PARTICIPANT_RANGE",
      rowLabel: r.rowLabel,
      programmeIds: Array.isArray(r.programmeIds)
        ? r.programmeIds.filter((v): v is string => typeof v === "string")
        : null,
      categoryId: r.categoryId,
      programmeType: r.programmeType as "INDIVIDUAL" | "GROUP" | null,
      minParticipants: r.minParticipants,
      maxParticipants: r.maxParticipants,
      grade: r.grade,
      awardPoints: r.awardPoints,
      priority: r.priority,
    })),
    isPersisted: true,
  };
}

function validateGradeRules(gradeRules: GradeRule[]) {
  if (gradeRules.length === 0)
    throw new AppError("At least one grade rule is required.");
  for (const row of gradeRules) {
    if (!row.grade?.trim()) throw new AppError("Grade label is required.");
    if (row.min < 0 || row.max > 100 || row.min > row.max) {
      throw new AppError(`Invalid grade range for ${row.grade}.`);
    }
  }
}

export async function upsertScoringPolicyActionData(input: {
  festivalId: string;
  noGradeBelow: number;
  gradeRules: GradeRule[];
  awardRules: Array<Omit<AwardRule, "id" | "priority"> & { priority?: number }>;
  updatedBy?: string | null;
}) {
  validateGradeRules(input.gradeRules);

  const normalizedGradeRules = input.gradeRules.map((rule) => ({
    grade: rule.grade.trim().toUpperCase(),
    min: Math.round(rule.min),
    max: Math.round(rule.max),
  }));

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const existing = await tx.query.festivalScoringPolicy.findFirst({
      where: eq(scoringPolicyTable.festivalId, input.festivalId),
      columns: { id: true, version: true },
    });

    const policyId = existing?.id ?? randomUUID();
    const nextVersion = (existing?.version ?? 0) + 1;

    if (existing) {
      await tx
        .update(scoringPolicyTable)
        .set({
          version: nextVersion,
          isActive: true,
          normalizeTo: 100,
          noGradeBelow: Math.round(input.noGradeBelow),
          gradeRules: normalizedGradeRules,
          updatedAt: now,
        } as any)
        .where(eq(scoringPolicyTable.id, existing.id));
    } else {
      await tx.insert(scoringPolicyTable).values({
        id: policyId,
        festivalId: input.festivalId,
        version: nextVersion,
        isActive: true,
        normalizeTo: 100,
        noGradeBelow: Math.round(input.noGradeBelow),
        gradeRules: normalizedGradeRules,
        createdBy: input.updatedBy ?? null,
        createdAt: now,
        updatedAt: now,
      } as any);
    }

    await tx
      .delete(scoringAwardRuleTable)
      .where(eq(scoringAwardRuleTable.scoringPolicyId, policyId));

    for (let i = 0; i < input.awardRules.length; i++) {
      const row = input.awardRules[i]!;
      if (!row.grade?.trim())
        throw new AppError("Award rule grade is required.");
      if (row.criteriaType === "PARTICIPANT_RANGE") {
        if (row.minParticipants < 1) {
          throw new AppError(
            "Award rule minimum participants must be at least 1.",
          );
        }
        if (
          row.maxParticipants !== null &&
          row.maxParticipants !== undefined &&
          row.maxParticipants < row.minParticipants
        ) {
          throw new AppError(
            "Award rule max participants cannot be less than minimum participants.",
          );
        }
      }
      if (
        row.criteriaType === "PROGRAMME_SET" &&
        (!row.programmeIds || row.programmeIds.length === 0)
      ) {
        throw new AppError(
          "Programme-set row must contain at least one programme.",
        );
      }
      await tx.insert(scoringAwardRuleTable).values({
        id: randomUUID(),
        festivalId: input.festivalId,
        scoringPolicyId: policyId,
        criteriaType: row.criteriaType,
        rowLabel: row.rowLabel ?? null,
        programmeIds: row.programmeIds ?? null,
        categoryId: row.categoryId ?? null,
        programmeType: row.programmeType ?? null,
        minParticipants: Math.max(1, Math.round(row.minParticipants)),
        maxParticipants:
          row.maxParticipants === null || row.maxParticipants === undefined
            ? null
            : Math.round(row.maxParticipants),
        grade: row.grade.trim().toUpperCase(),
        awardPoints: Math.round(row.awardPoints),
        priority: row.priority ?? i,
        createdAt: now,
        updatedAt: now,
      } as any);
    }
  });
}

function resolveGrade(
  points: number,
  noGradeBelow: number,
  gradeRules: GradeRule[],
): string | null {
  if (points < noGradeBelow) return null;
  const matched = gradeRules.find(
    (rule) => points >= rule.min && points <= rule.max,
  );
  return matched?.grade ?? null;
}

export async function resolveScoringPolicy(input: {
  festivalId: string;
  programme: {
    id: string;
    categoryId: string | null;
    type: "INDIVIDUAL" | "GROUP";
  };
  participantsCount: number;
  points: number;
}): Promise<{
  grade: string | null;
  awardPoints: number;
  policyVersion: number;
}> {
  const policy = await getScoringPolicyWithRules(input.festivalId);
  const grade = resolveGrade(
    input.points,
    policy.noGradeBelow,
    policy.gradeRules,
  );
  if (!grade && input.points < policy.noGradeBelow) {
    return { grade: null, awardPoints: 0, policyVersion: policy.policyVersion };
  }
  if (!grade) {
    throw new AppError(
      `Scoring policy coverage missing: no grade rule matches ${input.points} points. Update the festival scoring policy and retry submission.`,
    );
  }

  const candidates = policy.awardRules.filter((rule) => {
    if (rule.grade.toUpperCase() !== grade.toUpperCase()) return false;
    if (rule.criteriaType === "PROGRAMME_SET") {
      if (!rule.programmeIds?.includes(input.programme.id)) return false;
    } else {
      if (
        input.participantsCount < rule.minParticipants ||
        (rule.maxParticipants !== null &&
          rule.maxParticipants !== undefined &&
          input.participantsCount > rule.maxParticipants)
      ) {
        return false;
      }
    }
    if (rule.categoryId && rule.categoryId !== input.programme.categoryId)
      return false;
    if (rule.programmeType && rule.programmeType !== input.programme.type)
      return false;
    return true;
  });

  candidates.sort((a, b) => {
    const aTypeBoost = a.criteriaType === "PROGRAMME_SET" ? 10 : 0;
    const bTypeBoost = b.criteriaType === "PROGRAMME_SET" ? 10 : 0;
    const aSpecificity =
      Number(Boolean(a.categoryId)) + Number(Boolean(a.programmeType));
    const bSpecificity =
      Number(Boolean(b.categoryId)) + Number(Boolean(b.programmeType));
    if (aTypeBoost !== bTypeBoost) return bTypeBoost - aTypeBoost;
    if (aSpecificity !== bSpecificity) return bSpecificity - aSpecificity;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.minParticipants - a.minParticipants;
  });

  return {
    grade,
    awardPoints:
      candidates[0]?.awardPoints ??
      (() => {
        throw new AppError(
          `Scoring policy coverage missing: no award rule matches grade ${grade} for this programme/participant combination. Update the festival scoring policy and retry submission.`,
        );
      })(),
    policyVersion: policy.policyVersion,
  };
}
