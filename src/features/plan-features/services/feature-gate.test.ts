import { describe, expect, it } from "vitest";
import {
  getPostExpiryAccess,
  getValue,
  hasSupportLevel,
  isEnabled,
} from "./feature-gate";

describe("feature-gate", () => {
  describe("isEnabled", () => {
    it("reads the configured value when no overrides are passed", () => {
      expect(isEnabled("BASIC", "excelExport")).toBe(false);
      expect(isEnabled("STANDARD", "excelExport")).toBe(true);
      expect(isEnabled("PRO", "excelExport")).toBe(true);
    });

    it("applies overrides when provided", () => {
      expect(isEnabled("BASIC", "excelExport", { excelExport: true })).toBe(
        true,
      );
      expect(isEnabled("STANDARD", "excelExport", { excelExport: false })).toBe(
        false,
      );
    });

    it("falls back to config when the feature is not overridden", () => {
      expect(isEnabled("BASIC", "excelExport", { pdfExport: true })).toBe(
        false,
      );
    });

    it("coerces nullable and string tiers to BASIC", () => {
      expect(isEnabled(null, "excelExport")).toBe(false);
      expect(isEnabled(undefined, "excelExport")).toBe(false);
      expect(isEnabled("UNKNOWN_TIER" as any, "excelExport")).toBe(false);
    });

    it("returns false for a feature that is not defined", () => {
      expect(isEnabled("BASIC", "nonExistent" as any)).toBe(false);
    });
  });

  describe("getValue", () => {
    it("returns non-boolean values from config", () => {
      expect(getValue<string>("BASIC", "supportLevel")).toBe("whatsapp");
      expect(getValue<number>("BASIC", "supportResponseTime")).toBe(24);
      expect(getValue<"delete" | "readonly">("BASIC", "postExpiryAccess")).toBe(
        "delete",
      );
    });

    it("returns null for an undefined feature", () => {
      expect(getValue("BASIC", "nonExistent" as any)).toBeNull();
    });

    it("coerces nullable tier to BASIC", () => {
      expect(getValue<string>(null, "supportLevel")).toBe("whatsapp");
    });
  });

  describe("hasSupportLevel", () => {
    it("returns true when the tier meets the required level", () => {
      expect(hasSupportLevel("BASIC", "whatsapp")).toBe(true);
      expect(hasSupportLevel("STANDARD", "priority")).toBe(true);
      expect(hasSupportLevel("STANDARD", "whatsapp")).toBe(true);
    });

    it("returns false when the tier is below the required level", () => {
      expect(hasSupportLevel("BASIC", "priority")).toBe(false);
      expect(hasSupportLevel("BASIC", "premium")).toBe(false);
    });
  });

  describe("getPostExpiryAccess", () => {
    it("returns the configured post-expiry policy", () => {
      expect(getPostExpiryAccess("BASIC")).toBe("delete");
    });

    it("defaults to readonly when not configured", () => {
      expect(getPostExpiryAccess("UNKNOWN_TIER" as any)).toBe("readonly");
    });
  });
});
