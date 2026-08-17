# Redis — Cache Use Cases (Phase 1)

## Status

- **Type**: AFK — 20 use cases. All use only `GET / SET / DEL / INCR / EXPIRE / ZADD / ZREVRANGE / HSET / SET NX`. No Streams, no pub/sub, no blocking commands.
- **Blocked by**: `ISSUE-44` (foundation — `ioredis` client + cache seam must exist).
- **Blocks**: `ISSUE-46` (Phase 2 readers consume some keys written here — e.g. announcer queue position is set by result publish, read by SSE).

## Summary

Twenty concrete cache use cases covering the read-heavy, write-rarely, or hot-path surfaces across the Greenroom platform — rate limits, Feature Gates, public surface caches, per-user notification prefs, edit locks, abuse counters, leaderboard extensions, and signature caches. Each one uses primitives that work identically under the `ioredis` client wired in `ISSUE-44`. The cache seam at `src/core/cache/index.ts` keeps every consumer backend-agnostic — all of these could be re-pointed at Upstash HTTP or an in-memory LRU without touching the feature code.

### Redis primitives used in this issue

`GET`, `SET` (`PX`), `SET NX EX`, `DEL`, `EXISTS`, `INCR`, `EXPIRE` / `PEXPIRE`, `ZADD`, `ZREM`, `ZREVRANGE`, `HSET`, `HGETALL`, `HDEL`, `MGET`, `MSET`, `EXPIREAT`. No Streams, no `SUBSCRIBE`, no `XADD`.

### Cache-key namespace map

Every key in this issue lives under a single `greenroom:` prefix and uses the typed builder in `src/core/redis/keys.ts`. The full namespace is documented in `ISSUE-44` sub-slice B.

## Table of contents

- [Use case 1 — Rate limiter](#use-case-1--rate-limiter)
- [Use case 2 — Feature Gate cache](#use-case-2--feature-gate-cache)
- [Use case 3 — Custom-domain host → festivalId cache](#use-case-3--custom-domain-host--festivalid-cache)
- [Use case 4 — Top-scorers leaderboard via ZSET](#use-case-4--top-scorers-leaderboard-via-zset)
- [Use case 5 — Festival public profile + counters](#use-case-5--festival-public-profile--counters)
- [Use case 6 — Public lists cache](#use-case-6--public-lists-cache)
- [Use case 7 — Slug → festivalId cache](#use-case-7--slug--festivalid-cache)
- [Use case 8 — TanStack Query hydration cache](#use-case-8--tanstack-query-hydration-cache)
- [Use case 9 — OTP throttles](#use-case-9--otp-throttles)
- [Use case 10 — QR code replay protection](#use-case-10--qr-code-replay-protection)
- [Use case 11 — Plan-feature flag snapshot](#use-case-11--plan-feature-flag-snapshot)
- [Use case 12 — Trial countdown cache](#use-case-12--trial-countdown-cache)
- [Use case 13 — Audit log dedup counter](#use-case-13--audit-log-dedup-counter)
- [Use case 14 — Email preferences cache](#use-case-14--email-preferences-cache)
- [Use case 15 — Pricing + marketing page data cache](#use-case-15--pricing--marketing-page-data-cache)
- [Use case 16 — Concurrent editing lock](#use-case-16--concurrent-editing-lock)
- [Use case 17 — Per-category leaderboard ZSET](#use-case-17--per-category-leaderboard-zset)
- [Use case 18 — Judge scoring dedup](#use-case-18--judge-scoring-dedup)
- [Use case 19 — Cloudinary upload signature cache](#use-case-19--cloudinary-upload-signature-cache)
- [Use case 20 — Better Auth 2FA backup code throttle](#use-case-20--better-auth-2fa-backup-code-throttle)
- [Out of scope](#out-of-scope)
- [Acceptance (overall)](#acceptance-overall)
- [Verification](#verification)
- [Open questions to confirm](#open-questions-to-confirm)

---

## Use case 1 — Rate limiter

**Touches**: `src/core/http/rate-limit.ts` · `package.json` (drop `lru-cache`).

### What to build

Replace the per-instance `LRUCache` rate limiter with a Redis-backed counter shared across all Vercel function instances.

### Acceptance criteria

- [ ] Removes `LRUCache` import from `src/core/http/rate-limit.ts`.
- [ ] Uses `INCR` + `PEXPIRE` in one pipeline.
- [ ] Key: `keys.rateLimit(identifier)` = `greenroom:ratelimit:<sha1(ip)[:16]>`.
- [ ] On Redis failure: fail-open with `console.warn`.
- [ ] Integration test: 5 requests within window all `allowed`; 6th rejected; after window expires resets.
- [ ] `lru-cache` removed from `package.json` once `grep` confirms no other consumer.

### Risks & rollback

- **Vercel cold start races** between `INCR` (creates key at 1) and `PEXPIRE` (sets TTL). Pipeline makes this atomic.
- **Fail-open on outage** could let a brute-force through during a Redis incident. Acceptable trade-off — `lru-cache` was per-instance anyway and reset on cold start.
- **Rollback**: revert `src/core/http/rate-limit.ts`; re-add `lru-cache`. Existing callers see no API change.

### Observability

- Log `rate-limit:hit`, `rate-limit:block`, `rate-limit:fail-open` at debug / warn.
- Counter: `rate_limit_blocks_total{identifier="<hash>"}` (sampled, not per-IP to avoid cardinality explosion).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Window type | Fixed | Matches current `LRUCache` behavior; sliding window is a separate upgrade. |
| 2 | Hash IP | `sha1(ip)` truncated to 16 chars | Avoids raw PII in vendor dashboards. |
| 3 | Remove `lru-cache` dep | Yes, atomically | Atomic commit prevents leaving a dead dep. |

---

## Use case 2 — Feature Gate cache

**Touches**: `src/features/plan-features/services/plan-features.service.ts` · `src/features/plan-features/services/features.ts` (FeatureService mirror).

### What to build

`getEffectiveFeatureEnabled(tier, feature)` merges `TIER_CONFIG` + Super Admin overrides on every call today. Wrap the merge in `cache.wrap(...)` with a 5-minute TTL. Invalidate on override writes.

### Acceptance criteria

- [ ] `getEffectiveFeatureEnabled` reads from cache first.
- [ ] Key: `keys.featureGate(festivalId)`.
- [ ] TTL: 5 minutes.
- [ ] Override writes (`setPlanFeatureTagOverrideAction` etc.) call `cache.del(keys.featureGate(festivalId))`.
- [ ] Both `FeatureService.isFeatureEnabled` (config-only) and `getEffectiveFeatureEnabled` (config + overrides) cache — closes PRD §5.3 inconsistency.
- [ ] Integration test: hit → miss → hit → override → hit returns new value.

### Risks & rollback

- **Stale override visible for up to 5 minutes** → explicit `del` on every write closes this to near-zero; document for Super Admin.
- **Per-festival key explosion** (PRO = 2,000 festivals per customer) → bounded; 250MB Redis handles millions of small keys.
- **Rollback**: unwrap the `cache.wrap(...)`; no caller API change.

### Observability

- Log `feature-gate:hit/miss` at debug.
- Metric: `feature_gate_hit_ratio{festivalId="<hash>"}` (sampled).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | TTL | 5 minutes | Short enough for fast override propagation, long enough for hot dashboards. |
| 2 | Cache shape | Per-feature boolean | Simpler invalidation than caching the merged map. |
| 3 | Invalidation | Explicit `del` on writes | No event-driven invalidation complexity. |

---

## Use case 3 — Custom-domain host → festivalId cache

**Touches**: `src/features/institutions/services/custom-domain-provisioning.service.ts` · public route group `(festivalPublic)` middleware.

### What to build

The `(festivalPublic)` route group resolves inbound `Host` header to a festival on every public request. Cache the resolution for 60s. Invalidate on attach / verify / detach.

### Acceptance criteria

- [ ] Wrapped in `cache.wrap(...)` with `keys.domainHost(host)`.
- [ ] TTL: 60s positive, 30s negative (unknown host).
- [ ] `verifyCustomDomain`, `attachCustomDomain`, `detachCustomDomain` all call `cache.del(keys.domainHost(host))`.
- [ ] Integration test: first call miss, second call hit, override invalidates, unknown host negative-cached.

### Risks & rollback

- **60s window means stale DNS** after `attachCustomDomain` → explicit `del` makes it 0s in practice.
- **Negative cache poisoning** (attacker forces "unknown host" into cache) → 30s TTL bounds blast radius.
- **Rollback**: unwrap `cache.wrap(...)`.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Key shape | Hostname only, lowercased | Port + protocol are infra noise. |
| 2 | Negative caching | Yes (30s) | Blocks bot scanners from hammering Postgres. |

---

## Use case 4 — Top-scorers leaderboard via ZSET

**Touches**: `src/features/results/services/results.service.ts` (publish path) · `src/features/results/services/leaderboard.service.ts` (read path) · `src/app/dashboard/[slug]/event-works/top-scorers/page.tsx`.

### What to build

Top-scorers page and public rankings currently recompute on every publish. Maintain two sorted sets on result publish: participants and teams. Read via `ZREVRANGE WITHSCORES`. JSONB stays as fallback.

### Acceptance criteria

- [ ] Write: `ZADD keys.leaderboardTop(festivalId) <points> <participantId>` and `keys.leaderboardTeam(festivalId) <points> <groupId>` on result publish.
- [ ] Write: `ZREM` on unpublish.
- [ ] Read: top-N (default 100) via `ZREVRANGE ... WITHSCORES`.
- [ ] Fallback: if Redis unreachable, read from `festival.teamStandings` JSONB.
- [ ] Replay: rebuild ZSET from `result` table on cache miss (cold start after Redis provisioning).
- [ ] Integration test: publish 3 results → ZSET reflects scores → unpublish removes members → JSONB fallback returns same data on simulated Redis down.

### Risks & rollback

- **Score drift between Redis and JSONB** (write succeeds in Redis, fails in JSONB) → write JSONB first, then Redis; on Redis failure, JSONB is the truth and Redis gets rebuilt on next read.
- **Cold-start replay storms** the DB. Bounded by festival size; acceptable.
- **Rollback**: stop `ZADD`/`ZREM` writes; readers hit JSONB always.

### Observability

- Log `leaderboard:hit`, `leaderboard:rebuild` at debug / info.
- Metric: `leaderboard_reads_total{source="redis|jsonb"}`.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | One or two ZSETs? | Two — participants + teams | Both are common reads. |
| 2 | Score | `result.awardPoints` (PRD §4.4) | What the top-scorers page ranks on. |
| 3 | TTL | None | Explicit `ZADD`/`ZREM`; festival-scoped, deleted with festival. |

---

## Use case 5 — Festival public profile + counters

**Touches**: `src/features/festivals/services/festival-lifecycle.service.ts` · `src/features/festivals/services/usage-counter.service.ts` · public `(festivalPublic)` route group.

### What to build

Public landing page reads the `festival` row + denormalized counters (`participantsCount`, `stagesCount`, `programmesCount`, `judgesCount`, `storageUsedMb`) per request. Cache the row + counters.

### Acceptance criteria

- [ ] Cache key: `keys.festivalProfile(festivalId)`.
- [ ] TTL: 5 minutes.
- [ ] Invalidated on `updateFestivalSettingsAction`, `updateFestivalBrandingAction`, any counter update (`usage-counter.service.ts`).
- [ ] Fallback to direct Postgres read on Redis miss.

### Risks & rollback

- **Counter drift** between Redis (cached) and Postgres (truth) → counter updates MUST `cache.del` in the same transaction boundary.
- **Rollback**: unwrap `cache.wrap(...)`; direct Postgres reads.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | TTL | 5 minutes | Counters change during festival, branding rarely. |
| 2 | Invalidation | Explicit `del` on writes | No event-driven invalidation. |

---

## Use case 6 — Public lists cache

**Touches**: `src/app/[slug]/programmes/page.tsx` · `src/app/[slug]/schedule/page.tsx` · `src/app/[slug]/media/page.tsx` · `src/app/[slug]/news/page.tsx`.

### What to build

The public `(festivalPublic)` route group serves four list pages. All four are read-heavy and change rarely during an active festival. Cache the rendered lists.

### Acceptance criteria

- [ ] Cache key: `keys.programmeList(festivalId)`, `keys.schedule(festivalId)`, `keys.mediaList(festivalId)`, `keys.newsList(festivalId)`.
- [ ] TTL: 2 minutes for programmes + schedule (changes during event); 10 minutes for media + news (append-only).
- [ ] Invalidated on writes to `programme`, `schedule_entry`, `festivalMediaImage/Video`, `festivalNews`.
- [ ] Integration test: list miss → list hit → invalidate → list miss again.

### Risks & rollback

- **Stale list visible up to TTL** → explicit `del` closes it to near-zero.
- **Memory pressure** from large lists → store as compact JSON; Pro tier 2,000 programmes fits comfortably.
- **Rollback**: remove cache reads; direct DB queries.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | TTL | 2 min (programmes, schedule) / 10 min (media, news) | Matches write frequency per resource. |
| 2 | Storage shape | JSON-serialized array | Small, fits 256MB Redis easily. |

---

## Use case 7 — Slug → festivalId cache

**Touches**: `src/app/[slug]/page.tsx` (public landing) · `src/features/festivals/services/festival-public-validation.service.ts`.

### What to build

The Greenroom default path `/[slug]` resolves `{festivalSlug}` to a `festivalId` on every public request. Cache the slug → ID mapping.

### Acceptance criteria

- [ ] Cache key: `keys.slugFestival(slug)`.
- [ ] TTL: 5 minutes.
- [ ] Invalidated on festival slug change (rare; happens via `updateFestivalSettingsAction`).
- [ ] Negative cache: 30s for "no such slug".

### Risks & rollback

- **Slug conflict** (two festivals with same slug) caught at create time per `ISSUE-43 §3`; cache reflects first writer until expiry.
- **Rollback**: unwrap `cache.wrap(...)`.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Slug change handling | Explicit `del` on `updateFestivalSettingsAction` | Slug changes are rare and intentional. |

---

## Use case 8 — TanStack Query hydration cache

**Touches**: `src/lib/query-client.ts` (or wherever `dehydrate`/`hydrate` is configured) · `src/app/**/layout.tsx` server components.

### What to build

Server components fetch data and pass it to client components via TanStack Query's `dehydrate`/`hydrate`. Cache the dehydrated snapshot in Redis so the client gets the data without re-fetching on first paint.

### Acceptance criteria

- [ ] `dehydrate(queryClient)` result is `set`-ed in the cache seam with key derived from query keys + auth context.
- [ ] TTL: 30 seconds (matches stale-while-revalidate window).
- [ ] Falls back to no-hydration (client refetches) on cache miss.

### Risks & rollback

- **PII leakage** if dehydrated state includes user-specific data → key includes user/role hash; never cache per-user data on shared keys.
- **Stale hydration** up to 30s → acceptable for dashboard read paths.
- **Rollback**: skip the cache write; always pass through.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Hydration cache or direct HTTP cache? | Direct Redis hydration | Works across CDN edge nodes that TanStack Query can't reach. |
| 2 | TTL | 30s | Matches SWR window. |

---

## Use case 9 — OTP throttles

**Touches**: `src/core/auth/better-auth/` · `src/features/participant-login/` · `src/core/auth/stage-portal-session.ts`.

### What to build

Three independent OTP attempt counters:
- Better Auth sign-in OTP — already throttled by Better Auth; move to Redis for cross-instance correctness.
- Participant login OTP — currently in-memory.
- Stage Portal PIN attempts — brute-force protection.

### Acceptance criteria

- [ ] Keys: `keys.otpThrottle(userId, 'signin')`, `keys.participantOtp(participantId)`, `keys.stagePortalPin(stageId)`.
- [ ] Counter: `INCR` + `PEXPIRE` pipeline, 5-minute window, 3-attempt cap (matches PRD §4.1).
- [ ] Failed attempts beyond cap return typed `RATE_LIMITED` error.
- [ ] Integration test: 3 attempts OK, 4th rejected, window expiry resets.

### Risks & rollback

- **Fail-open during Redis outage** could let attackers brute-force → for OTP, prefer fail-closed; document per-flow.
- **Lockout mismatch** between Redis counter and Better Auth DB counter → DB is authoritative; Redis is a fast path.
- **Rollback**: revert to Better Auth's built-in throttle (which is per-instance anyway).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Window | 5 min. Cap 3 (sign-in), 5 (participant OTP), 10 (stage-portal PIN) | PIN is longer, looser cap. |
| 2 | Lockout | Same as today (PRD §4.1 — 10 failed attempts) | DB lockout still authoritative. |

---

## Use case 10 — QR code replay protection

**Touches**: `src/features/participants/actions/qr.actions.ts` · `src/features/food-entry/services/food-entry.service.ts`.

### What to build

Participant QR codes are scanned for food-hall entry. Each scan should be accepted exactly once. Store a short-lived "seen" marker per scan.

### Acceptance criteria

- [ ] Key: `keys.qrToken(participantId)` = `greenroom:qr:<participantId>:<token>` (token is the unique part of the QR payload).
- [ ] `SET ... NX EX 60` — accept only if the key doesn't exist, expire after 60s.
- [ ] Replay attempt within window → rejected with `ALREADY_SCANNED`.
- [ ] Integration test: first scan OK, second scan within 60s rejected, third scan after 60s OK.

### Risks & rollback

- **Legitimate re-scan within 60s** (e.g. volunteer rescans after mis-scan) → 60s is short enough to be acceptable; document.
- **Clock skew** between scanner and Redis server → use Redis's own `EX 60` rather than client timestamps.
- **Rollback**: drop the `SET NX`; accept all scans (matches pre-Redis behavior).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | TTL | 60 seconds | Most legitimate re-scans happen within minutes; QR payload can include timestamp to bound window. |

---

## Use case 11 — Plan-feature flag snapshot per festival

**Touches**: `src/features/plan-features/services/plan-features.service.ts` · `src/features/plan-features/services/plan-features.service.ts` (`getPlanFeatureSnapshot` new fn).

### What to build

A pre-computed bundle of `getEffectiveFeatureEnabled(tier, feature)` for every feature, stored as a single Redis hash per festival. Replaces the per-call lookups in use case 2 with one Redis fetch.

### Acceptance criteria

- [ ] Key: `keys.planFlagSnapshot(festivalId)`.
- [ ] Value: hash of `{ [feature]: boolean }`.
- [ ] Built lazily on first read; cached for 5 minutes.
- [ ] Invalidated on `setPlanFeatureTagOverrideAction` and on tier change (`updateFestivalSettingsAction`).
- [ ] Integration test: first read populates, second read returns hash, override invalidates, next read rebuilds.

### Risks & rollback

- **Hash field explosion** (~30 features max per PRD §3) → trivial.
- **Rollback**: replace snapshot fetch with per-feature call (use case 2 pattern).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Hash vs JSON | Hash | Field-level updates cheaper if we later invalidate individual features. |

---

## Use case 12 — Trial countdown cache

**Touches**: `src/app/[slug]/page.tsx` · `src/features/festivals/services/festival-public-validation.service.ts`.

### What to build

The public site shows "X days until festival" / "X days since festival ended" — derived from `festival.startDate` / `endDate` / `expiresAt`. Compute once per day per festival, cache for 24h.

### Acceptance criteria

- [ ] Key: `keys.trialCountdown(festivalId)`.
- [ ] TTL: 24 hours.
- [ ] Invalidated on `updateFestivalSettingsAction` (rare date change).
- [ ] Value: `{ daysToStart, daysToEnd, daysToExpire }`.

### Risks & rollback

- **Clock skew** → server-side `Date.now()` in the loader; cached value is already-resolved numbers, no skew risk.
- **Rollback**: drop the cache; compute inline.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Why cache at all? | Marginal win | Compute is trivial, but cache means the public renderer does zero date math per page load. |

---

## Use case 13 — Audit log dedup counter

**Touches**: `src/features/auth/services/audit-log.service.ts` (`createAuditLog`).

### What to build

A bursty script or a misbehaving client can flood `audit_log` with hundreds of identical `action` events from the same actor. Before writing, check a short-lived dedup counter; skip if the same event was logged in the last N seconds.

### Acceptance criteria

- [ ] Key: `keys.auditDedup(actorId, action)` = `greenroom:audit:<actorId>:<action>`.
- [ ] `INCR` + `PEXPIRE 10_000` pipeline — within 10s, identical events from same actor are dropped.
- [ ] Wrapped around `createAuditLog(...)` so all callers benefit.
- [ ] Integration test: 5 identical events in 10s → 1 row in `audit_log`.

### Risks & rollback

- **Legitimate sequential identical events lost** (e.g. user clicks "save" twice intentionally) → 10s window is short; document.
- **Cross-actor dedup collision** if actors share an ID → keyed by actor + action; not cross-actor.
- **Rollback**: remove the dedup check; log all events.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Window | 10 seconds | Absorbs bursty clients; legitimate sequential events still log. |
| 2 | Scope | Same actor + same action + same target | Targeted dedup. |

---

## Use case 14 — Email preferences cache

**Touches**: `src/features/email-preferences/` · `src/features/notifications/services/notification.service.ts` (read before send).

### What to build

Every notification send reads the recipient's email preferences to decide what to send. Per-user pref reads on every send are wasteful when prefs change rarely.

### Acceptance criteria

- [ ] Key: `greenroom:emailprefs:<userId>` — hash of `{ category: enabled }`.
- [ ] TTL: 10 minutes.
- [ ] Invalidated on `updateEmailPreferencesAction`.
- [ ] `getEmailPreferences(userId)` reads cache first, falls back to Postgres.

### Risks & rollback

- **User toggles a preference, next send still uses stale** → 10 min max staleness; explicit `del` on update.
- **Rollback**: drop the cache; query DB per send.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | TTL | 10 minutes | Prefs change rarely. |
| 2 | Storage shape | Hash | Fits the multi-category preference model naturally. |

---

## Use case 15 — Pricing + marketing page data cache

**Touches**: `src/app/(public)/page.tsx` · `src/app/(public)/pricing/page.tsx` · `src/app/(public)/features/page.tsx` · `src/config/pricing.ts`.

### What to build

The public marketing site reads `TIER_CONFIG` from `src/config/pricing.ts` on every render. Cache the rendered feature matrix.

### Acceptance criteria

- [ ] Key: `greenroom:pricing:matrix` — full feature matrix JSON.
- [ ] TTL: 1 hour (config changes go through deploys, not runtime writes).
- [ ] Invalidated on `pricing.ts` changes (rare — versioned deploy bump).
- [ ] `/pricing` and `/features` pages read from cache.

### Risks & rollback

- **Stale pricing copy** → deploy bumps `REDIS_URL` env if we want a hard reset, or run a `redis-cli DEL` post-deploy.
- **Rollback**: drop the cache; reads `pricing.ts` directly.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | TTL | 1 hour | Config-driven; deploy-bumped. |
| 2 | Invalidation | Manual `DEL` on `pricing.ts` changes (rare) | Same versioning discipline as code deploys. |

---

## Use case 16 — Concurrent editing lock

**Touches**: `src/features/programmes/actions/programme.actions.ts` · `src/features/categories/actions/category.actions.ts` · `src/features/judgement/services/judgement-config.service.ts` · new `src/core/locks/edit-lock.ts`.

### What to build

Multiple admins editing the same `programme`, `category`, or `judgementConfig` can clobber each other. Set a short-lived lock on row edits; show a friendly "X is editing this" message.

### Acceptance criteria

- [ ] Key: `greenroom:lock:<entityType>:<entityId>` = actor's user ID.
- [ ] `SET ... NX EX 60` — acquire lock only if no holder; 60s TTL auto-releases stale locks.
- [ ] Lock release on `PATCH` success or explicit "done editing".
- [ ] UI shows "Currently being edited by {name}" badge with live refresh (use SSE from `ISSUE-46` use case 15 for real-time; polling fallback at 15s).
- [ ] Integration test: two simultaneous acquires → one wins, one gets conflict.

### Risks & rollback

- **Lock held by crashed browser** → 60s TTL releases it.
- **Conflict UX** must be friendly, not a hard error — server still applies the latest write (last-write-wins).
- **Rollback**: skip the lock acquire; accept clobber.

### Intended API shape

```ts
// src/core/locks/edit-lock.ts (sketch)
export async function acquireEditLock(
  entityType: "programme" | "category" | "judgementConfig",
  entityId: string,
  actorId: string,
): Promise<{ acquired: true } | { acquired: false; heldBy: string }> {
  const key = keys.editLock(entityType, entityId);
  const result = await redis.set(key, actorId, "EX", 60, "NX");
  if (result === "OK") return { acquired: true };
  const heldBy = await redis.get(key);
  return { acquired: false, heldBy: heldBy ?? "unknown" };
}

export async function releaseEditLock(
  entityType: "programme" | "category" | "judgementConfig",
  entityId: string,
  actorId: string,
): Promise<void> {
  // CAS release: only delete if we still hold it
  const lua = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;
  await redis.eval(lua, 1, keys.editLock(entityType, entityId), actorId);
}
```

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | TTL | 60 seconds | Auto-release on tab close / browser crash. |
| 2 | Conflict UX | Friendly toast, not a hard error | Last-write-wins on the server; lock is a UX courtesy. |

---

## Use case 17 — Per-category leaderboard ZSET (extends use case 4)

**Touches**: Same as use case 4 — `results.service.ts` (write), `leaderboard.service.ts` (read), `top-scorers/page.tsx` (UI filter).

### What to build

Top-scorers today is festival-wide. Some festivals want per-category rankings (e.g., "Top Qiraath", "Top Naat"). Maintain a ZSET per category per festival.

### Acceptance criteria

- [ ] Keys: `greenroom:lb:cat:{categoryId}:participants:{festivalId}` and `:teams:{festivalId}`.
- [ ] Write on every result publish that includes participants in that category.
- [ ] Read via `ZREVRANGE ... WITHSCORES` in a new `/dashboard/[slug]/event-works/top-scorers?categoryId=X` view.
- [ ] Replay logic (per use case 4) also rebuilds these ZSETs.

### Risks & rollback

- **Key count** = (participants + teams) × categories per festival. Bounded by PRD tier limits (BASIC 5, STANDARD 10, PRO 50). PRO × 2 × 1k festivals = 100k keys — trivial.
- **Rollback**: stop writes to per-category ZSETs; UI falls back to festival-wide.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Cardinality | Bounded by PRD tier limits | Per-festival key count is small. |

---

## Use case 18 — Judge scoring dedup

**Touches**: `src/features/judgement/services/scoring-policy.service.ts` (`submitScore` action) · `src/features/stage-portal/actions/stage-portal-credential.actions.ts` (Stage Portal path).

### What to build

A judge might double-tap the submit button on Stage Portal, producing two `judgementScore` rows for the same `(judgeId, codeLetterId)`. Use `SET NX` to dedup.

### Acceptance criteria

- [ ] Key: `greenroom:judge-score:<judgeId>:<codeLetterId>`.
- [ ] `SET ... NX EX 30` — only the first submission in 30s lands.
- [ ] Wrapped around `judgementScore` insert.
- [ ] Integration test: two simultaneous submissions → one DB row, one idempotent 200.

### Risks & rollback

- **Legitimate re-score after typo within 30s** blocked → 30s is short; document.
- **Rollback**: drop the `SET NX`; accept duplicates (matches current behavior — Postgres unique constraint catches real duplicates).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Window | 30 seconds | Absorb double-tap; legitimate re-score after typo works. |

---

## Use case 19 — Cloudinary upload signature cache

**Touches**: `src/features/posters/services/poster-editor-preview.service.ts` · `src/features/festivals/actions/festival-crud.actions.ts` (branding logo upload).

### What to build

Signed Cloudinary upload URLs are generated per request (templates, branding logos). Cache the signature briefly to avoid re-signing on rapid-fire uploads from the same admin session.

### Acceptance criteria

- [ ] Key: `greenroom:cloudinary-sig:<userId>`.
- [ ] TTL: 5 minutes.
- [ ] Per-user — different admins get different signatures.

### Risks & rollback

- **Signature expiration** mid-upload (Cloudinary signature valid 1 hour by default) → 5min TTL is a safe undershoot.
- **Rollback**: drop the cache; sign per request.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | TTL | 5 minutes | Cloudinary signature validity is 1 hour; 5 min is safe. |

---

## Use case 20 — Better Auth 2FA backup code throttle

**Touches**: `src/core/auth/better-auth/` (2FA plugin) · `src/features/auth/services/two-factor.service.ts`.

### What to build

2FA backup codes (PRD §4.1 — 10 backup codes per user) need their own throttle, separate from the main OTP. A brute-force attack on the 10-code space shouldn't reuse the main OTP throttle.

### Acceptance criteria

- [ ] Key: `greenroom:2fa-backup:<userId>`.
- [ ] `INCR` + `PEXPIRE 300_000` (5 min window), cap at 5 attempts.
- [ ] 6th attempt within window returns typed `RATE_LIMITED` error.
- [ ] Integration test: 5 attempts OK, 6th rejected.

### Risks & rollback

- **User mistypes backup code 5 times** → 5 min lockout is acceptable; matches Better Auth default behavior.
- **Rollback**: drop the throttle; rely on Better Auth default (which is per-instance anyway).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Window | 5 minutes | Matches Better Auth default. |
| 2 | Reset on success | Yes — successful 2FA clears the counter | Don't penalize the user after they prove identity. |

---

## Out of scope

- BullMQ queues (exports, emails, CSV imports, render, webhooks, scheduled jobs) → `ISSUE-46`.
- Stage Portal live scoring pub/sub → `ISSUE-46`.
- Live announcement sequence pub/sub → `ISSUE-46`.
- Live team standings SSE → `ISSUE-46`.
- Food-hall live scan counter pub/sub → `ISSUE-46`.
- Webhook idempotency → `ISSUE-46`.
- Session invalidation pub/sub → `ISSUE-46`.
- Live platform stats pub/sub (Super Admin) → `ISSUE-46`.
- Live chest-number assignment pub/sub → `ISSUE-46`.
- Programme scheduling conflict real-time warnings → `ISSUE-46`.
- Live festival countdown SSE → `ISSUE-46`.
- Live results counter SSE → `ISSUE-46`.
- Email bounce handling pub/sub → `ISSUE-46`.
- Better Auth / participant / stage-portal **session table** → Redis (Postgres-backed is fine; this issue covers **validation cache** of active sessions, not full session migration).

## Acceptance (overall)

- [ ] All 20 use cases ship in one or more PRs.
- [ ] `lru-cache` removed from `package.json`.
- [ ] Hit rate ≥ 80% on Feature Gate, host, slug, profile caches after 24h of traffic.
- [ ] No N+1 queries introduced.
- [ ] All fail-open paths tested (simulated Redis down → graceful Postgres fallback).
- [ ] `npm run test:integration` green.

## Verification

```bash
npm run test:integration
# Manual: open browser devtools, hit each gated route 10x,
# confirm zero Postgres queries on hits via Neon dashboard log.
```

## Open questions to confirm

1. **Hit-rate target** — 80% on hot caches feels right; revisit after a real festival run.
2. **Hydration cache lifetime** — 30s may be too short for slow connections; consider 60s.
3. **OTP throttles** — should they be uniform (3 attempts / 5min) across all three flows, or differentiated?
4. **Leaderboard ZSET cardinality** — Pro tier allows 2,000 participants; ZSET fits trivially, but the score-precision choice (integer vs float) affects tie-breaking. Lock as integer for now.
5. **Plan-flag snapshot vs per-feature caching** — both live in this issue. Keep both, or replace per-feature with snapshot? Snapshot is the more efficient pattern long-term.