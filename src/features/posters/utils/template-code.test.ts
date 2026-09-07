import { describe, expect, it } from "vitest";
import {
  defaultCodeForType,
  suggestNextTemplateCode,
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
    expect(defaultCodeForType("CERTIFICATE")).toBe("CERT-DEFAULT");
    expect(defaultCodeForType("TEAM_POINTS")).toBe("TEAM-MAIN");
  });
});

describe("suggestNextTemplateCode", () => {
  it("suggests RESULT-A then RESULT-B", () => {
    expect(suggestNextTemplateCode("RESULT", [])).toBe("RESULT-A");
    expect(suggestNextTemplateCode("RESULT", ["RESULT-A"])).toBe("RESULT-B");
  });

  it("suggests CARD-DEFAULT then CARD-01, CARD-02", () => {
    expect(suggestNextTemplateCode("CANDIDATE_CARD", [])).toBe("CARD-DEFAULT");
    expect(suggestNextTemplateCode("CANDIDATE_CARD", ["CARD-DEFAULT"])).toBe(
      "CARD-01",
    );
    expect(
      suggestNextTemplateCode("CANDIDATE_CARD", ["CARD-DEFAULT", "CARD-01"]),
    ).toBe("CARD-02");
  });

  it("suggests CERT-DEFAULT then CERT-01", () => {
    expect(suggestNextTemplateCode("CERTIFICATE", [])).toBe("CERT-DEFAULT");
    expect(suggestNextTemplateCode("CERTIFICATE", ["CERT-DEFAULT"])).toBe(
      "CERT-01",
    );
  });

  it("suggests TEAM-MAIN then TEAM-01", () => {
    expect(suggestNextTemplateCode("TEAM_POINTS", [])).toBe("TEAM-MAIN");
    expect(suggestNextTemplateCode("TEAM_POINTS", ["TEAM-MAIN"])).toBe(
      "TEAM-01",
    );
  });
});
