import { describe, expect, it } from "vitest";

import { parseInstant, parseInstantOrThrow, toDateOrNull } from "../parse";

describe("parseInstant", () => {
  it("parses Z-suffixed ISO string", () => {
    const d = parseInstant("2026-08-15T09:00:00.000Z");
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("parses ISO string with explicit offset", () => {
    const d = parseInstant("2026-08-15T14:30:00.000+05:30");
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("treats Postgres-style timestamp without TZ as UTC", () => {
    const d = parseInstant("2026-08-15 09:00:00.000");
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("treats T-separated timestamp without TZ as UTC", () => {
    const d = parseInstant("2026-08-15T09:00:00.000");
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("treats date-only string as midnight UTC", () => {
    const d = parseInstant("2026-08-15");
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe("2026-08-15T00:00:00.000Z");
  });

  it("returns a clone of an existing Date", () => {
    const original = new Date("2026-08-15T09:00:00.000Z");
    const d = parseInstant(original);
    expect(d).not.toBeNull();
    expect(d?.getTime()).toBe(original.getTime());
    expect(d).not.toBe(original);
  });

  it("returns null for invalid Date instance", () => {
    expect(parseInstant(new Date("not-a-date"))).toBeNull();
  });

  it("returns null for null / undefined / empty", () => {
    expect(parseInstant(null)).toBeNull();
    expect(parseInstant(undefined)).toBeNull();
    expect(parseInstant("")).toBeNull();
    expect(parseInstant("   ")).toBeNull();
  });

  it("returns null for unparseable strings", () => {
    expect(parseInstant("not-a-date")).toBeNull();
    expect(parseInstant("2026/08/15")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    const d = parseInstant("  2026-08-15T09:00:00.000Z  ");
    expect(d?.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });
});

describe("parseInstantOrThrow", () => {
  it("returns Date on valid input", () => {
    const d = parseInstantOrThrow("2026-08-15T09:00:00.000Z");
    expect(d.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("throws on invalid input", () => {
    expect(() => parseInstantOrThrow("nope")).toThrow();
  });
});

describe("toDateOrNull", () => {
  it("is an alias for parseInstant", () => {
    expect(toDateOrNull("2026-08-15T09:00:00.000Z")).toEqual(
      parseInstant("2026-08-15T09:00:00.000Z"),
    );
    expect(toDateOrNull(null)).toBeNull();
  });
});
