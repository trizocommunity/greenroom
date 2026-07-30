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
    expect(validateTemplateCode("card-default")).toBeNull();
  });

  it("rejects TEAM-* codes (Studio no longer supports team points)", () => {
    expect(validateTemplateCode("TEAM-MAIN")).not.toBeNull();
    expect(validateTemplateCode("TEAM-A")).not.toBeNull();
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

  it("does not map TEAM-* codes (team points deprecated)", () => {
    expect(templateTypeFromCode("TEAM-MAIN")).toBeNull();
  });
});

describe("defaultCodeForType", () => {
  it("returns canonical defaults", () => {
    expect(defaultCodeForType("RESULT")).toBe("RESULT-A");
    expect(defaultCodeForType("CANDIDATE_CARD")).toBe("CARD-DEFAULT");
  });
});
