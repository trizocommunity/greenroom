import { describe, expect, it } from "vitest";
import {
  filterResultsForLeaderboard,
  isResultVisibleForLeaderboard,
} from "./leaderboard-visibility.service";

const row = (published: boolean, announced: boolean) => ({
  isPublished: published,
  isAnnounced: announced,
});

describe("isResultVisibleForLeaderboard", () => {
  it("BASIC standings: published only", () => {
    expect(
      isResultVisibleForLeaderboard(row(true, false), "BASIC", "standings"),
    ).toBe(true);
    expect(
      isResultVisibleForLeaderboard(row(true, true), "BASIC", "standings"),
    ).toBe(true);
    expect(
      isResultVisibleForLeaderboard(row(false, true), "BASIC", "standings"),
    ).toBe(false);
    expect(
      isResultVisibleForLeaderboard(row(true, true), "BASIC", "desk"),
    ).toBe(false);
    expect(
      isResultVisibleForLeaderboard(row(true, true), "BASIC", "onAir"),
    ).toBe(false);
  });

  it("Standard desk: published only", () => {
    expect(
      isResultVisibleForLeaderboard(row(true, false), "STANDARD", "desk"),
    ).toBe(true);
    expect(
      isResultVisibleForLeaderboard(row(false, true), "STANDARD", "desk"),
    ).toBe(false);
  });

  it("Standard onAir: published and announced", () => {
    expect(
      isResultVisibleForLeaderboard(row(true, true), "STANDARD", "onAir"),
    ).toBe(true);
    expect(
      isResultVisibleForLeaderboard(row(true, false), "STANDARD", "onAir"),
    ).toBe(false);
    expect(
      isResultVisibleForLeaderboard(row(false, true), "STANDARD", "onAir"),
    ).toBe(false);
  });
});

describe("filterResultsForLeaderboard", () => {
  const results = [row(false, false), row(true, false), row(true, true)];

  it("filters BASIC to published rows only", () => {
    expect(filterResultsForLeaderboard(results, "BASIC", "standings")).toEqual([
      row(true, false),
      row(true, true),
    ]);
  });

  it("filters Standard onAir to announced published rows", () => {
    expect(filterResultsForLeaderboard(results, "STANDARD", "onAir")).toEqual([
      row(true, true),
    ]);
  });
});
