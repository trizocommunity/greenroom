/**
 * Judge-scoring dedup integration test against real Redis (Testcontainers).
 *
 * Covers ISSUE-45 UC18: SET NX EX rejects a duplicate submission within 30s.
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getRedis } from "./setup";

beforeAll(() => {
  getRedis().ping();
});

describe("judge score dedup (Redis)", () => {
  afterEach(async () => {
    await getRedis().flushdb();
  });

  it("first submission acquires, second within window fails", async () => {
    const r = getRedis();
    const key = "greenroom:judge-score:judge-1:config-1";

    const first = await r.set(key, "1", "EX", 30, "NX");
    expect(first).toBe("OK");

    const second = await r.set(key, "1", "EX", 30, "NX");
    expect(second).toBeNull();
  });

  it("different judges for the same config do not collide", async () => {
    const r = getRedis();
    const a = await r.set(
      "greenroom:judge-score:judge-A:config-1",
      "1",
      "EX",
      30,
      "NX",
    );
    const b = await r.set(
      "greenroom:judge-score:judge-B:config-1",
      "1",
      "EX",
      30,
      "NX",
    );
    expect(a).toBe("OK");
    expect(b).toBe("OK");
  });

  it("after TTL expires a new submission is accepted", async () => {
    const r = getRedis();
    const key = "greenroom:judge-score:judge-1:config-1";

    await r.set(key, "1", "PX", 50);
    expect(await r.set(key, "1", "EX", 30, "NX")).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(await r.set(key, "1", "EX", 30, "NX")).toBe("OK");
  });
});
