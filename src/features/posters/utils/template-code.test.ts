import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultCodeForType,
  templateTypeFromCode,
  validateTemplateCode,
} from "./template-code";

describe("validateTemplateCode", () => {
  it("accepts RESULT slot codes", () => {
    assert.equal(validateTemplateCode("RESULT-A"), null);
    assert.equal(validateTemplateCode("RESULT-B"), null);
  });

  it("accepts CARD-* codes", () => {
    assert.equal(validateTemplateCode("CARD-DEFAULT"), null);
    assert.equal(validateTemplateCode("card-default"), null);
  });

  it("rejects TEAM-* codes (Studio no longer supports team points)", () => {
    assert.notEqual(validateTemplateCode("TEAM-MAIN"), null);
    assert.notEqual(validateTemplateCode("TEAM-A"), null);
  });

  it("rejects empty codes", () => {
    assert.notEqual(validateTemplateCode(""), null);
    assert.notEqual(validateTemplateCode("   "), null);
  });

  it("rejects arbitrary codes", () => {
    assert.notEqual(validateTemplateCode("SOMETHING"), null);
  });
});

describe("templateTypeFromCode", () => {
  it("maps RESULT-A/B to RESULT", () => {
    assert.equal(templateTypeFromCode("RESULT-A"), "RESULT");
    assert.equal(templateTypeFromCode("RESULT-B"), "RESULT");
  });

  it("maps CARD-* to CANDIDATE_CARD", () => {
    assert.equal(templateTypeFromCode("CARD-DEFAULT"), "CANDIDATE_CARD");
  });

  it("does not map TEAM-* codes (team points deprecated)", () => {
    assert.equal(templateTypeFromCode("TEAM-MAIN"), null);
  });
});

describe("defaultCodeForType", () => {
  it("returns canonical defaults", () => {
    assert.equal(defaultCodeForType("RESULT"), "RESULT-A");
    assert.equal(defaultCodeForType("CANDIDATE_CARD"), "CARD-DEFAULT");
  });
});
