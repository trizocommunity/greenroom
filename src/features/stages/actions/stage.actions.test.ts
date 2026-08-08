import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockAssertFestivalAccess,
  mockStageFindFirst,
  mockStageDelete,
  mockUsageCounterIncrement,
} = vi.hoisted(() => {
  const mk = () => vi.fn();
  return {
    mockGetSession: mk(),
    mockAssertFestivalAccess: mk(),
    mockStageFindFirst: mk(),
    mockStageDelete: mk(),
    mockUsageCounterIncrement: mk(),
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
  const chain = () => {
    const c: Record<string, unknown> = {};
    c.where = vi.fn(() => c);
    return c;
  };
  return {
    db: {
      query: {
        stage: {
          findFirst: (...args: unknown[]) => mockStageFindFirst(...args),
        },
        user: {
          findFirst: vi.fn(),
        },
        festival: {
          findFirst: vi.fn().mockResolvedValue({ slug: "demo" }),
        },
      },
      delete: (...args: unknown[]) => mockStageDelete(...args),
    },
  };
});

vi.mock("@/core/datetime/server", () => ({
  serverNowIso: () => "2026-08-02T00:00:00.000Z",
}));

vi.mock("@/features/festivals/services/usage-counter.service", () => ({
  UsageCounterService: {
    incrementUsage: (...args: unknown[]) => mockUsageCounterIncrement(...args),
  },
}));

vi.mock("@/features/stages/services/stage-assignment.service", () => ({
  StageAssignmentService: { getAccessibleStageIds: vi.fn() },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { deleteStage } from "./stage.actions";

const FESTIVAL_ID = "fest-1";
const NORMAL_STAGE_ID = "stage-a";
const OFF_STAGE_ID = "off-stage-1";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({
    userId: "owner-1",
    role: "USER",
    expires: new Date(),
  });
  mockAssertFestivalAccess.mockResolvedValue(undefined);
  mockUsageCounterIncrement.mockResolvedValue(undefined);
  mockStageDelete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
});

describe("deleteStage — off-stage guard", () => {
  it("rejects deletion of an off-stage stage", async () => {
    mockStageFindFirst.mockResolvedValue({
      id: OFF_STAGE_ID,
      festivalId: FESTIVAL_ID,
      isOffStage: true,
      festival: { slug: "demo" },
    });

    await expect(deleteStage(OFF_STAGE_ID)).rejects.toThrow(
      /Off-Stage stage cannot be deleted/,
    );

    expect(mockStageDelete).not.toHaveBeenCalled();
    expect(mockUsageCounterIncrement).not.toHaveBeenCalled();
  });

  it("allows deletion of a normal (non-off-stage) stage", async () => {
    mockStageFindFirst.mockResolvedValue({
      id: NORMAL_STAGE_ID,
      festivalId: FESTIVAL_ID,
      isOffStage: false,
      festival: { slug: "demo" },
    });

    await deleteStage(NORMAL_STAGE_ID);

    expect(mockStageDelete).toHaveBeenCalledTimes(1);
    expect(mockUsageCounterIncrement).toHaveBeenCalledWith(
      FESTIVAL_ID,
      "stages",
      -1,
    );
  });

  it("throws NOT_FOUND when the stage does not exist", async () => {
    mockStageFindFirst.mockResolvedValue(null);

    await expect(deleteStage("missing")).rejects.toThrow();

    expect(mockStageDelete).not.toHaveBeenCalled();
  });
});
