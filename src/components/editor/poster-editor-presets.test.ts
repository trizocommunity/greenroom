import { describe, expect, it } from "vitest";
import {
  calculateAspectRatioDimensions,
  createPresetDocument,
} from "./poster-editor-presets";

describe("poster-editor-presets", () => {
  describe("calculateAspectRatioDimensions", () => {
    it("preserves 16:9 ratio for certificate", () => {
      const dims = calculateAspectRatioDimensions("CERTIFICATE", 1920, 1080);
      expect(dims.width).toBe(2100);
      expect(dims.height).toBe(1181);
    });

    it("preserves 1:1 square ratio for result poster", () => {
      const dims = calculateAspectRatioDimensions("RESULT", 1000, 1000);
      expect(dims.width).toBe(1200);
      expect(dims.height).toBe(1200);
    });

    it("falls back to default dimensions if dimensions are 0", () => {
      const dims = calculateAspectRatioDimensions("CANDIDATE_CARD", 0, 0);
      expect(dims.width).toBe(1050);
      expect(dims.height).toBe(600);
    });
  });

  describe("createPresetDocument", () => {
    it("creates clean canvas (0 elements) when backgroundImageUrl is provided", () => {
      const doc = createPresetDocument("CANDIDATE_CARD", {
        withBackground: true,
        backgroundImageUrl: "blob:http://localhost/test-bg",
        width: 1050,
        height: 600,
      });

      expect(doc.elements.length).toBe(0);
      expect(doc.background.type).toBe("image");
      expect(doc.background.imageUrl).toBe("blob:http://localhost/test-bg");
    });

    it("creates clean canvas (0 elements) for CERTIFICATE when backgroundImageUrl is provided", () => {
      const doc = createPresetDocument("CERTIFICATE", {
        withBackground: true,
        backgroundImageUrl: "blob:http://localhost/cert-bg",
        width: 2100,
        height: 1181,
      });

      expect(doc.elements.length).toBe(0);
      expect(doc.width).toBe(2100);
      expect(doc.height).toBe(1181);
    });

    it("populates default preset elements for CERTIFICATE when blank", () => {
      const doc = createPresetDocument("CERTIFICATE", {
        withBackground: false,
      });

      expect(doc.elements.length).toBeGreaterThan(5);
      const names = doc.elements.map((e) => e.name);
      expect(names).toContain("Certificate Title");
      expect(names).toContain("Participant Name");
      expect(names).toContain("Programme Name");
    });

    it("populates default preset elements for RESULT when blank", () => {
      const doc = createPresetDocument("RESULT", {
        withBackground: true,
      });

      expect(doc.elements.length).toBeGreaterThan(5);
    });

    it("populates default preset elements for CANDIDATE_CARD when blank", () => {
      const doc = createPresetDocument("CANDIDATE_CARD", {
        withBackground: true,
      });

      expect(doc.elements.length).toBeGreaterThan(4);
    });

    it("populates default preset elements for TEAM_POINTS when blank", () => {
      const doc = createPresetDocument("TEAM_POINTS", {
        withBackground: true,
        teamCount: 4,
      });

      expect(doc.elements.length).toBeGreaterThan(5);
    });
  });
});
