import { describe, expect, it, vi } from "vitest";

import { serverNowIso } from "../server";
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

describe("parseInstant — NaN-getTime Date never propagates", () => {
  it("returns null for a Date whose getTime is NaN", () => {
    const bad = new Date("not-a-date");
    expect(parseInstant(bad)).toBeNull();
  });

  it("returns null for a freshly-constructed bad Date", () => {
    const bad = new Date(NaN);
    expect(parseInstant(bad)).toBeNull();
  });
});

describe("parseInstant — zero-offset normalisation (the 'everywhere none/empty' bug)", () => {
  it("normalises +00 to Z", () => {
    expect(parseInstant("2026-08-15T09:00:00.000+00")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("normalises -00 to Z", () => {
    expect(parseInstant("2026-08-15T09:00:00.000-00")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("normalises +0000 (no colon) to Z", () => {
    expect(parseInstant("2026-08-15T09:00:00.000+0000")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("normalises +00:00 (with colon) to Z", () => {
    expect(parseInstant("2026-08-15T09:00:00.000+00:00")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("normalises -00:00 (with colon) to Z", () => {
    expect(parseInstant("2026-08-15T09:00:00.000-00:00")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("preserves non-zero offsets", () => {
    expect(parseInstant("2026-08-15T14:30:00.000+05:30")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("normalises +00 on space-separated UTC strings too", () => {
    expect(parseInstant("2026-08-15 09:00:00.000+00")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });
});

describe("parseInstant — last-resort fallback (numeric epoch ms only)", () => {
  it("accepts a 13-digit epoch ms", () => {
    const ms = Date.parse("2026-08-15T09:00:00.000Z").toString();
    const parsed = parseInstant(ms);
    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("rejects non-numeric strings that new Date() accepts (TZ-ambiguous)", () => {
    expect(parseInstant("2026/08/15")).toBeNull();
    expect(parseInstant("15 Aug 2026")).toBeNull();
  });

  it("rejects 9- and 14-digit numbers (out of accepted ms range)", () => {
    expect(parseInstant("123456789")).toBeNull();
    expect(parseInstant(Date.parse("2026-08-15T09:00:00.000Z").toString() + "0")).toBeNull();
  });
});

describe("parseInstant — legacy UTC coercion (the case behind the 'NaNd ago' bug)", () => {
  it("parses space-separated UTC timestamp with milliseconds", () => {
    expect(parseInstant("2026-08-15 09:00:00.000")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("parses space-separated UTC timestamp without milliseconds", () => {
    expect(parseInstant("2026-08-15 09:00:00")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("round-trips with serverNowIso()", () => {
    expect(parseInstant(serverNowIso())).not.toBeNull();
  });

  it("returns null when legacyLocalFormat === 'reject' for space-separated input", () => {
    expect(
      parseInstant("2026-08-15 09:00:00.000", {
        legacyLocalFormat: "reject",
      }),
    ).toBeNull();
  });

  it("still accepts Z-suffixed input when legacyLocalFormat === 'reject'", () => {
    expect(
      parseInstant("2026-08-15T09:00:00.000Z", {
        legacyLocalFormat: "reject",
      })?.toISOString(),
    ).toBe("2026-08-15T09:00:00.000Z");
  });

  it("still accepts date-only input when legacyLocalFormat === 'reject'", () => {
    expect(
      parseInstant("2026-08-15", { legacyLocalFormat: "reject" })?.toISOString(),
    ).toBe("2026-08-15T00:00:00.000Z");
  });

  it("still accepts +00 zero-offset input when legacyLocalFormat === 'reject'", () => {
    expect(
      parseInstant("2026-08-15T09:00:00.000+00", {
        legacyLocalFormat: "reject",
      })?.toISOString(),
    ).toBe("2026-08-15T09:00:00.000Z");
  });
});

describe("parseInstant — debug warn fires once per unique unparseable value", () => {
  it("emits exactly one warn per unique input", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      for (let i = 0; i < 3; i += 1) {
        expect(parseInstant("totally-bogus-string-xyz", {
          debugUnparseable: true,
        })).toBeNull();
      }
      const matches = warnSpy.mock.calls.filter((args) =>
        String(args[0]).includes("totally-bogus-string-xyz"),
      );
      expect(matches).toHaveLength(1);
    } finally {
      warnSpy.mockRestore();
    }
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

  it("throws on legacyLocalFormat === 'reject' input", () => {
    expect(() =>
      parseInstantOrThrow("2026-08-15 09:00:00.000", {
        legacyLocalFormat: "reject",
      }),
    ).toThrow();
  });
});

describe("toDateOrNull", () => {
  it("is an alias for parseInstant", () => {
    expect(toDateOrNull("2026-08-15T09:00:00.000Z")).toEqual(
      parseInstant("2026-08-15T09:00:00.000Z"),
    );
    expect(toDateOrNull(null)).toBeNull();
  });

  it("respects the legacyLocalFormat option", () => {
    expect(
      toDateOrNull("2026-08-15 09:00:00.000", {
        legacyLocalFormat: "reject",
      }),
    ).toBeNull();
  });
});
