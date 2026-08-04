import { describe, expect, it } from "vitest";
import { composePickerRange, composePickerValue } from "../date-picker-utils";

describe("composePickerValue", () => {
  it("anchors IST 00:00 on 2026-08-09 to 2026-08-08T18:30:00.000Z", () => {
    // The picker hands us a Date whose wall-clock day in `tz` is "2026-08-09".
    // In a Node CI environment whose own TZ is UTC, `Date.UTC(...)` gives
    // a stable midnight-UTC Date whose `zonedDayKey(..., "Asia/Kolkata")`
    // resolves to "2026-08-09".
    const picked = new Date(Date.UTC(2026, 7, 9, 0, 0, 0));
    const out = composePickerValue(picked, "00:00", "Asia/Kolkata");
    expect(out.toISOString()).toBe("2026-08-08T18:30:00.000Z");
  });

  it("anchors IST 23:00 on 2026-08-10 to 2026-08-10T17:30:00.000Z", () => {
    const picked = new Date(Date.UTC(2026, 7, 10, 0, 0, 0));
    const out = composePickerValue(picked, "23:00", "Asia/Kolkata");
    expect(out.toISOString()).toBe("2026-08-10T17:30:00.000Z");
  });

  it("preserves the same wall-clock in NY (DST-safe)", () => {
    // Picked Date's NY-day is 2026-03-08 (use noon UTC so the NY-day is
    // unambiguous regardless of where the test runner lives). DST starts
    // at 02:00 NY on 2026-03-08 (spring forward), so 03:30 NY is in EDT
    // (UTC-4) → 07:30 UTC.
    const picked = new Date(Date.UTC(2026, 2, 8, 12, 0, 0));
    const out = composePickerValue(picked, "03:30", "America/New_York");
    expect(out.toISOString()).toBe("2026-03-08T07:30:00.000Z");
  });

  it("defaults to UTC when tz omitted", () => {
    const picked = new Date(Date.UTC(2026, 7, 15, 0, 0, 0));
    const out = composePickerValue(picked, "09:00");
    expect(out.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("round-trips through wallClockToInstant(instantToWallClockParts(...))", () => {
    const picked = new Date(Date.UTC(2026, 7, 9, 0, 0, 0));
    const out = composePickerValue(picked, "09:30", "Asia/Kolkata");
    expect(out.toISOString()).toBe("2026-08-09T04:00:00.000Z");
  });
});

describe("composePickerRange", () => {
  it("anchors both halves of an IST range to UTC independently", () => {
    const out = composePickerRange(
      new Date(Date.UTC(2026, 7, 9, 0, 0, 0)),
      new Date(Date.UTC(2026, 7, 10, 0, 0, 0)),
      "00:00",
      "23:00",
      "Asia/Kolkata",
    );
    expect(out.start?.toISOString()).toBe("2026-08-08T18:30:00.000Z");
    expect(out.end?.toISOString()).toBe("2026-08-10T17:30:00.000Z");
  });

  it("returns nulls for an empty range", () => {
    expect(
      composePickerRange(
        undefined,
        undefined,
        "00:00",
        "23:00",
        "Asia/Kolkata",
      ),
    ).toEqual({ start: null, end: null });
  });

  it("supports a half-open range (start only)", () => {
    const out = composePickerRange(
      new Date(Date.UTC(2026, 7, 9, 0, 0, 0)),
      undefined,
      "09:00",
      "23:00",
      "Asia/Kolkata",
    );
    expect(out.start?.toISOString()).toBe("2026-08-09T03:30:00.000Z");
    expect(out.end).toBeNull();
  });

  it("supports a half-open range (end only)", () => {
    const out = composePickerRange(
      undefined,
      new Date(Date.UTC(2026, 7, 10, 0, 0, 0)),
      "00:00",
      "23:00",
      "Asia/Kolkata",
    );
    expect(out.start).toBeNull();
    expect(out.end?.toISOString()).toBe("2026-08-10T17:30:00.000Z");
  });

  it("defaults to UTC when tz omitted", () => {
    const out = composePickerRange(
      new Date(Date.UTC(2026, 7, 15, 0, 0, 0)),
      new Date(Date.UTC(2026, 7, 16, 0, 0, 0)),
      "09:00",
      "17:00",
    );
    expect(out.start?.toISOString()).toBe("2026-08-15T09:00:00.000Z");
    expect(out.end?.toISOString()).toBe("2026-08-16T17:00:00.000Z");
  });
});
