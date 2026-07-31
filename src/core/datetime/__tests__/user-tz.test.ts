import { describe, expect, it } from "vitest";

import { DEFAULT_TZ } from "../constants";
import {
  getBrowserTimezone,
  isValidTimezone,
  supportedTimezones,
} from "../user-tz";

describe("getBrowserTimezone", () => {
  it("returns an IANA timezone name", () => {
    const tz = getBrowserTimezone();
    expect(typeof tz).toBe("string");
    expect(tz.length).toBeGreaterThan(0);
    expect(tz).not.toBe("");
  });

  it("contains a slash (IANA names are Region/City)", () => {
    const tz = getBrowserTimezone();
    const isIANA = tz === "UTC" || tz.includes("/");
    expect(isIANA).toBe(true);
  });
});

describe("supportedTimezones", () => {
  it("returns an array (possibly empty on unsupported runtimes)", () => {
    const list = supportedTimezones();
    expect(Array.isArray(list)).toBe(true);
  });
});

describe("isValidTimezone", () => {
  it("returns true for a known IANA name", () => {
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
  });

  it("returns false for an unknown name when supportedValuesOf is available", () => {
    const list = supportedTimezones();
    if (list.length === 0) {
      expect(isValidTimezone("Definitely/Not_A_Zone")).toBe(true);
    } else {
      expect(isValidTimezone("Definitely/Not_A_Zone")).toBe(false);
    }
  });
});

describe("DEFAULT_TZ constant", () => {
  it("is UTC", () => {
    expect(DEFAULT_TZ).toBe("UTC");
  });
});
