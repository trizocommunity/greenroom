import { describe, expect, it } from "vitest";

import {
  dateKeyLocal,
  dateKeyUTC,
  instantToWallClockParts,
  wallClockToInstant,
  zonedDayKey,
} from "../wall-clock";

describe("wallClockToInstant", () => {
  it("converts IST wall-clock to UTC instant", () => {
    const iso = wallClockToInstant("2026-08-15", "09:00", "Asia/Kolkata");
    expect(iso).toBe("2026-08-15T03:30:00.000Z");
  });

  it("converts NY wall-clock to UTC instant", () => {
    const iso = wallClockToInstant("2026-08-15", "09:00", "America/New_York");
    expect(iso).toBe("2026-08-15T13:00:00.000Z");
  });

  it("defaults to midnight when hhmm omitted", () => {
    const iso = wallClockToInstant("2026-08-15", undefined, "Asia/Kolkata");
    expect(iso).toBe("2026-08-14T18:30:00.000Z");
  });

  it("falls back to UTC when tz omitted", () => {
    const iso = wallClockToInstant("2026-08-15", "09:00");
    expect(iso).toBe("2026-08-15T09:00:00.000Z");
  });

  it("handles DST forward jump (spring forward)", () => {
    const beforeDST = wallClockToInstant(
      "2026-03-08",
      "01:30",
      "America/New_York",
    );
    const afterDST = wallClockToInstant(
      "2026-03-08",
      "03:30",
      "America/New_York",
    );
    expect(beforeDST).toBe("2026-03-08T06:30:00.000Z");
    expect(afterDST).toBe("2026-03-08T07:30:00.000Z");
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
    const original = "2026-08-15T03:30:00.000Z";
    const parts = instantToWallClockParts(original, "Asia/Kolkata");
    expect(parts).toEqual({ yyyymmdd: "2026-08-15", hhmm: "09:00" });
    const roundTripped = wallClockToInstant(
      parts.yyyymmdd,
      parts.hhmm,
      "Asia/Kolkata",
    );
    expect(roundTripped).toBe(original);
  });

  it("renders NY wall-clock", () => {
    const parts = instantToWallClockParts(
      "2026-08-15T13:00:00.000Z",
      "America/New_York",
    );
    expect(parts).toEqual({ yyyymmdd: "2026-08-15", hhmm: "09:00" });
  });

  it("defaults to UTC when tz omitted", () => {
    const parts = instantToWallClockParts("2026-08-15T09:00:00.000Z");
    expect(parts).toEqual({ yyyymmdd: "2026-08-15", hhmm: "09:00" });
  });
});

describe("dateKeyLocal", () => {
  it("returns the local day in the given timezone", () => {
    expect(dateKeyLocal("2026-08-15T18:30:00.000Z", "Asia/Kolkata")).toBe(
      "2026-08-16",
    );
    expect(dateKeyLocal("2026-08-15T18:30:00.000Z", "UTC")).toBe("2026-08-15");
  });

  it("rolls into next day in Pacific/Auckland", () => {
    expect(dateKeyLocal("2026-08-15T13:00:00.000Z", "Pacific/Auckland")).toBe(
      "2026-08-16",
    );
  });

  it("returns empty string for invalid input", () => {
    expect(dateKeyLocal("not-a-date", "UTC")).toBe("");
  });
});

describe("dateKeyUTC", () => {
  it("always returns the UTC day regardless of tz context", () => {
    expect(dateKeyUTC("2026-08-15T18:30:00.000Z")).toBe("2026-08-15");
    expect(dateKeyUTC("2026-08-15T23:59:59.999Z")).toBe("2026-08-15");
    expect(dateKeyUTC("2026-08-16T00:00:00.000Z")).toBe("2026-08-16");
  });

  it("returns empty string for invalid input", () => {
    expect(dateKeyUTC("nope")).toBe("");
  });
});

describe("zonedDayKey", () => {
  it("returns YYYY-MM-DD for a local-midnight Date in tz", () => {
    const d = new Date(2026, 7, 15, 0, 0, 0);
    expect(zonedDayKey(d, "Asia/Kolkata")).toBe("2026-08-15");
  });

  it("uses UTC as the default timezone", () => {
    const d = new Date(Date.UTC(2026, 7, 15, 0, 0, 0));
    expect(zonedDayKey(d)).toBe("2026-08-15");
  });

  it("returns local day in Pacific/Auckland", () => {
    const d = new Date(Date.UTC(2026, 7, 14, 23, 0, 0));
    expect(zonedDayKey(d, "Pacific/Auckland")).toBe("2026-08-15");
  });
});
