/**
 * Edit-lock integration test against real Redis (Testcontainers).
 *
 * Covers ISSUE-45 UC16: SET NX EX acquires a lock; CAS release drops it;
 * a second actor is rejected; heartbeat extends.
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  acquireEditLock,
  heartbeatEditLock,
  releaseEditLock,
} from "@/core/locks/edit-lock";
import { keys } from "@/core/redis/keys";
import { getRedis } from "./setup";

const RELEASE_LUA = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

beforeAll(() => {
  getRedis().ping();
});

describe("edit lock (Redis)", () => {
  afterEach(async () => {
    await getRedis().flushdb();
  });

  it("first acquire succeeds, second actor rejected", async () => {
    const first = await acquireEditLock("programme", "p-1", "user-A");
    expect(first).toEqual({ acquired: true });

    const second = await acquireEditLock("programme", "p-1", "user-B");
    expect(second.acquired).toBe(false);
    if (!second.acquired) {
      expect(second.heldBy).toBe("user-A");
    }
  });

  it("release drops the lock; another actor can acquire after", async () => {
    await acquireEditLock("category", "c-1", "user-A");
    await releaseEditLock("category", "c-1", "user-A");

    const next = await acquireEditLock("category", "c-1", "user-B");
    expect(next).toEqual({ acquired: true });
  });

  it("release by a different actor is a no-op", async () => {
    await acquireEditLock("judgementConfig", "j-1", "user-A");
    await releaseEditLock("judgementConfig", "j-1", "user-B");

    const r = getRedis();
    const key = keys.editLock("judgementConfig", "j-1");
    expect(await r.get(key)).toBe("user-A");
  });

  it("CAS release uses Lua compare-and-delete", async () => {
    const r = getRedis();
    const key = keys.editLock("programme", "p-1");
    await r.set(key, "user-A", "EX", 60);

    // Wrong owner — Lua returns 0, key stays.
    await r.eval(RELEASE_LUA, 1, key, "user-B");
    expect(await r.get(key)).toBe("user-A");

    // Right owner — Lua returns 1, key dropped.
    await r.eval(RELEASE_LUA, 1, key, "user-A");
    expect(await r.get(key)).toBeNull();
  });

  it("heartbeat extends the TTL only when actor still holds the lock", async () => {
    const r = getRedis();
    const key = keys.editLock("programme", "p-1");
    await r.set(key, "user-A", "PX", 50);

    // Right actor — extends.
    const own = await heartbeatEditLock("programme", "p-1", "user-A");
    expect(own).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(await r.get(key)).toBe("user-A");

    // Wrong actor — returns false (key still belongs to user-A).
    const foreign = await heartbeatEditLock("programme", "p-1", "user-B");
    expect(foreign).toBe(false);
  });
});
