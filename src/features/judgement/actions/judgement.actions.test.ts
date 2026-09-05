import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockAssertFestivalAccess,
  mockGetAccessibleStageIds,
  mockProgrammeFindMany,
  mockProgrammeReportingSessionFindMany,
  mockProgrammeCodeLetterFindMany,
  mockProgrammeAssignmentFindMany,
  mockJudgementConfigFindMany,
  mockJudgementConfigJudgeFindMany,
  mockJudgedScoreFindMany,
  mockListFestivalJudges,
} = vi.hoisted(() => {
  const mk = () => vi.fn();
  return {
    mockGetSession: mk(),
    mockAssertFestivalAccess: mk(),
    mockGetAccessibleStageIds: mk(),
    mockProgrammeFindMany: mk(),
    mockProgrammeReportingSessionFindMany: mk(),
    mockProgrammeCodeLetterFindMany: mk(),
    mockProgrammeAssignmentFindMany: mk(),
    mockJudgementConfigFindMany: mk(),
    mockJudgementConfigJudgeFindMany: mk(),
    mockJudgedScoreFindMany: mk(),
    mockListFestivalJudges: mk(),
  };
});

vi.mock("server-only", () => ({}));

vi.mock("@/core/auth/session", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("@/core/auth/assert-festival-access", () => ({
  assertFestivalAccess: (...args: unknown[]) =>
    mockAssertFestivalAccess(...args),
}));

vi.mock("@/core/auth/stage-portal-session", () => ({
  getStagePortalSessionFromCookie: vi.fn(),
}));

vi.mock("@/features/programmes/actions/get-assignments.action", () => ({
  getProgrammeAssignmentsAction: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/core/database/client", () => ({
  db: {
    select: vi.fn(() => {
      const makeChain = () => {
        const chain: Record<string, unknown> = {};
        chain.innerJoin = vi.fn(() => chain);
        chain.leftJoin = vi.fn(() => chain);
        chain.rightJoin = vi.fn(() => chain);
        chain.fullJoin = vi.fn(() => chain);
        chain.where = vi.fn((arg: unknown) => arg ?? chain);
        chain.orderBy = vi.fn(() => chain);
        chain.limit = vi.fn(() => chain);
        chain.offset = vi.fn(() => chain);
        chain.groupBy = vi.fn(() => chain);
        chain.having = vi.fn(() => chain);
        return chain;
      };
      return { from: vi.fn(makeChain) };
    }),
    query: {
      programme: {
        findMany: (...args: unknown[]) => mockProgrammeFindMany(...args),
      },
      programmeReportingSession: {
        findMany: (...args: unknown[]) =>
          mockProgrammeReportingSessionFindMany(...args),
      },
      programmeCodeLetter: {
        findMany: (...args: unknown[]) =>
          mockProgrammeCodeLetterFindMany(...args),
      },
      programmeAssignment: {
        findMany: (...args: unknown[]) =>
          mockProgrammeAssignmentFindMany(...args),
      },
      judgementConfig: {
        findMany: (...args: unknown[]) => mockJudgementConfigFindMany(...args),
      },
      judgementConfigJudge: {
        findMany: (...args: unknown[]) =>
          mockJudgementConfigJudgeFindMany(...args),
      },
      judgementScore: {
        findMany: (...args: unknown[]) => mockJudgedScoreFindMany(...args),
      },
    },
  },
}));

vi.mock("@/features/auth/services/audit-log.service", () => ({
  createAuditLog: vi.fn(),
}));

vi.mock("@/features/judgement/services/scoring-policy.service", () => ({
  getScoringPolicyWithRules: vi.fn(),
  resolveScoringPolicy: vi.fn(),
  upsertScoringPolicyActionData: vi.fn(),
}));

vi.mock("@/features/judges/repositories/judge.repository", () => ({
  listFestivalJudgesWithAssignments: (...args: unknown[]) =>
    mockListFestivalJudges(...args),
}));

vi.mock("@/features/programmes/actions/programme-reporting.actions", () => ({
  getStageIdForReportingSession: vi.fn(),
}));

vi.mock("@/features/programmes/actions/reporting-access", () => ({
  assertStageManagerAccessForStage: vi.fn(),
}));

vi.mock("@/features/programmes/services/programme-status.service", () => ({
  updateProgrammeStatus: vi.fn(),
}));

vi.mock("@/features/results/services/results-calculator", () => ({
  calculatePosition: vi.fn(),
}));

vi.mock("@/features/schedule/utils/festival-schedule-days", () => ({
  getFestivalDateKeySet: vi.fn(),
}));

vi.mock("@/features/stages/services/judge-stage-assignment.service", () => ({
  JudgeStageAssignmentService: {
    listForFestival: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/features/stages/services/stage-assignment.service", () => ({
  StageAssignmentService: {
    getAccessibleStageIds: (...args: unknown[]) =>
      mockGetAccessibleStageIds(...args),
  },
}));

import {
  getActiveJudgementConfigsAction,
  getJudgedProgrammeCardsAction,
  getJudgementWizardDataAction,
} from "./judgement.actions";

const FESTIVAL_ID = "fest-1";
const STAGE_A = "stage-a";
const STAGE_B = "stage-b";
const STAGE_C = "stage-c";

function ownerSession() {
  return { userId: "owner-1", role: "USER", expires: new Date() };
}

function stageManagerSession(userId: string) {
  return { userId, role: "USER", expires: new Date() };
}

import { and, eq, exists, inArray, not, or, sql } from "drizzle-orm";
import { judgementConfig, programme } from "@/core/database/schema";

function sqlToString(node: unknown): string {
  if (typeof node === "function") {
    const ops = { and, eq, inArray, exists, not, or, sql };
    return sqlToString(node(judgementConfig, ops) || node(programme, ops));
  }
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  const obj = node as Record<string, unknown>;
  if (typeof obj.getSQL === "function" && typeof obj.toQuery === "function") {
    const sql = (obj as any).getSQL() as {
      toQuery: (config: Record<string, unknown>) => { sql: string };
      inlineParams: () => void;
    };
    sql.inlineParams();
    const q = sql.toQuery({
      casing: { getColumnCasing: (c: { name: string }) => c.name },
      escapeName: (n: string) => `"${n}"`,
      escapeParam: (_i: number, v: unknown) =>
        Array.isArray(v) ? `(${v.map((x) => `'${x}'`).join(", ")})` : `'${v}'`,
      escapeString: (s: string) => `'${s}'`,
      inlineParams: true,
    });
    return q.sql;
  }
  if (Array.isArray(obj.queryChunks)) {
    return (obj.queryChunks as unknown[]).map(sqlToString).join("");
  }
  if ("value" in obj) return sqlToString(obj.value);
  return "";
}

beforeEach(() => {
  vi.clearAllMocks();

  mockAssertFestivalAccess.mockResolvedValue(undefined);

  // Wizard data pipeline defaults: no programmes, no sessions, no judges.
  mockProgrammeFindMany.mockResolvedValue([]);
  mockProgrammeReportingSessionFindMany.mockResolvedValue([]);
  mockProgrammeCodeLetterFindMany.mockResolvedValue([]);
  mockProgrammeAssignmentFindMany.mockResolvedValue([]);
  mockJudgementConfigFindMany.mockResolvedValue([]);
  mockJudgementConfigJudgeFindMany.mockResolvedValue([]);
  mockJudgedScoreFindMany.mockResolvedValue([]);
  mockListFestivalJudges.mockResolvedValue([]);
});

describe("getJudgementWizardDataAction — stage scoping (ISSUE-16 Slice 4)", () => {
  it("calls getAccessibleStageIds with festivalId + session before scoping", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);

    await getJudgementWizardDataAction(FESTIVAL_ID);

    expect(mockGetAccessibleStageIds).toHaveBeenCalledWith(
      FESTIVAL_ID,
      expect.objectContaining({ userId: "sm-1" }),
    );
  });

  it("does not add an inArray(stageId, …) scope when caller is 'all' (owner/admin)", async () => {
    mockGetSession.mockResolvedValue(ownerSession());
    mockGetAccessibleStageIds.mockResolvedValue("all");

    await getJudgementWizardDataAction(FESTIVAL_ID);

    // Both programme lists are queried.
    expect(mockProgrammeFindMany).toHaveBeenCalledTimes(2);
    for (const call of mockProgrammeFindMany.mock.calls) {
      const str = sqlToString(call[0]?.where);
      // The scope helper returns undefined → no extra `IN ('stage-…')`
      // wrapping the accessibleStageIds. Status literals still appear.
      expect(str).not.toMatch(/'stage-[a-z]'/);
    }
  });

  it("scopes judgeProgrammes + rejudgeProgrammes to the STAGE_MANAGER's stages", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A, STAGE_B]);

    await getJudgementWizardDataAction(FESTIVAL_ID);

    expect(mockProgrammeFindMany).toHaveBeenCalledTimes(2);

    // Capture the two `where`s in order: judgeProgrammes, rejudgeProgrammes.
    const judgeWhere = mockProgrammeFindMany.mock.calls[0]?.[0]?.where;
    const rejudgeWhere = mockProgrammeFindMany.mock.calls[1]?.[0]?.where;

    for (const where of [judgeWhere, rejudgeWhere]) {
      const str = sqlToString(where);
      // Both wheres must include the accessible stages in some inArray clause.
      expect(str).toContain(STAGE_A);
      expect(str).toContain(STAGE_B);
      // And neither should leak an unrelated stage into the scope.
      expect(str).not.toContain(STAGE_C);
    }
  });

  it("preserves the locked status semantics (STARTED ∪ REPORTING + CLOSED session) when scoping", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);

    await getJudgementWizardDataAction(FESTIVAL_ID);

    const judgeWhere = mockProgrammeFindMany.mock.calls[0]?.[0]?.where;
    const str = sqlToString(judgeWhere);
    // Outer status filter — "PENDING_JUDGMENT" must be present as a literal.
    expect(str).toContain("PENDING_JUDGMENT");
    // Inner status filter on the reporting session — "CLOSED" must be present.
    expect(str).toContain("CLOSED");
    // Stage scoping must apply (either schedule entry OR reporting session has the stage)
    expect(str).toContain(STAGE_A);
  });

  it("preserves the rejudge status semantics (PENDING_PUBLICATION ∪ JUDGING) when scoping", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);

    await getJudgementWizardDataAction(FESTIVAL_ID);

    const rejudgeWhere = mockProgrammeFindMany.mock.calls[1]?.[0]?.where;
    const str = sqlToString(rejudgeWhere);
    expect(str).toContain("PENDING_PUBLICATION");
    expect(str).toContain("JUDGING");
    expect(str).toContain(STAGE_A);
  });

  it("returns empty datasets for an unassigned STAGE_MANAGER (scope = [])", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-unassigned"));
    mockGetAccessibleStageIds.mockResolvedValue([]);

    const result = await getJudgementWizardDataAction(FESTIVAL_ID);

    // The action still issues the queries (Drizzle's inArray(col, []) becomes
    // sql`false`), but the result is empty because we mock the queries to
    // return [] by default. Assert that the scope was indeed applied with
    // an empty array so the inArray(col, []) short-circuit kicks in.
    const judgeWhere = mockProgrammeFindMany.mock.calls[0]?.[0]?.where;
    const rejudgeWhere = mockProgrammeFindMany.mock.calls[1]?.[0]?.where;

    // No accessible stage ids appear in the where (empty list).
    expect(sqlToString(judgeWhere)).not.toContain(STAGE_A);
    expect(sqlToString(rejudgeWhere)).not.toContain(STAGE_A);

    // The result is empty.
    expect(result.judgeProgrammes).toEqual([]);
    expect(result.rejudgeProgrammes).toEqual([]);
  });
});

describe("getActiveJudgementConfigsAction — stage scoping", () => {
  it("scopes LIVE configs by reportingSession.stageId", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);

    await getActiveJudgementConfigsAction(FESTIVAL_ID);

    expect(mockGetAccessibleStageIds).toHaveBeenCalledWith(
      FESTIVAL_ID,
      expect.objectContaining({ userId: "sm-1" }),
    );
    expect(mockJudgementConfigFindMany).toHaveBeenCalledTimes(1);

    const where = mockJudgementConfigFindMany.mock.calls[0]?.[0]?.where;
    const str = sqlToString(where);
    // status="LIVE" stays in the where.
    expect(str).toContain("LIVE");
    // The accessible stage ids appear in the scope.
    expect(str).toContain(STAGE_A);
    // An unrelated stage does not.
    expect(str).not.toContain(STAGE_C);
  });

  it("does not add a stage scope when caller is 'all'", async () => {
    mockGetSession.mockResolvedValue(ownerSession());
    mockGetAccessibleStageIds.mockResolvedValue("all");

    await getActiveJudgementConfigsAction(FESTIVAL_ID);

    expect(mockJudgementConfigFindMany).toHaveBeenCalledTimes(1);
  });
});

describe("getJudgedProgrammeCardsAction — stage scoping", () => {
  it("scopes judged cards by reportingSession.stageId", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A, STAGE_B]);

    await getJudgedProgrammeCardsAction(FESTIVAL_ID);

    expect(mockGetAccessibleStageIds).toHaveBeenCalledWith(
      FESTIVAL_ID,
      expect.objectContaining({ userId: "sm-1" }),
    );
    expect(mockJudgementConfigFindMany).toHaveBeenCalledTimes(1);

    const where = mockJudgementConfigFindMany.mock.calls[0]?.[0]?.where;
    const str = sqlToString(where);
    expect(str).toContain(STAGE_A);
    expect(str).toContain(STAGE_B);
    expect(str).not.toContain(STAGE_C);
  });

  it("does not add a stage scope when caller is 'all'", async () => {
    mockGetSession.mockResolvedValue(ownerSession());
    mockGetAccessibleStageIds.mockResolvedValue("all");

    await getJudgedProgrammeCardsAction(FESTIVAL_ID);

    expect(mockJudgementConfigFindMany).toHaveBeenCalledTimes(1);
  });
});
