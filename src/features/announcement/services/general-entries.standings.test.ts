import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeGeneralEntryStandings,
  computeGeneralEntryStandingsWithDetails,
} from "@/features/general-entries/services/general-entries.standings";

const mockDbSelect = vi.fn();
vi.mock("@/core/database/client", () => ({
  db: {
    select: (..._args: any[]) => ({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            leftJoin: () => ({
              where: (...args: any[]) => mockDbSelect(...args),
            }),
          }),
          where: () => ({
            groupBy: (...args: any[]) => mockDbSelect(...args),
          }),
        }),
      }),
    }),
  },
}));

describe("general entries standings services", () => {
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

  it("should return detailed standings for general entries with breakdown", async () => {
    mockDbSelect.mockResolvedValue([
      {
        awardId: "award-1",
        groupName: "Group A",
        points: 20,
        entryName: "March Past",
        categoryName: "Discipline",
      },
      {
        awardId: "award-2",
        groupName: "Group A",
        points: 15,
        entryName: "Camp Cleanliness",
        categoryName: "Hygiene",
      },
      {
        awardId: "award-3",
        groupName: "Group B",
        points: -5,
        entryName: "Late Penalty",
        categoryName: "Conduct",
      },
    ]);

    const result = await computeGeneralEntryStandingsWithDetails("festival-1");
    expect(result).toEqual([
      {
        name: "Group A",
        points: 35,
        isGroup: true,
        entries: [
          {
            id: "award-1",
            name: "March Past",
            categoryName: "Discipline",
            points: 20,
          },
          {
            id: "award-2",
            name: "Camp Cleanliness",
            categoryName: "Hygiene",
            points: 15,
          },
        ],
      },
      {
        name: "Group B",
        points: -5,
        isGroup: true,
        entries: [
          {
            id: "award-3",
            name: "Late Penalty",
            categoryName: "Conduct",
            points: -5,
          },
        ],
      },
    ]);
  });
});
