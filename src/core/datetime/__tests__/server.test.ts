import { describe, expect, it } from "vitest";

import { fromNow, MS, nowPlus, serverNowMs } from "../server";

describe("nowPlus", () => {
  it("returns a Date that is base + offset", () => {
    const base = serverNowMs();
    const future = nowPlus(MS.hour);
    const diff = future.getTime() - base;
    expect(diff).toBeGreaterThanOrEqual(MS.hour - 5);
    expect(diff).toBeLessThanOrEqual(MS.hour + 5);
  });

  it("returns a Date for negative offsets (past)", () => {
    const past = nowPlus(-MS.day);
    expect(past.getTime()).toBeLessThan(serverNowMs());
  });
});

describe("fromNow", () => {
  it("returns a Z-suffixed ISO string", () => {
    expect(fromNow(0)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("supports negative offsets", () => {
    const past = fromNow(-MS.day);
    const parsed = new Date(past);
    expect(parsed.getTime()).toBeLessThan(serverNowMs());
  });
});

describe("MS constants", () => {
  it("uses the conventional millisecond values", () => {
    expect(MS.second).toBe(1_000);
    expect(MS.minute).toBe(60_000);
    expect(MS.hour).toBe(3_600_000);
    expect(MS.day).toBe(86_400_000);
    expect(MS.week).toBe(7 * 86_400_000);
  });
});
