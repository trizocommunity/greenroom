import { describe, expect, it } from "vitest";
import { composePickerRange, composePickerValue } from "../date-picker-utils";

describe("composePickerValue", () => {
  it("builds a browser-local Date from yyyy-mm-dd and hh:mm", () => {
    const picked = new Date(2026, 7, 15, 0, 0, 0);
    const out = composePickerValue(picked, "00:00");
    expect(out.getFullYear()).toBe(2026);
    expect(out.getMonth()).toBe(7);
    expect(out.getDate()).toBe(15);
    expect(out.getHours()).toBe(0);
    expect(out.getMinutes()).toBe(0);
  });

  it("ignores the deprecated tz parameter", () => {
    const picked = new Date(2026, 7, 15, 0, 0, 0);
    const out = composePickerValue(picked, "09:00", "Asia/Kolkata");
    expect(out.getHours()).toBe(9);
    expect(out.getMinutes()).toBe(0);
  });

  it("respects a non-zero hh:mm", () => {
    const picked = new Date(2026, 7, 15, 0, 0, 0);
    const out = composePickerValue(picked, "23:00");
    expect(out.getHours()).toBe(23);
  });

  it("supports seconds in the hh:mm field", () => {
    const picked = new Date(2026, 7, 15, 0, 0, 0);
    const out = composePickerValue(picked, "09:30:45");
    expect(out.getSeconds()).toBe(45);
  });
});

describe("composePickerRange", () => {
  it("anchors both halves of a range in browser-local time", () => {
    const out = composePickerRange(
      new Date(2026, 7, 9, 0, 0, 0),
      new Date(2026, 7, 10, 0, 0, 0),
      "00:00",
      "23:00",
    );
    expect(out.start?.getDate()).toBe(9);
    expect(out.start?.getHours()).toBe(0);
    expect(out.end?.getDate()).toBe(10);
    expect(out.end?.getHours()).toBe(23);
  });

  it("returns nulls for an empty range", () => {
    expect(composePickerRange(undefined, undefined, "00:00", "23:00")).toEqual({
      start: null,
      end: null,
    });
  });

  it("supports a half-open range (start only)", () => {
    const out = composePickerRange(
      new Date(2026, 7, 9, 0, 0, 0),
      undefined,
      "09:00",
      "23:00",
    );
    expect(out.start?.getDate()).toBe(9);
    expect(out.start?.getHours()).toBe(9);
    expect(out.end).toBeNull();
  });

  it("supports a half-open range (end only)", () => {
    const out = composePickerRange(
      undefined,
      new Date(2026, 7, 10, 0, 0, 0),
      "00:00",
      "23:00",
    );
    expect(out.start).toBeNull();
    expect(out.end?.getDate()).toBe(10);
    expect(out.end?.getHours()).toBe(23);
  });
});
