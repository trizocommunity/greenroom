import { describe, expect, it, vi } from "vitest";

import {
  midnightInTz,
  relativeDayKey,
  relativeDayLabel,
} from "../relative-day";
import { wallClockToInstant } from "../wall-clock";

describe("relativeDayLabel", () => {
  it("returns the human label for each relative day", () => {
    expect(relativeDayLabel("TODAY")).toBe("Today");
    expect(relativeDayLabel("YESTERDAY")).toBe("Yesterday");
    expect(relativeDayLabel("TOMORROW")).toBe("Tomorrow");
    expect(relativeDayLabel("OTHER")).toBe("Other");
  });
});

describe("relativeDayKey", () => {
  it("returns TODAY for the current instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T10:00:00.000Z"));
    const today = new Date();
    expect(relativeDayKey(today)).toBe("TODAY");
    vi.useRealTimers();
  });

  it("returns OTHER for dates that are not today/yesterday/tomorrow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T10:00:00.000Z"));
    const longAgo = new Date("2025-01-01T10:00:00.000Z");
    expect(relativeDayKey(longAgo)).toBe("OTHER");
    vi.useRealTimers();
  });
});

describe("midnightInTz", () => {
  it("returns the same date if it is already midnight in browser-local", () => {
    // Use noon so the date is the same in every TZ.
    const noon = new Date(2026, 7, 15, 12, 0, 0);
    const result = midnightInTz(noon);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(0);
  });

  it("snaps a non-midnight date to midnight in browser-local", () => {
    const afternoon = new Date(2026, 7, 15, 14, 30);
    const instant = wallClockToInstant("2026-08-15", "00:00");
    const expected = new Date(instant);
    expect(midnightInTz(afternoon).getTime()).toBe(expected.getTime());
  });
});
