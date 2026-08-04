import { describe, expect, it } from "vitest";
import {
  normaliseProgrammeType,
  normaliseStageType,
  parseProgrammeRow,
} from "./programme-row-parser";

const CATEGORIES = [
  { id: "cat-1", name: "Music" },
  { id: "cat-2", name: "Dance" },
];

describe("normaliseProgrammeType", () => {
  it("accepts GROUP variants", () => {
    expect(normaliseProgrammeType("GROUP")).toEqual({ value: "GROUP" });
    expect(normaliseProgrammeType("group")).toEqual({ value: "GROUP" });
    expect(normaliseProgrammeType("Group")).toEqual({ value: "GROUP" });
  });

  it("accepts INDIVIDUAL variants", () => {
    expect(normaliseProgrammeType("INDIVIDUAL")).toEqual({
      value: "INDIVIDUAL",
    });
    expect(normaliseProgrammeType("individual")).toEqual({
      value: "INDIVIDUAL",
    });
    expect(normaliseProgrammeType("Individual")).toEqual({
      value: "INDIVIDUAL",
    });
  });

  it("rejects empty", () => {
    const r = normaliseProgrammeType("");
    expect(r.value).toBe("");
    expect(r.error).toBeDefined();
  });

  it("rejects null/undefined", () => {
    const r = normaliseProgrammeType(null);
    expect(r.value).toBe("");
    expect(r.error).toBeDefined();
  });

  it("rejects unknown values", () => {
    const r = normaliseProgrammeType("Team");
    expect(r.value).toBe("");
    expect(r.error).toBe(`Invalid Type: Team`);
  });

  it("does not silently coerce TEAM to GROUP", () => {
    const r = normaliseProgrammeType("TEAM");
    expect(r.value).toBe("");
    expect(r.error).toBeDefined();
  });
});

describe("normaliseStageType", () => {
  it("defaults to STAGE when blank", () => {
    expect(normaliseStageType("")).toEqual({ value: "STAGE" });
  });

  it("accepts OFF-STAGE / NON_STAGE variants", () => {
    expect(normaliseStageType("OFF-STAGE")).toEqual({ value: "NON_STAGE" });
    expect(normaliseStageType("NON_STAGE")).toEqual({ value: "NON_STAGE" });
    expect(normaliseStageType("Off-Stage")).toEqual({ value: "NON_STAGE" });
  });

  it("rejects unknown values", () => {
    const r = normaliseStageType("underwater");
    expect(r.value).toBe("STAGE");
    expect(r.error).toBeDefined();
  });
});

describe("parseProgrammeRow", () => {
  it("returns a parsed item with strict type", () => {
    const item = parseProgrammeRow(
      ["Solo Singing", "Music", "INDIVIDUAL", "STAGE"],
      0,
      CATEGORIES,
    );
    expect(item.data.type).toBe("INDIVIDUAL");
    expect(item.data.categoryId).toBe("cat-1");
    expect(item.data.stageType).toBe("STAGE");
  });

  it("keeps missing limits as a warning", () => {
    const item = parseProgrammeRow(
      ["Solo Singing", "Music", "INDIVIDUAL", "STAGE"],
      0,
      CATEGORIES,
    );
    expect(item.isValid).toBe(true);
    expect(item.errors).toEqual([]);
    expect(item.warnings).toContain("Set limits manually");
  });

  it("flags unknown type as an error", () => {
    const item = parseProgrammeRow(
      ["Group Song", "Music", "TEAM", "STAGE"],
      1,
      CATEGORIES,
    );
    expect(item.data.type).toBe("");
    expect(item.errors.some((e) => e.includes("Invalid Type"))).toBe(true);
  });

  it("flags missing name", () => {
    const item = parseProgrammeRow(
      ["", "Music", "GROUP", "STAGE"],
      2,
      CATEGORIES,
    );
    expect(item.errors).toContain("Name is required");
  });

  it("flags unknown category", () => {
    const item = parseProgrammeRow(
      ["X", "Painting", "INDIVIDUAL", "STAGE"],
      3,
      CATEGORIES,
    );
    expect(item.errors.some((e) => e.includes("not found"))).toBe(true);
  });

  it("never silently defaults type to INDIVIDUAL", () => {
    const item = parseProgrammeRow(
      ["X", "Music", "", "STAGE"],
      4,
      CATEGORIES,
    );
    expect(item.data.type).toBe("");
    expect(item.errors.some((e) => e.includes("Type"))).toBe(true);
  });
});
