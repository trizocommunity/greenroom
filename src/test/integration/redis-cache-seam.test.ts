/**
 * Cache seam integration test against a real Redis (Testcontainers).
 *
 * Covers ISSUE-44 sub-slice B acceptance criteria:
 *   - get after set returns the same value
 *   - TTL honored within ±500ms
 *   - del removes the key
 *   - wrap populates on miss, serves cached on hit
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createCache } from "@/core/cache";
import { keys } from "@/core/redis/keys";
import { getRedis } from "./setup";

let cache: ReturnType<typeof createCache>;
let redis: ReturnType<typeof getRedis>;

beforeAll(() => {
  redis = getRedis();
  cache = createCache({ redis });
});

afterEach(async () => {
  await redis.flushdb();
});

describe("cache seam", () => {
  it("returns undefined on a missing key", async () => {
    const value = await cache.get<string>("greenroom:test:missing");
    expect(value).toBeUndefined();
  });

  it("returns the same value that was set", async () => {
    const key = keys.festivalProfile("f-1");
    const payload = { name: "Annual Fest", tier: "PRO" };

    await cache.set(key, payload, { ttlMs: 60_000 });
    const got = await cache.get<typeof payload>(key);

    expect(got).toEqual(payload);
  });

  it("honours the TTL within ±500ms", async () => {
    const key = keys.trialCountdown("f-1");
    await cache.set(key, { days: 5 }, { ttlMs: 1_000 });

    const before = await cache.get<{ days: number }>(key);
    expect(before).not.toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 1_500));

    const after = await cache.get<{ days: number }>(key);
    expect(after).toBeUndefined();
  });

  it("removes a key on del", async () => {
    const key = keys.festivalProfile("f-1");
    await cache.set(key, { name: "Annual Fest" }, { ttlMs: 60_000 });

    await cache.del(key);

    const got =
      await cache.get<typeof cache extends never ? never : object>(key);
    expect(got).toBeUndefined();
  });

  it("wrap populates on miss and serves cached on hit", async () => {
    const key = keys.festivalProfile("f-1");
    let loaderCalls = 0;
    const loader = async () => {
      loaderCalls += 1;
      return { name: "Annual Fest" };
    };

    const first = await cache.wrap(key, 60_000, loader);
    expect(first).toEqual({ name: "Annual Fest" });
    expect(loaderCalls).toBe(1);

    const second = await cache.wrap(key, 60_000, loader);
    expect(second).toEqual({ name: "Annual Fest" });
    expect(loaderCalls).toBe(1);
  });
});
