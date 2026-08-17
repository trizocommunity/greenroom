import "server-only";
import { getRedis } from "@/core/redis/client";
import { keys } from "@/core/redis/keys";

/** Lock TTL — auto-releases on browser close / crash. */
const EDIT_LOCK_TTL_SECONDS = 60;

/**
 * Try to acquire an exclusive editing lock for one entity. Last writer
 * wins on the server; the lock is a UX courtesy ("X is editing this"),
 * not a correctness mechanism.
 *
 * Returns:
 *   - `{ acquired: true }` when this actor now holds the lock
 *   - `{ acquired: false, heldBy }` when another actor holds it
 */
export async function acquireEditLock(
  entityType: "programme" | "category" | "judgementConfig",
  entityId: string,
  actorId: string,
): Promise<{ acquired: true } | { acquired: false; heldBy: string }> {
  const key = keys.editLock(entityType, entityId);
  const result = await getRedis().set(
    key,
    actorId,
    "EX",
    EDIT_LOCK_TTL_SECONDS,
    "NX",
  );
  if (result === "OK") return { acquired: true };

  const heldBy = await getRedis().get(key);
  return { acquired: false, heldBy: heldBy ?? "unknown" };
}

/**
 * Release a lock this actor holds. Uses a Lua script for compare-and-delete
 * so a stale actor (e.g. another browser tab) can't drop the live lock.
 * No-op if the lock has already expired or been claimed by another actor.
 */
const RELEASE_LUA = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

export async function releaseEditLock(
  entityType: "programme" | "category" | "judgementConfig",
  entityId: string,
  actorId: string,
): Promise<void> {
  await getRedis().eval(
    RELEASE_LUA,
    1,
    keys.editLock(entityType, entityId),
    actorId,
  );
}

/**
 * Heartbeat — extends an existing lock this actor holds. Used by long-form
 * edit screens to keep the lock alive while the user is actively typing.
 * Returns true when the heartbeat took, false when the actor no longer
 * holds the lock.
 */
export async function heartbeatEditLock(
  entityType: "programme" | "category" | "judgementConfig",
  entityId: string,
  actorId: string,
): Promise<boolean> {
  const key = keys.editLock(entityType, entityId);
  const result = await getRedis().expire(key, EDIT_LOCK_TTL_SECONDS, "XX");
  // Verify the value matches before extending — `expire XX` succeeds even
  // when the key belongs to someone else; we want a strict CAS.
  if (result !== 1) return false;
  const current = await getRedis().get(key);
  return current === actorId;
}
