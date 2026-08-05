import { describe, expect, it } from "vitest";
import {
  defaultCodeForType,
  templateTypeFromCode,
  validateTemplateCode,
} from "./template-code";

describe("validateTemplateCode", () => {
  it("accepts RESULT slot codes", () => {
    expect(validateTemplateCode("RESULT-A")).toBeNull();
    expect(validateTemplateCode("RESULT-B")).toBeNull();
  });

  it("accepts CARD-* codes", () => {
    expect(validateTemplateCode("CARD-DEFAULT")).toBeNull();
    expect(validateTemplateCode("CARD-A")).toBeNull();
  });

  it("accepts TEAM-* codes", () => {
    expect(validateTemplateCode("TEAM-MAIN")).toBeNull();
    expect(validateTemplateCode("TEAM-A")).toBeNull();
  });

  it("rejects empty codes", () => {
    expect(validateTemplateCode("")).not.toBeNull();
    expect(validateTemplateCode("   ")).not.toBeNull();
  });

  it("rejects arbitrary codes", () => {
    expect(validateTemplateCode("SOMETHING")).not.toBeNull();
  });
});

describe("templateTypeFromCode", () => {
  it("maps RESULT-A/B to RESULT", () => {
    expect(templateTypeFromCode("RESULT-A")).toBe("RESULT");
    expect(templateTypeFromCode("RESULT-B")).toBe("RESULT");
  });

  it("maps CARD-* to CANDIDATE_CARD", () => {
    expect(templateTypeFromCode("CARD-DEFAULT")).toBe("CANDIDATE_CARD");
  });

  it("maps TEAM-* codes to TEAM_POINTS", () => {
    expect(templateTypeFromCode("TEAM-MAIN")).toBe("TEAM_POINTS");
  });
});

describe("defaultCodeForType", () => {
  it("returns canonical defaults", () => {
    expect(defaultCodeForType("RESULT")).toBe("RESULT-A");
    expect(defaultCodeForType("CANDIDATE_CARD")).toBe("CARD-DEFAULT");
  });
});
