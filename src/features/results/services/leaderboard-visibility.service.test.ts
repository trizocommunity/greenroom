import { describe, expect, it } from "vitest";
import {
  filterResultsForLeaderboard,
  isResultVisibleForLeaderboard,
} from "./leaderboard-visibility.service";

const row = (published: boolean) => ({
  isPublished: published,
});

describe("isResultVisibleForLeaderboard", () => {
  it("BASIC standings: published only", () => {
    expect(isResultVisibleForLeaderboard(row(true), "BASIC", "standings")).toBe(
      true,
    );
    expect(
      isResultVisibleForLeaderboard(row(false), "BASIC", "standings"),
    ).toBe(false);
    expect(isResultVisibleForLeaderboard(row(true), "BASIC", "desk")).toBe(
      false,
    );
    expect(isResultVisibleForLeaderboard(row(true), "BASIC", "onAir")).toBe(
      false,
    );
  });

  it("Standard desk: published only", () => {
    expect(isResultVisibleForLeaderboard(row(true), "STANDARD", "desk")).toBe(
      true,
    );
    expect(isResultVisibleForLeaderboard(row(false), "STANDARD", "desk")).toBe(
      false,
    );
  });

  it("Standard onAir: published only (no separate announce step)", () => {
    expect(isResultVisibleForLeaderboard(row(true), "STANDARD", "onAir")).toBe(
      true,
    );
    expect(isResultVisibleForLeaderboard(row(false), "STANDARD", "onAir")).toBe(
      false,
    );
  });
});

describe("filterResultsForLeaderboard", () => {
  const results = [row(false), row(true), row(true)];

  it("filters BASIC to published rows only", () => {
    expect(filterResultsForLeaderboard(results, "BASIC", "standings")).toEqual([
      row(true),
      row(true),
    ]);
  });

  it("filters Standard onAir to published rows", () => {
    expect(filterResultsForLeaderboard(results, "STANDARD", "onAir")).toEqual([
      row(true),
      row(true),
    ]);
  });
});
