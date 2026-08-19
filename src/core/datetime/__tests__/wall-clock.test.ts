import { describe, expect, it } from "vitest";

import {
  dateKeyLocal,
  dateKeyUTC,
  instantToWallClockParts,
  wallClockToInstant,
  zonedDayKey,
} from "../wall-clock";

// Helpers compute the expected local-time output using the runner's
// timezone so the suite passes on any machine.
const pad = (n: number) => n.toString().padStart(2, "0");
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function localTimeHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

describe("wallClockToInstant", () => {
  it("interprets the wall-clock as the runner's local timezone", () => {
    const expected = new Date(2026, 7, 15, 9, 0, 0).toISOString();
    expect(wallClockToInstant("2026-08-15", "09:00")).toBe(expected);
  });

  it("defaults to midnight when hhmm omitted", () => {
    const expected = new Date(2026, 7, 15, 0, 0, 0).toISOString();
    expect(wallClockToInstant("2026-08-15", undefined)).toBe(expected);
  });

  it("accepts seconds", () => {
    const expected = new Date(2026, 7, 15, 9, 0, 30).toISOString();
    expect(wallClockToInstant("2026-08-15", "09:00:30")).toBe(expected);
  });

  it("throws on invalid date format", () => {
    expect(() => wallClockToInstant("15-08-2026", "09:00")).toThrow();
  });

  it("throws on invalid time format", () => {
    expect(() => wallClockToInstant("2026-08-15", "9am")).toThrow();
  });
});

describe("instantToWallClockParts", () => {
  it("round-trips with wallClockToInstant", () => {
    const original = new Date(2026, 7, 15, 9, 0, 0);
    const originalIso = original.toISOString();
    const parts = instantToWallClockParts(originalIso);
    expect(parts).toEqual({
      yyyymmdd: localDateKey(original),
      hhmm: localTimeHHMM(original),
    });
    const roundTripped = wallClockToInstant(parts.yyyymmdd, parts.hhmm);
    expect(roundTripped).toBe(originalIso);
  });

  it("returns local parts (not UTC parts)", () => {
    const date = new Date(2026, 7, 15, 0, 0, 0);
    const parts = instantToWallClockParts(date.toISOString());
    expect(parts).toEqual({
      yyyymmdd: localDateKey(date),
      hhmm: localTimeHHMM(date),
    });
  });
});

describe("dateKeyLocal", () => {
  it("returns the runner's local day for the given instant", () => {
    const date = new Date("2026-08-15T18:30:00.000Z");
    expect(dateKeyLocal("2026-08-15T18:30:00.000Z")).toBe(localDateKey(date));
  });

  it("rolls into the next local day when the instant crosses midnight locally", () => {
    // Construct an instant that's 23:00 local time on Aug 15 — at any tz
    // east of UTC, the UTC date is already Aug 16. dateKeyLocal should
    // still say "2026-08-15" because we ask for the *local* day.
    const localMidnight = new Date(2026, 7, 15, 0, 0, 0);
    const lateLocalEvening = new Date(localMidnight.getTime() + 23 * 3600 * 1000);
    expect(dateKeyLocal(lateLocalEvening.toISOString())).toBe("2026-08-15");
  });

  it("returns empty string for invalid input", () => {
    expect(dateKeyLocal("not-a-date")).toBe("");
  });
});

describe("dateKeyUTC", () => {
  it("always returns the UTC day regardless of the runner's timezone", () => {
    expect(dateKeyUTC("2026-08-15T18:30:00.000Z")).toBe("2026-08-15");
    expect(dateKeyUTC("2026-08-15T23:59:59.999Z")).toBe("2026-08-15");
    expect(dateKeyUTC("2026-08-16T00:00:00.000Z")).toBe("2026-08-16");
  });

  it("returns empty string for invalid input", () => {
    expect(dateKeyUTC("nope")).toBe("");
  });
});

describe("zonedDayKey", () => {
  it("returns YYYY-MM-DD for a Date built from local components", () => {
    const d = new Date(2026, 7, 15, 0, 0, 0);
    expect(zonedDayKey(d)).toBe("2026-08-15");
  });

  it("matches the wall-clock day even when the underlying instant is the prior UTC day", () => {
    // 23:00 local on Aug 14 is still the Aug-14 wall-clock day, even
    // though some UTC representations would put it on Aug 15.
    const d = new Date(2026, 7, 14, 23, 0, 0);
    expect(zonedDayKey(d)).toBe("2026-08-14");
  });
});