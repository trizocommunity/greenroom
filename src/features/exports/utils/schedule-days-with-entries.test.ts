import { describe, expect, it } from "vitest";

import {
  getScheduledDayKeys,
  hasScheduleEntry,
} from "@/features/exports/utils/schedule-days-with-entries";

// The test runner pins TZ=UTC, so all browser-local expectations are UTC.
describe("getScheduledDayKeys", () => {
  it("returns an empty array for an empty entry list", () => {
    expect(getScheduledDayKeys([])).toEqual([]);
  });

  it("returns a single key for one entry", () => {
    expect(
      getScheduledDayKeys([{ startTime: "2026-08-17T10:00:00.000Z" }]),
    ).toEqual(["2026-08-17"]);
  });

  it("collapses multiple entries on the same day into one key", () => {
    const keys = getScheduledDayKeys([
      { startTime: "2026-08-17T10:00:00.000Z" },
      { startTime: "2026-08-17T18:30:00.000Z" },
      { startTime: "2026-08-17T23:00:00.000Z" },
    ]);
    expect(keys).toEqual(["2026-08-17"]);
  });

  it("returns sorted unique keys across multiple days", () => {
    const keys = getScheduledDayKeys([
      { startTime: "2026-08-19T01:00:00.000Z" },
      { startTime: "2026-08-17T01:00:00.000Z" },
      { startTime: "2026-08-18T01:00:00.000Z" },
      { startTime: "2026-08-17T23:00:00.000Z" },
    ]);
    expect(keys).toEqual(["2026-08-17", "2026-08-18", "2026-08-19"]);
  });

  it("groups entries by browser-local day (UTC in tests)", () => {
    // 2026-08-16T18:30:00Z is still 2026-08-16 in a UTC browser.
    const keys = getScheduledDayKeys([
      { startTime: "2026-08-16T18:30:00.000Z" },
      { startTime: "2026-08-17T10:00:00.000Z" },
    ]);
    expect(keys).toEqual(["2026-08-16", "2026-08-17"]);
  });

  it("skips entries with missing or invalid startTime", () => {
    expect(
      getScheduledDayKeys([
        { startTime: null },
        { startTime: undefined },
        { startTime: "" },
        { startTime: "not-a-date" },
        { startTime: "2026-08-17T10:00:00.000Z" },
      ]),
    ).toEqual(["2026-08-17"]);
  });

  it("accepts Date instances in addition to ISO strings", () => {
    const keys = getScheduledDayKeys([
      { startTime: new Date("2026-08-17T10:00:00.000Z") },
      { startTime: new Date("2026-08-18T10:00:00.000Z") },
    ]);
    expect(keys).toEqual(["2026-08-17", "2026-08-18"]);
  });

  it("prefers explicit scheduleDayKey over deriving from startTime", () => {
    const keys = getScheduledDayKeys([
      {
        startTime: "2026-08-16T18:30:00.000Z",
        scheduleDayKey: "2026-08-16",
      },
    ]);
    expect(keys).toEqual(["2026-08-16"]);
  });

  it("ignores malformed scheduleDayKey and derives from startTime", () => {
    const keys = getScheduledDayKeys([
      {
        startTime: "2026-08-17T10:00:00.000Z",
        scheduleDayKey: "not-a-date",
      },
    ]);
    expect(keys).toEqual(["2026-08-17"]);
  });
});

describe("hasScheduleEntry", () => {
  const keys = ["2026-08-17", "2026-08-18"];

  it("returns true when the day is in the list", () => {
    expect(hasScheduleEntry(keys, "2026-08-17")).toBe(true);
    expect(hasScheduleEntry(keys, "2026-08-18")).toBe(true);
  });

  it("returns false for an empty list", () => {
    expect(hasScheduleEntry([], "2026-08-17")).toBe(false);
  });

  it("returns false for unknown days", () => {
    expect(hasScheduleEntry(keys, "2026-08-19")).toBe(false);
  });
});
