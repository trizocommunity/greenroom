/**
 * Audit-log dedup integration test against real Redis (Testcontainers).
 *
 * Covers ISSUE-45 UC13: identical (actor, action, targetType, targetId)
 * within the dedup window collapse into a single event.
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getRedis } from "./setup";

const WINDOW_MS = 10_000;

beforeAll(() => {
  // Touch the singleton so the import side-effects fire.
  getRedis().ping();
});

describe("audit dedup (Redis)", () => {
  afterEach(async () => {
    await getRedis().flushdb();
  });

  it("first INCR within window returns 1, second returns 2", async () => {
    const key = "greenroom:audit:actor-1:UPDATE_PROGRAMME:PROGRAMME:prog-1";
    const r = getRedis();

    const first = await r
      .multi()
      .incr(key)
      .pexpire(key, WINDOW_MS, "NX")
      .exec();
    expect(first?.[0]?.[1] as number).toBe(1);

    const second = await r.incr(key);
    expect(second).toBe(2);
  });

  it("PEXPIRE NX does not extend an existing TTL", async () => {
    const key = "greenroom:audit:actor-2:SIGN_IN_EMAIL_OTP:USER:user-2";
    const r = getRedis();

    await r.set(key, "1", "PX", 50);
    await r.pexpire(key, WINDOW_MS, "NX");
    const ttl = await r.pttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(50);
  });
});
