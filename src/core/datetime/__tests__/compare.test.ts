import { describe, expect, it } from "vitest";

import {
  isAfter,
  isBefore,
  isExpired,
  isSameDayLocal,
  msUntil,
} from "../compare";

const PAST = "2020-01-01T00:00:00.000Z";
const FUTURE = "2099-12-31T00:00:00.000Z";
const NEAR_PAST = "2026-08-15T09:00:00.000Z";
const NEAR_FUTURE = "2026-08-15T11:00:00.000Z";

describe("isBefore", () => {
  it("returns true when a < b", () => {
    expect(isBefore(PAST, FUTURE)).toBe(true);
  });

  it("returns false when a >= b", () => {
    expect(isBefore(FUTURE, PAST)).toBe(false);
    expect(isBefore(PAST, PAST)).toBe(false);
  });

  it("treats null as -Infinity", () => {
    expect(isBefore(null, PAST)).toBe(true);
    expect(isBefore(PAST, null)).toBe(false);
    expect(isBefore(null, null)).toBe(false);
  });
});

describe("isAfter", () => {
  it("returns true when a > b", () => {
    expect(isAfter(FUTURE, PAST)).toBe(true);
  });

  it("returns false when a <= b", () => {
    expect(isAfter(PAST, FUTURE)).toBe(false);
    expect(isAfter(PAST, PAST)).toBe(false);
  });

  it("treats null as +Infinity", () => {
    expect(isAfter(null, PAST)).toBe(false);
    expect(isAfter(PAST, null)).toBe(true);
    expect(isAfter(null, null)).toBe(false);
  });
});

describe("isExpired", () => {
  it("returns true for past instants relative to base", () => {
    expect(isExpired(PAST, FUTURE)).toBe(true);
  });

  it("returns false for future instants", () => {
    expect(isExpired(FUTURE, PAST)).toBe(false);
  });

  it("returns false for null / undefined (not set)", () => {
    expect(isExpired(null)).toBe(false);
    expect(isExpired(undefined)).toBe(false);
    expect(isExpired("")).toBe(false);
  });

  it("returns true for now-ish instant when base is later", () => {
    const base = new Date("2026-08-15T10:00:00.000Z");
    expect(isExpired(NEAR_PAST, base)).toBe(true);
    expect(isExpired(NEAR_FUTURE, base)).toBe(false);
  });

  it("accepts Date object as base", () => {
    const base = new Date("2026-08-15T10:00:00.000Z");
    expect(isExpired(NEAR_PAST, base)).toBe(true);
  });
});

describe("msUntil", () => {
  it("returns positive ms when target is in the future", () => {
    const base = new Date("2026-08-15T10:00:00.000Z");
    const ms = msUntil("2026-08-15T11:00:00.000Z", base);
    expect(ms).toBe(60 * 60 * 1000);
  });

  it("returns negative ms when target is in the past", () => {
    const base = new Date("2026-08-15T10:00:00.000Z");
    const ms = msUntil("2026-08-15T09:00:00.000Z", base);
    expect(ms).toBe(-60 * 60 * 1000);
  });

  it("returns 0 for null input", () => {
    expect(msUntil(null)).toBe(0);
    expect(msUntil(undefined)).toBe(0);
    expect(msUntil("")).toBe(0);
  });
});

describe("isSameDayLocal", () => {
  it("returns true for two instants on the same local day", () => {
    expect(
      isSameDayLocal(
        "2026-08-15T09:00:00.000Z",
        "2026-08-15T20:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("returns true across midnight when same local day", () => {
    const localMidnight = new Date(2026, 7, 15, 0, 0, 0);
    const lateLocal = new Date(localMidnight.getTime() + 23 * 3600 * 1000);
    expect(isSameDayLocal(localMidnight.toISOString(), lateLocal.toISOString())).toBe(
      true,
    );
  });

  it("returns false when on different local days", () => {
    const localMidnight = new Date(2026, 7, 15, 0, 0, 0);
    const nextLocalMidnight = new Date(localMidnight.getTime() + 24 * 3600 * 1000);
    expect(isSameDayLocal(localMidnight.toISOString(), nextLocalMidnight.toISOString())).toBe(
      false,
    );
  });

  it("returns false for invalid input", () => {
    expect(isSameDayLocal("nope", "2026-08-15T09:00:00.000Z")).toBe(false);
    expect(isSameDayLocal(null as unknown as string, "x")).toBe(false);
  });
});
