import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockAssertFestivalAccess,
  mockEnsureOffStageStage,
  mockFestivalFindFirst,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const mk = () => vi.fn();
  return {
    mockGetSession: mk(),
    mockAssertFestivalAccess: mk(),
    mockEnsureOffStageStage: mk(),
    mockFestivalFindFirst: mk(),
    mockRevalidatePath: mk(),
  };
});

vi.mock("server-only", () => ({}));

vi.mock("@/core/auth/session", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("@/core/auth/assert-festival-access", () => ({
  assertFestivalAccess: (...args: unknown[]) => mockAssertFestivalAccess(...args),
}));

vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      festival: {
        findFirst: (...args: unknown[]) => mockFestivalFindFirst(...args),
      },
    },
  },
}));

vi.mock("@/features/stages/services/off-stage.service", () => ({
  ensureOffStageStage: (...args: unknown[]) => mockEnsureOffStageStage(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import { provisionOffStageAction } from "./off-stage.actions";

const FESTIVAL_ID = "fest-1";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({
    userId: "owner-1",
    role: "USER",
    expires: new Date(),
  });
  mockAssertFestivalAccess.mockResolvedValue(undefined);
  mockFestivalFindFirst.mockResolvedValue({ slug: "demo" });
});

describe("provisionOffStageAction", () => {
  it("throws when the caller is not signed in", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(provisionOffStageAction(FESTIVAL_ID)).rejects.toThrow();
    expect(mockEnsureOffStageStage).not.toHaveBeenCalled();
  });

  it("requires writable access", async () => {
    mockAssertFestivalAccess.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(provisionOffStageAction(FESTIVAL_ID)).rejects.toThrow(
      /FORBIDDEN/,
    );
    expect(mockEnsureOffStageStage).not.toHaveBeenCalled();
  });

  it("provisions the off-stage stage and revalidates the stage grid", async () => {
    mockEnsureOffStageStage.mockResolvedValue({
      id: "off-1",
      festivalId: FESTIVAL_ID,
      name: "Off-Stage",
      isOffStage: true,
    });

    const result = await provisionOffStageAction(FESTIVAL_ID);

    expect(mockAssertFestivalAccess).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "owner-1" }),
      FESTIVAL_ID,
      expect.objectContaining({ requireWritable: true }),
    );
    expect(mockEnsureOffStageStage).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(result).toEqual({ stageId: "off-1", name: "Off-Stage" });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/demo/pre-event-works/stage-management",
    );
  });

  it("is idempotent — calling twice returns the same off-stage row", async () => {
    mockEnsureOffStageStage.mockResolvedValue({
      id: "off-1",
      festivalId: FESTIVAL_ID,
      name: "Off-Stage",
      isOffStage: true,
    });

    const a = await provisionOffStageAction(FESTIVAL_ID);
    const b = await provisionOffStageAction(FESTIVAL_ID);

    expect(a.stageId).toBe("off-1");
    expect(b.stageId).toBe("off-1");
    // Both calls hit the service; the service itself short-circuits the
    // insert path on the second call.
    expect(mockEnsureOffStageStage).toHaveBeenCalledTimes(2);
  });
});