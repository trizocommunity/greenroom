import { describe, expect, it } from "vitest";
import { festivalEditorPath, festivalTemplatesPath } from "./poster-routes";

describe("festivalEditorPath", () => {
  it("returns /{slug}/editor with no code", () => {
    expect(festivalEditorPath("greenroom-fest")).toBe("/greenroom-fest/editor");
  });

  it("appends ?code= when a code is provided", () => {
    expect(festivalEditorPath("greenroom-fest", "RESULT-A")).toBe(
      "/greenroom-fest/editor?code=RESULT-A",
    );
  });
});

describe("festivalTemplatesPath", () => {
  it("returns the renamed templates route", () => {
    expect(festivalTemplatesPath("greenroom-fest")).toBe(
      "/dashboard/greenroom-fest/templates",
    );
  });
});
