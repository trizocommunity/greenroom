import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { festivalEditorPath, festivalTemplatesPath } from "./poster-routes";

describe("festivalEditorPath", () => {
  it("returns /{slug}/editor with no code", () => {
    assert.equal(
      festivalEditorPath("greenroom-fest"),
      "/greenroom-fest/editor",
    );
  });

  it("appends ?code= when a code is provided", () => {
    assert.equal(
      festivalEditorPath("greenroom-fest", "RESULT-A"),
      "/greenroom-fest/editor?code=RESULT-A",
    );
  });
});

describe("festivalTemplatesPath", () => {
  it("returns the renamed templates route", () => {
    assert.equal(
      festivalTemplatesPath("greenroom-fest"),
      "/dashboard/greenroom-fest/templates",
    );
  });
});
