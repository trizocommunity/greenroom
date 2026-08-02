import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFestivalFindFirst,
  mockFestivalMemberFindFirst,
  mockStageManagerAssignmentFindMany,
} = vi.hoisted(() => ({
  mockFestivalFindFirst: vi.fn(),
  mockFestivalMemberFindFirst: vi.fn(),
  mockStageManagerAssignmentFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      festival: {
        findFirst: (...args: unknown[]) => mockFestivalFindFirst(...args),
      },
      festivalMember: {
        findFirst: (...args: unknown[]) => mockFestivalMemberFindFirst(...args),
      },
      stageManagerAssignment: {
        findMany: (...args: unknown[]) =>
          mockStageManagerAssignmentFindMany(...args),
      },
    },
  },
}));

import { StageAssignmentService } from "./stage-assignment.service";

const FESTIVAL_ID = "fest-1";

function session(userId: string | null, role: string | null) {
  return { userId, role };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFestivalFindFirst.mockResolvedValue({
    id: FESTIVAL_ID,
    ownerId: "owner-1",
  });
  mockFestivalMemberFindFirst.mockResolvedValue(undefined);
  mockStageManagerAssignmentFindMany.mockResolvedValue([]);
});

describe("StageAssignmentService.getAccessibleStageIds", () => {
  it("returns 'all' for SUPER_ADMIN regardless of festival data", async () => {
    const result = await StageAssignmentService.getAccessibleStageIds(
      FESTIVAL_ID,
      session("admin-1", "SUPER_ADMIN"),
    );
    expect(result).toBe("all");
  });

  it("returns 'all' for the festival owner", async () => {
    const result = await StageAssignmentService.getAccessibleStageIds(
      FESTIVAL_ID,
      session("owner-1", "USER"),
    );
    expect(result).toBe("all");
  });

  it("returns 'all' for an ADMIN member", async () => {
    mockFestivalMemberFindFirst.mockResolvedValue({
      id: "mem-1",
      role: "ADMIN",
      isActive: true,
    });
    const result = await StageAssignmentService.getAccessibleStageIds(
      FESTIVAL_ID,
      session("user-1", "USER"),
    );
    expect(result).toBe("all");
  });

  it("returns the assigned stage ids for a STAGE_MANAGER", async () => {
    mockFestivalMemberFindFirst.mockResolvedValue({
      id: "mem-1",
      role: "STAGE_MANAGER",
      isActive: true,
    });
    mockStageManagerAssignmentFindMany.mockResolvedValue([
      { stageId: "stage-a" },
      { stageId: "stage-b" },
    ]);
    const result = await StageAssignmentService.getAccessibleStageIds(
      FESTIVAL_ID,
      session("user-1", "USER"),
    );
    expect(result).toEqual(["stage-a", "stage-b"]);
  });

  it("returns an EMPTY array for a STAGE_MANAGER with no assignments (Slice 3 invariant)", async () => {
    mockFestivalMemberFindFirst.mockResolvedValue({
      id: "mem-1",
      role: "STAGE_MANAGER",
      isActive: true,
    });
    mockStageManagerAssignmentFindMany.mockResolvedValue([]);
    const result = await StageAssignmentService.getAccessibleStageIds(
      FESTIVAL_ID,
      session("user-1", "USER"),
    );
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result.length).toBe(0);
    }
  });

  it("throws for an inactive festival member (access denied)", async () => {
    mockFestivalMemberFindFirst.mockResolvedValue({
      id: "mem-1",
      role: "STAGE_MANAGER",
      isActive: false,
    });
    await expect(
      StageAssignmentService.getAccessibleStageIds(
        FESTIVAL_ID,
        session("user-1", "USER"),
      ),
    ).rejects.toThrow();
  });

  it("throws when there is no member row at all (non-member access denied)", async () => {
    mockFestivalMemberFindFirst.mockResolvedValue(undefined);
    await expect(
      StageAssignmentService.getAccessibleStageIds(
        FESTIVAL_ID,
        session("user-1", "USER"),
      ),
    ).rejects.toThrow();
  });

  it("throws when the festival does not exist", async () => {
    mockFestivalFindFirst.mockResolvedValue(undefined);
    await expect(
      StageAssignmentService.getAccessibleStageIds(
        FESTIVAL_ID,
        session("owner-1", "USER"),
      ),
    ).rejects.toThrow();
  });

  it("throws when there is no userId in the session", async () => {
    await expect(
      StageAssignmentService.getAccessibleStageIds(
        FESTIVAL_ID,
        session(null, "USER"),
      ),
    ).rejects.toThrow();
  });
});
