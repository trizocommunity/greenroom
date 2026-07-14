import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
    assert.equal(
      isResultVisibleForLeaderboard(row(true, false), "BASIC", "standings"),
      true,
    );
    assert.equal(
      isResultVisibleForLeaderboard(row(true, true), "BASIC", "standings"),
      true,
    );
    assert.equal(
      isResultVisibleForLeaderboard(row(false, true), "BASIC", "standings"),
      false,
    );
    assert.equal(
      isResultVisibleForLeaderboard(row(true, true), "BASIC", "desk"),
      false,
    );
    assert.equal(
      isResultVisibleForLeaderboard(row(true, true), "BASIC", "onAir"),
      false,
    );
  });

  it("Standard desk: published only", () => {
    assert.equal(
      isResultVisibleForLeaderboard(row(true, false), "STANDARD", "desk"),
      true,
    );
    assert.equal(
      isResultVisibleForLeaderboard(row(false, true), "STANDARD", "desk"),
      false,
    );
  });

  it("Standard onAir: published and announced", () => {
    assert.equal(
      isResultVisibleForLeaderboard(row(true, true), "STANDARD", "onAir"),
      true,
    );
    assert.equal(
      isResultVisibleForLeaderboard(row(true, false), "STANDARD", "onAir"),
      false,
    );
    assert.equal(
      isResultVisibleForLeaderboard(row(false, true), "STANDARD", "onAir"),
      false,
    );
  });
});

describe("filterResultsForLeaderboard", () => {
  const results = [row(false, false), row(true, false), row(true, true)];

  it("filters BASIC to published rows only", () => {
    assert.deepEqual(
      filterResultsForLeaderboard(results, "BASIC", "standings"),
      [row(true, false), row(true, true)],
    );
  });

  it("filters Standard onAir to announced published rows", () => {
    assert.deepEqual(
      filterResultsForLeaderboard(results, "STANDARD", "onAir"),
      [row(true, true)],
    );
  });
});
