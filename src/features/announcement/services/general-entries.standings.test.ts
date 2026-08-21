import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeGeneralEntryStandings } from "@/features/general-entries/services/general-entries.standings";

const mockDbSelect = vi.fn();
vi.mock("@/core/database/client", () => ({
  db: {
    select: (..._args: any[]) => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            groupBy: (...args: any[]) => mockDbSelect(...args),
          }),
        }),
      }),
    }),
  },
}));

describe("computeGeneralEntryStandings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return standings for general entries", async () => {
    mockDbSelect.mockResolvedValue([
      { groupName: "Group A", points: 50 },
      { groupName: "Group B", points: 30 },
    ]);

    const result = await computeGeneralEntryStandings("festival-1");
    expect(result).toEqual([
      { name: "Group A", points: 50, isGroup: true },
      { name: "Group B", points: 30, isGroup: true },
    ]);
  });
});
