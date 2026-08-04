import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "@/core/errors/errors";
import {
  assertProgrammeType,
  isProgrammeType,
  requireProgrammeType,
} from "./assert-programme-type";

function caught(fn: () => void): string {
  try {
    fn();
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error("expected throw");
}

describe("assertProgrammeType", () => {
  it("accepts INDIVIDUAL", () => {
    expect(() => assertProgrammeType("INDIVIDUAL")).not.toThrow();
  });

  it("accepts GROUP", () => {
    expect(() => assertProgrammeType("GROUP")).not.toThrow();
  });

  it("throws on unknown", () => {
    expect(caught(() => assertProgrammeType("TEAM"))).toBe(
      ERROR_MESSAGES.PROGRAMME_TYPE_UNKNOWN,
    );
  });

  it("throws on null", () => {
    expect(caught(() => assertProgrammeType(null))).toBe(
      ERROR_MESSAGES.PROGRAMME_TYPE_UNKNOWN,
    );
  });

  it("throws on undefined", () => {
    expect(caught(() => assertProgrammeType(undefined))).toBe(
      ERROR_MESSAGES.PROGRAMME_TYPE_UNKNOWN,
    );
  });

  it("throws on empty string", () => {
    expect(caught(() => assertProgrammeType(""))).toBe(
      ERROR_MESSAGES.PROGRAMME_TYPE_UNKNOWN,
    );
  });
});

describe("requireProgrammeType", () => {
  it("returns the type when valid", () => {
    expect(requireProgrammeType("GROUP")).toBe("GROUP");
  });

  it("includes context in error", () => {
    expect(caught(() => requireProgrammeType(null, "judgement"))).toBe(
      `judgement: ${ERROR_MESSAGES.PROGRAMME_TYPE_UNKNOWN}`,
    );
  });
});

describe("isProgrammeType", () => {
  it("returns true for valid types", () => {
    expect(isProgrammeType("INDIVIDUAL")).toBe(true);
    expect(isProgrammeType("GROUP")).toBe(true);
  });

  it("returns false for invalid", () => {
    expect(isProgrammeType("TEAM")).toBe(false);
    expect(isProgrammeType(null)).toBe(false);
    expect(isProgrammeType(undefined)).toBe(false);
    expect(isProgrammeType(123)).toBe(false);
  });
});
