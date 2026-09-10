import "server-only";
import { randomBytes, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { MS } from "@/core/datetime/constants";
import { serverNowMs } from "@/core/datetime/server";
import { getRedis } from "@/core/redis/client";
import { keys } from "@/core/redis/keys";

/**
 * Remote launch pairing.
 *
 * One active pairing per festival, scoped to the festival's lifetime.
 * The token + 6-digit code are handed to the stage device once at the
 * start of the event and stay valid until the festival expires (or the
 * operator hits "Rotate" to invalidate a leaked URL).
 *
 * Why persistent (not 30-min TTL): the operator preps the stage device
 * minutes before curtain call; bumping into another tab during the wait
 * shouldn't kill the pairing. Festival expiry is the natural upper
 * bound — past that, the festival is offline anyway and no one cares
 * about a launch controller.
 *
 * Storage layout:
 *   greenroom:launch-pairing:<token>            → JSON pairing record
 *   greenroom:launch-pairing:code:<code>        → canonical token
 *   greenroom:launch-pairing:active:<festivalId> → current token (idempotent mint)
 */

const PAIRING_TTL_FLOOR_MS = 24 * MS.hour;
/** Hard cap so a forgotten pairing can't outlive the festival's domain
 *  certificate by months. Most festivals expire within days anyway. */
const PAIRING_TTL_CEILING_MS = 30 * MS.day;
/** SETNX guard TTL. Should comfortably outlive one launch event so a
 *  network-retry between display and stage cannot fire `handleLaunch()`
 *  twice. */
const TRIGGER_GUARD_TTL_MS = 10 * MS.minute;

export interface PairingRecord {
  festivalId: string;
  slug: string;
  name: string;
  mintedBy: string;
  mintedAt: number;
  expiresAt: number;
  /** Token that resolves to this record. */
  token: string;
  /** Short numeric code the operator can read aloud or the guest can type. */
  code: string;
}

export type MintedPairing = PairingRecord;

function makeToken(): string {
  // 32-char URL-safe id, distinct from the numeric pairing code.
  return randomUUID().replace(/-/g, "");
}

function makeCode(): string {
  // 6-digit numeric — short enough to type, large enough that random
  // guessing is impractical over a festival-scoped TTL.
  const bytes = randomBytes(4);
  const n =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, "0");
}

/**
 * Resolve the pairing TTL for a festival. Bounded so:
 *   - we always outlive at least one event day, even if `expiresAt` is
 *     somehow set in the past (operator forgives, clock skew, etc.),
 *   - we never outlive a sane upper bound (prevents a leaked URL from
 *     working for years).
 */
function ttlForFestival(expiresAt: Date | null | undefined): number {
  const remaining = expiresAt ? expiresAt.getTime() - serverNowMs() : 0;
  const floorMs = PAIRING_TTL_FLOOR_MS;
  const ceilingMs = PAIRING_TTL_CEILING_MS;
  // Past or no expiry → just use the floor. Active festival → use the
  // smaller of "until festival ends" and "ceiling".
  const bounded = Math.max(
    floorMs,
    Math.min(ceilingMs, remaining > 0 ? remaining : floorMs),
  );
  return bounded;
}

/**
 * Get-or-create the active pairing for this festival. If a pairing is
 * already minted and still alive (i.e. Redis hasn't expired it), return
 * it unchanged — the operator's tab may unmount and remount during the
 * event and the guest's URL stays valid.
 *
 * Returns `null` only when the festival row can't be found.
 */
export async function mintPairing(input: {
  festivalId: string;
  mintedBy: string;
  /** When true, ignore any active pairing and mint a fresh one. Used by
   *  the operator's "Rotate" button. */
  rotate?: boolean;
}): Promise<MintedPairing | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, input.festivalId),
    columns: {
      id: true,
      slug: true,
      name: true,
      expiresAt: true,
    },
  });
  if (!festival) return null;

  const redis = getRedis();
  // Drizzle's `tzTimestamp` returns an ISO string. Coerce defensively in
  // case the column type ever flips — `ttlForFestival` handles both.
  const ttlMs = ttlForFestival(
    typeof festival.expiresAt === "string"
      ? new Date(festival.expiresAt)
      : festival.expiresAt,
  );

  // Get-or-create path. Only check the active index when the caller
  // didn't explicitly request a rotation.
  if (!input.rotate) {
    const existingToken = await redis.get(
      keys.launchPairingActive(festival.id),
    );
    if (existingToken) {
      const existing = await readPairing(existingToken);
      if (existing && existing.expiresAt > serverNowMs()) {
        return existing;
      }
      // Stale active pointer (TTL race) — fall through and mint.
    }
  }

  // Mint fresh. Tear down any stale indices for this festival before
  // writing new ones so the previous token can't still be used.
  await retirePairing(festival.id);

  const now = serverNowMs();
  const expiresAt = now + ttlMs;
  const token = makeToken();
  const code = makeCode();

  const record: PairingRecord = {
    festivalId: festival.id,
    slug: festival.slug,
    name: festival.name,
    mintedBy: input.mintedBy,
    mintedAt: now,
    expiresAt,
    token,
    code,
  };

  // Three writes, all with the same TTL — if any one of them lands
  // before another fails, the next mint() will re-derive a consistent
  // state because `active:` is the source of truth.
  await Promise.all([
    redis.set(keys.launchPairing(token), JSON.stringify(record), "PX", ttlMs),
    redis.set(keys.launchPairingCode(code), token, "PX", ttlMs),
    redis.set(keys.launchPairingActive(festival.id), token, "PX", ttlMs),
  ]);

  return record;
}

async function readPairing(token: string): Promise<PairingRecord | null> {
  const raw = await getRedis().get(keys.launchPairing(token));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PairingRecord;
  } catch {
    return null;
  }
}

/**
 * Resolve a token or typed code to a live pairing. Both lookups go
 * through the same record; the code index only ever points at the
 * canonical token.
 */
export async function verifyPairing(
  tokenOrCode: string,
): Promise<PairingRecord | null> {
  const redis = getRedis();
  const canonical = /^\d{6}$/.test(tokenOrCode)
    ? await redis.get(keys.launchPairingCode(tokenOrCode))
    : tokenOrCode;
  if (!canonical) return null;

  const record = await readPairing(canonical);
  if (!record) return null;
  if (record.expiresAt <= serverNowMs()) return null;
  return record;
}

/**
 * Drop all indices for the festival's currently active pairing. Used by
 * the operator's "Rotate" button and internally when minting fresh.
 */
export async function retirePairing(festivalId: string): Promise<void> {
  const redis = getRedis();
  const existingToken = await redis.get(keys.launchPairingActive(festivalId));
  if (!existingToken) return;
  const record = await readPairing(existingToken);
  await Promise.all([
    redis.del(keys.launchPairing(existingToken)),
    redis.del(keys.launchPairingActive(festivalId)),
    record?.code ? redis.del(keys.launchPairingCode(record.code)) : null,
  ]);
}

/**
 * Operator-initiated rotation. Wipes the active pairing and mints a
 * fresh one in a single call — the previous URL becomes inert
 * immediately.
 */
export async function rotatePairing(input: {
  festivalId: string;
  mintedBy: string;
}): Promise<MintedPairing | null> {
  return mintPairing({ ...input, rotate: true });
}

/**
 * Idempotency guard. Returns `true` if this is the first trigger attempt
 * for this festival in the guard window; `false` if a trigger already
 * succeeded.
 */
export async function claimLaunchTrigger(festivalId: string): Promise<boolean> {
  const res = await getRedis().set(
    keys.launchTriggerGuard(festivalId),
    "1",
    "PX",
    TRIGGER_GUARD_TTL_MS,
    "NX",
  );
  return res === "OK";
}

/** Reset the idempotency guard so the festival can be re-launched. */
export async function releaseLaunchTrigger(festivalId: string): Promise<void> {
  await getRedis().del(keys.launchTriggerGuard(festivalId));
}