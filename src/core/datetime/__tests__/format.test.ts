import { describe, expect, it } from "vitest";

import { FALLBACK_DISPLAY } from "../constants";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatTime,
} from "../format";

const IST_INSTANT = "2026-08-15T03:30:00.000Z";
const NYC_INSTANT = "2026-08-15T09:00:00.000Z";

describe("formatDate", () => {
  it("renders the same instant differently in different timezones", () => {
    const inUTC = formatDate(IST_INSTANT, { tz: "UTC", style: "medium" });
    const inIST = formatDate(IST_INSTANT, {
      tz: "Asia/Kolkata",
      style: "medium",
    });
    expect(inUTC).toBe("15 Aug 2026");
    expect(inIST).toBe("15 Aug 2026");
  });

  it("handles TZ where date rolls over to next day", () => {
    const lateUTC = "2026-08-15T18:30:00.000Z";
    expect(formatDate(lateUTC, { tz: "UTC", style: "medium" })).toBe(
      "15 Aug 2026",
    );
    expect(formatDate(lateUTC, { tz: "Asia/Kolkata", style: "medium" })).toBe(
      "16 Aug 2026",
    );
  });

  it("returns fallback for null / invalid input", () => {
    expect(formatDate(null)).toBe(FALLBACK_DISPLAY);
    expect(formatDate(undefined)).toBe(FALLBACK_DISPLAY);
    expect(formatDate("not-a-date")).toBe(FALLBACK_DISPLAY);
  });

  it("supports short and long styles", () => {
    const out = formatDate(NYC_INSTANT, {
      tz: "America/New_York",
      style: "long",
    });
    expect(out).toContain("2026");
    expect(out).toContain("August");
  });
});

describe("formatTime", () => {
  it("renders the same instant differently in different timezones", () => {
    expect(formatTime(IST_INSTANT, { tz: "UTC" })).toBe("03:30");
    expect(formatTime(IST_INSTANT, { tz: "Asia/Kolkata" })).toBe("09:00");
  });

  it("supports medium style with seconds", () => {
    expect(formatTime(IST_INSTANT, { tz: "UTC", style: "medium" })).toBe(
      "03:30:00",
    );
  });

  it("returns fallback for null", () => {
    expect(formatTime(null)).toBe(FALLBACK_DISPLAY);
  });
});

describe("formatDateTime", () => {
  it("renders date + time in the given tz", () => {
    expect(formatDateTime(IST_INSTANT, { tz: "Asia/Kolkata" })).toBe(
      "15 Aug 2026 09:00",
    );
    expect(formatDateTime(IST_INSTANT, { tz: "UTC" })).toBe(
      "15 Aug 2026 03:30",
    );
  });

  it("returns fallback for null", () => {
    expect(formatDateTime(null)).toBe(FALLBACK_DISPLAY);
  });

  it("defaults tz to UTC when none passed", () => {
    expect(formatDateTime(IST_INSTANT)).toBe("15 Aug 2026 03:30");
  });
});

describe("formatRelative", () => {
  it("formats 'ago' for past instants", () => {
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelative(past)).toMatch(/hours? ago/);
  });

  it("formats 'in X' for future instants when base is provided", () => {
    const future = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const base = new Date().toISOString();
    expect(formatRelative(future, base)).toMatch(/^in /);
  });

  it("returns fallback for null / invalid", () => {
    expect(formatRelative(null)).toBe(FALLBACK_DISPLAY);
    expect(formatRelative("not-a-date")).toBe(FALLBACK_DISPLAY);
  });

  it("formats 'ago' for past instants when base is provided", () => {
    const past = "2026-01-01T00:00:00.000Z";
    const base = "2026-01-02T00:00:00.000Z";
    expect(formatRelative(past, base)).toMatch(/ago$/);
  });
});
