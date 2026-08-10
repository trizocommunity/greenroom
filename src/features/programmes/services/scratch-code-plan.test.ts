import { describe, expect, it } from "vitest";
import {
  type CheckoutRow,
  groupIntoUnits,
  planScratchCodes,
  sequentialAlphabetCode,
  unitKey,
} from "./scratch-code-plan";

/** Deterministic stand-in for the real shuffle: reverses in place. */
function reverseShuffle<T>(arr: T[]): void {
  arr.reverse();
}

function noShuffle<T>(_arr: T[]): void {}

function makeRow(overrides: Partial<CheckoutRow> = {}): CheckoutRow {
  return {
    participantId: "p1",
    groupId: null,
    teamNumber: null,
    assignmentMemberId: null,
    reportedAt: "2026-08-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("sequentialAlphabetCode", () => {
  it("walks the alphabet then rolls over", () => {
    expect(sequentialAlphabetCode(1)).toBe("A");
    expect(sequentialAlphabetCode(26)).toBe("Z");
    expect(sequentialAlphabetCode(27)).toBe("AA");
    expect(sequentialAlphabetCode(52)).toBe("AZ");
    expect(sequentialAlphabetCode(53)).toBe("BA");
  });

  it("clamps non-positive input to the first code", () => {
    expect(sequentialAlphabetCode(0)).toBe("A");
    expect(sequentialAlphabetCode(-3)).toBe("A");
  });
});

describe("unitKey", () => {
  it("keys a team by group and team number", () => {
    expect(unitKey({ groupId: "g1", teamNumber: 2 }, "GROUP")).toBe(
      "team:g1 2",
    );
  });

  it("keys by participant when the programme is individual", () => {
    expect(
      unitKey(
        { participantId: "p1", groupId: "g1", teamNumber: 2 },
        "INDIVIDUAL",
      ),
    ).toBe("solo:p1");
  });

  it("falls back to the participant when team columns are missing", () => {
    expect(
      unitKey(
        { participantId: "p1", groupId: "g1", teamNumber: null },
        "GROUP",
      ),
    ).toBe("solo:p1");
  });
});

describe("groupIntoUnits", () => {
  it("gives every participant their own tile in an individual programme", () => {
    const units = groupIntoUnits(
      [makeRow({ participantId: "p1" }), makeRow({ participantId: "p2" })],
      "INDIVIDUAL",
    );
    expect(units).toHaveLength(2);
    expect(units.map((u) => u.key)).toEqual(["solo:p1", "solo:p2"]);
    expect(units[0]?.recipients).toEqual([
      { participantId: "p1", assignmentMemberId: null },
    ]);
  });

  it("folds a team's members onto one tile", () => {
    const units = groupIntoUnits(
      [
        makeRow({
          participantId: "p1",
          groupId: "g1",
          teamNumber: 1,
          assignmentMemberId: "m1",
        }),
        makeRow({
          participantId: "p2",
          groupId: "g1",
          teamNumber: 1,
          assignmentMemberId: "m2",
        }),
      ],
      "GROUP",
    );
    expect(units).toHaveLength(1);
    expect(units[0]?.key).toBe("team:g1 1");
    expect(units[0]?.participantId).toBeNull();
    expect(units[0]?.recipients).toHaveLength(2);
  });

  it("keeps separate teams from the same group apart", () => {
    const units = groupIntoUnits(
      [
        makeRow({ participantId: "p1", groupId: "g1", teamNumber: 1 }),
        makeRow({ participantId: "p2", groupId: "g1", teamNumber: 2 }),
      ],
      "GROUP",
    );
    expect(units.map((u) => u.key)).toEqual(["team:g1 1", "team:g1 2"]);
  });

  it("takes the earliest checkout time in the unit", () => {
    const units = groupIntoUnits(
      [
        makeRow({
          participantId: "p1",
          groupId: "g1",
          teamNumber: 1,
          reportedAt: "2026-08-10T10:05:00.000Z",
        }),
        makeRow({
          participantId: "p2",
          groupId: "g1",
          teamNumber: 1,
          reportedAt: "2026-08-10T10:01:00.000Z",
        }),
      ],
      "GROUP",
    );
    expect(units[0]?.checkedOutAt).toBe("2026-08-10T10:01:00.000Z");
  });

  it("de-duplicates a participant scanned twice", () => {
    const units = groupIntoUnits(
      [makeRow({ participantId: "p1" }), makeRow({ participantId: "p1" })],
      "INDIVIDUAL",
    );
    expect(units).toHaveLength(1);
    expect(units[0]?.recipients).toHaveLength(1);
  });

  it("drops rows that carry no recipient", () => {
    expect(
      groupIntoUnits([makeRow({ participantId: null })], "INDIVIDUAL"),
    ).toHaveLength(0);
    expect(
      groupIntoUnits(
        [makeRow({ participantId: null, groupId: "g1", teamNumber: 1 })],
        "GROUP",
      ),
    ).toHaveLength(0);
  });
});
describe("planScratchCodes", () => {
  const units = groupIntoUnits(
    [
      makeRow({ participantId: "p1", reportedAt: "2026-08-10T10:01:00.000Z" }),
      makeRow({ participantId: "p2", reportedAt: "2026-08-10T10:02:00.000Z" }),
      makeRow({ participantId: "p3", reportedAt: "2026-08-10T10:03:00.000Z" }),
    ],
    "INDIVIDUAL",
  );

  it("gives every unit exactly one code", () => {
    const plan = planScratchCodes(units, reverseShuffle);
    expect(plan).toHaveLength(3);
    expect(new Set(plan.map((a) => a.code)).size).toBe(3);
  });

  it("numbers the queue by checkout order, not by code order", () => {
    const plan = planScratchCodes(units, reverseShuffle);
    const byParticipant = new Map(plan.map((a) => [a.participantId, a]));

    expect(byParticipant.get("p1")?.queuePosition).toBe(1);
    expect(byParticipant.get("p2")?.queuePosition).toBe(2);
    expect(byParticipant.get("p3")?.queuePosition).toBe(3);

    // Reversed draw order, so the last to check out holds the first code.
    expect(byParticipant.get("p3")?.code).toBe("A");
    expect(byParticipant.get("p1")?.code).toBe("C");
  });

  it("hands out codes in draw order starting at A", () => {
    const plan = planScratchCodes(units, noShuffle);
    expect(plan.map((a) => a.code)).toEqual(["A", "B", "C"]);
    expect(plan.map((a) => a.queuePosition)).toEqual([1, 2, 3]);
  });

  it("issues one queue position per team, not per member", () => {
    const teamUnits = groupIntoUnits(
      [
        makeRow({
          participantId: "p1",
          groupId: "g1",
          teamNumber: 1,
          reportedAt: "2026-08-10T10:01:00.000Z",
        }),
        makeRow({
          participantId: "p2",
          groupId: "g1",
          teamNumber: 1,
          reportedAt: "2026-08-10T10:01:30.000Z",
        }),
        makeRow({
          participantId: "p3",
          groupId: "g2",
          teamNumber: 1,
          reportedAt: "2026-08-10T10:02:00.000Z",
        }),
      ],
      "GROUP",
    );
    const plan = planScratchCodes(teamUnits, noShuffle);
    expect(plan).toHaveLength(2);
    expect(plan.map((a) => a.queuePosition).sort()).toEqual([1, 2]);
    expect(plan.every((a) => a.participantId === null)).toBe(true);
    expect(plan.map((a) => a.groupId)).toEqual(["g1", "g2"]);
  });

  it("assigns contiguous queue positions with no gaps or repeats", () => {
    const many = groupIntoUnits(
      Array.from({ length: 30 }, (_, i) =>
        makeRow({
          participantId: `p${i}`,
          reportedAt: `2026-08-10T10:${String(i).padStart(2, "0")}:00.000Z`,
        }),
      ),
      "INDIVIDUAL",
    );
    const plan = planScratchCodes(many, reverseShuffle);
    expect(plan.map((a) => a.queuePosition).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
    expect(new Set(plan.map((a) => a.code)).size).toBe(30);
  });

  it("sorts units with no checkout time last but stably", () => {
    const mixed = groupIntoUnits(
      [
        makeRow({ participantId: "p2", reportedAt: null }),
        makeRow({ participantId: "p1", reportedAt: null }),
        makeRow({
          participantId: "p3",
          reportedAt: "2026-08-10T10:01:00.000Z",
        }),
      ],
      "INDIVIDUAL",
    );
    const plan = planScratchCodes(mixed, noShuffle);
    const byParticipant = new Map(plan.map((a) => [a.participantId, a]));
    expect(byParticipant.get("p3")?.queuePosition).toBe(1);
    expect(byParticipant.get("p1")?.queuePosition).toBe(2);
    expect(byParticipant.get("p2")?.queuePosition).toBe(3);
  });

  it("returns nothing when nobody checked out", () => {
    expect(planScratchCodes([], reverseShuffle)).toEqual([]);
  });
});
