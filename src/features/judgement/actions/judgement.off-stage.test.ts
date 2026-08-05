import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockAssertFestivalAccess,
  mockGetStageIdForReportingSession,
  mockAssertStageManagerAccessForStage,
  mockGetOffStageStage,
  mockReportingSessionFindFirst,
  mockProgrammeFindFirst,
  mockCreateAuditLog,
} = vi.hoisted(() => {
  const mk = () => vi.fn();
  return {
    mockGetSession: mk(),
    mockAssertFestivalAccess: mk(),
    mockGetStageIdForReportingSession: mk(),
    mockAssertStageManagerAccessForStage: mk(),
    mockGetOffStageStage: mk(),
    mockReportingSessionFindFirst: mk(),
    mockProgrammeFindFirst: mk(),
    mockCreateAuditLog: mk(),
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

vi.mock("@/core/database/client", () => {
  // The judgement actions call insertLiveJudgementConfig which does
  // db.transaction(...) and then inserts into judgementConfig and
  // judgementConfigJudge, plus archives the prior LIVE config on the
  // resolved stage. For the off-stage tests we don't care about those
  // rows; we just need the transaction to succeed.
  const chain = () => {
    const c: Record<string, unknown> = {};
    c.innerJoin = vi.fn(() => c);
    c.leftJoin = vi.fn(() => c);
    c.rightJoin = vi.fn(() => c);
    c.where = vi.fn(() => c);
    c.orderBy = vi.fn(() => c);
    c.limit = vi.fn(() => c);
    c.set = vi.fn(() => c);
    c.values = vi.fn(() => Promise.resolve());
    c.returning = vi.fn(() => c);
    return c;
  };
  const tx = {
    insert: vi.fn(chain),
    update: vi.fn(chain),
    select: vi.fn(() => ({ from: vi.fn(chain) })),
    // insertLiveJudgementConfig looks up the actor (displayName / email)
    // to write `createdByName` + `createdByEmail` on the new config row.
    // Return null so the code falls back to the actorName it already
    // computed from the stage-manager assertion.
    query: {
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  };
  return {
    db: {
      select: vi.fn(() => ({ from: vi.fn(chain) })),
      update: vi.fn(() => chain()),
      insert: vi.fn(() => chain()),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
      query: {
        programmeReportingSession: {
          findFirst: (...args: unknown[]) =>
            mockReportingSessionFindFirst(...args),
        },
        programme: {
          findFirst: (...args: unknown[]) => mockProgrammeFindFirst(...args),
        },
        festival: {
          findFirst: vi.fn().mockResolvedValue({ slug: "demo" }),
        },
        judgementConfig: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    },
  };
});

vi.mock("@/features/auth/services/audit-log.service", () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

vi.mock("@/features/programmes/actions/programme-reporting.actions", () => ({
  getStageIdForReportingSession: (...args: unknown[]) =>
    mockGetStageIdForReportingSession(...args),
}));

vi.mock("@/features/programmes/actions/reporting-access", () => ({
  assertStageManagerAccessForStage: (...args: unknown[]) =>
    mockAssertStageManagerAccessForStage(...args),
}));

vi.mock("@/features/stages/services/off-stage.service", () => ({
  getOffStageStage: (...args: unknown[]) => mockGetOffStageStage(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  restartJudgementAction,
  startJudgementAction,
} from "./judgement.actions";

const FESTIVAL_ID = "fest-1";
const PROGRAMME_ID = "prog-1";
const OFF_STAGE_ID = "off-stage-1";
const NORMAL_STAGE_ID = "stage-a";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({
    userId: "owner-1",
    role: "USER",
    expires: new Date(),
  });
  mockAssertFestivalAccess.mockResolvedValue(undefined);
  mockAssertStageManagerAccessForStage.mockResolvedValue("Owner Name");
  mockCreateAuditLog.mockResolvedValue(undefined);
  mockProgrammeFindFirst.mockResolvedValue({ status: "PENDING_JUDGMENT" });
});

describe("startJudgementAction — off-stage auto-assign", () => {
  it("auto-assigns the off-stage stage when the closed reporting session has no stageId", async () => {
    mockReportingSessionFindFirst.mockResolvedValue({
      id: "rs-1",
      stageId: null,
    });
    mockGetOffStageStage.mockResolvedValue({
      id: OFF_STAGE_ID,
      festivalId: FESTIVAL_ID,
      name: "Off-Stage",
      isOffStage: true,
    });

    await startJudgementAction({
      festivalId: FESTIVAL_ID,
      programmeId: PROGRAMME_ID,
      judgeIds: ["j-1"],
      scoreLimit: 100,
      judgingMode: "GROUP",
    });

    // assertStageManagerAccessForStage must be called with the off-stage id,
    // not the null stageId.
    expect(mockAssertStageManagerAccessForStage).toHaveBeenCalledWith(
      FESTIVAL_ID,
      OFF_STAGE_ID,
    );

    // An auto-assign audit log must be emitted.
    const actions = mockCreateAuditLog.mock.calls.map((c) => c[0]?.action);
    expect(actions).toContain("JUDGEMENT_AUTO_ASSIGN_OFF_STAGE");
    expect(actions).toContain("START_JUDGEMENT");
  });

  it("does NOT auto-assign when the closed reporting session already has a stageId", async () => {
    mockReportingSessionFindFirst.mockResolvedValue({
      id: "rs-1",
      stageId: NORMAL_STAGE_ID,
    });

    await startJudgementAction({
      festivalId: FESTIVAL_ID,
      programmeId: PROGRAMME_ID,
      judgeIds: ["j-1"],
      scoreLimit: 100,
      judgingMode: "GROUP",
    });

    expect(mockGetOffStageStage).not.toHaveBeenCalled();
    expect(mockAssertStageManagerAccessForStage).toHaveBeenCalledWith(
      FESTIVAL_ID,
      NORMAL_STAGE_ID,
    );

    // No auto-assign audit log should be emitted.
    const actions = mockCreateAuditLog.mock.calls.map((c) => c[0]?.action);
    expect(actions).not.toContain("JUDGEMENT_AUTO_ASSIGN_OFF_STAGE");
    expect(actions).toContain("START_JUDGEMENT");
  });

  it("throws a friendly error when the festival has no off-stage stage provisioned", async () => {
    mockReportingSessionFindFirst.mockResolvedValue({
      id: "rs-1",
      stageId: null,
    });
    mockGetOffStageStage.mockResolvedValue(null);

    await expect(
      startJudgementAction({
        festivalId: FESTIVAL_ID,
        programmeId: PROGRAMME_ID,
        judgeIds: ["j-1"],
        scoreLimit: 100,
        judgingMode: "GROUP",
      }),
    ).rejects.toThrow(/Off-Stage stage provisioned/);

    expect(mockAssertStageManagerAccessForStage).not.toHaveBeenCalled();
    // No judgement-config-related audit log should be emitted on failure.
    expect(mockCreateAuditLog).not.toHaveBeenCalled();
  });
});

describe("restartJudgementAction — off-stage auto-assign", () => {
  it("auto-assigns the off-stage stage when the prior reporting session has no stageId", async () => {
    mockProgrammeFindFirst.mockResolvedValue({ status: "JUDGED" });
    mockGetStageIdForReportingSession.mockResolvedValue(null);
    mockGetOffStageStage.mockResolvedValue({
      id: OFF_STAGE_ID,
      festivalId: FESTIVAL_ID,
      name: "Off-Stage",
      isOffStage: true,
    });

    // Need to mock judgementConfig.findFirst to return a prior config.
    const { db } = await import("@/core/database/client");
    vi.spyOn(
      db.query.judgementConfig as unknown as { findFirst: () => unknown },
      "findFirst",
    ).mockResolvedValue({
      id: "cfg-1",
      reportingSessionId: "rs-1",
      scoreLimit: 100,
      judgingMode: "GROUP",
      judges: [{ judgeId: "j-1" }],
    });

    await restartJudgementAction({
      festivalId: FESTIVAL_ID,
      programmeId: PROGRAMME_ID,
    });

    expect(mockAssertStageManagerAccessForStage).toHaveBeenCalledWith(
      FESTIVAL_ID,
      OFF_STAGE_ID,
    );

    const actions = mockCreateAuditLog.mock.calls.map((c) => c[0]?.action);
    expect(actions).toContain("JUDGEMENT_AUTO_ASSIGN_OFF_STAGE");
    expect(actions).toContain("START_JUDGEMENT");
  });

  it("does NOT auto-assign when the prior reporting session already has a stageId", async () => {
    mockProgrammeFindFirst.mockResolvedValue({ status: "JUDGED" });
    mockGetStageIdForReportingSession.mockResolvedValue(NORMAL_STAGE_ID);

    const { db } = await import("@/core/database/client");
    vi.spyOn(
      db.query.judgementConfig as unknown as { findFirst: () => unknown },
      "findFirst",
    ).mockResolvedValue({
      id: "cfg-1",
      reportingSessionId: "rs-1",
      scoreLimit: 100,
      judgingMode: "GROUP",
      judges: [{ judgeId: "j-1" }],
    });

    await restartJudgementAction({
      festivalId: FESTIVAL_ID,
      programmeId: PROGRAMME_ID,
    });

    expect(mockGetOffStageStage).not.toHaveBeenCalled();
    expect(mockAssertStageManagerAccessForStage).toHaveBeenCalledWith(
      FESTIVAL_ID,
      NORMAL_STAGE_ID,
    );

    const actions = mockCreateAuditLog.mock.calls.map((c) => c[0]?.action);
    expect(actions).not.toContain("JUDGEMENT_AUTO_ASSIGN_OFF_STAGE");
  });
});
