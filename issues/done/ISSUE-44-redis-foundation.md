# Redis — Foundation (Provision + Client + Seam)

## Status

- **Type**: HITL — provisioning sub-slice requires a human to create the Redis Cloud account, pick region/plan, and rotate the `REDIS_URL` into Vercel + `.env`. The client + seam sub-slices are AFK once the URL exists.
- **Blocked by**: None — can start immediately.
- **Blocks**: `ISSUE-45` (every Redis cache use case depends on this), `ISSUE-46` (every advanced use case depends on this too).

## Summary

The infrastructure layer that every other Redis use case in the Greenroom platform depends on. Three sub-slices ship together:

| Sub-slice | Type | What it does |
|-----------|------|--------------|
| **A. Provision Redis Cloud** | HITL | Create the managed Redis Essentials database, generate a TLS `rediss://` URL, wire it into local `.env`, `.env.example`, and Vercel. |
| **B. `ioredis` client + cache seam** | AFK | `src/core/redis/client.ts` singleton, `src/core/redis/keys.ts` typed key builder, `src/core/cache/index.ts` `get/set/del/wrap` API, `/api/v1/health/redis` route, integration test with Testcontainers Redis. |
| **C. Docker compose + Next.js config** | AFK | Local `redis:7-alpine` service matching the prod protocol; `next.config.ts` `serverExternalPackages: ["pg", "ioredis"]`. |

After this issue lands, the platform has a single, well-typed Redis entry point that any feature can consume.

## Table of contents

- [Sub-slice A — Provision Redis Cloud](#sub-slice-a--provision-redis-cloud)
- [Sub-slice B — `ioredis` client + cache seam](#sub-slice-b--ioredis-client--cache-seam)
- [Sub-slice C — Docker compose + Next.js config](#sub-slice-c--docker-compose--nextjs-config)
- [Out of scope](#out-of-scope-deferred-to-other-issues)
- [Acceptance (overall)](#acceptance-overall)
- [Verification](#verification)
- [Open questions to confirm](#open-questions-to-confirm)

---

## Sub-slice A — Provision Redis Cloud

### What to build

An end-to-end working Redis Cloud Essentials database that the rest of the platform can connect to from local dev, Vercel preview, and Vercel production.

### Files changed

- `.env.example` — add "Redis (Redis Cloud)" section.
- `.env.local` (gitignored) — add `REDIS_URL`.
- Vercel → Settings → Environment Variables — add `REDIS_URL` for Production + Preview.
- `docs/agents/issue-tracker.md` (only if `setup-matt-pocock-skills` ticket lands first) — record vendor + region + plan.

### Acceptance criteria

- [ ] Redis Cloud account under the team's org; Essentials database provisioned (250MB starting tier).
- [ ] Database region matches current Neon region (`ap-south-1` / Mumbai if Neon is Mumbai).
- [ ] TLS enabled on the endpoint (default).
- [ ] `REDIS_URL` (single `rediss://...` string) present in:
  - [ ] local `.env` (gitignored)
  - [ ] `.env.example` (placeholder + comment block, matching the comment style at `.env.example:6-19`)
  - [ ] Vercel → Settings → Environment Variables for **Production** and **Preview**
- [ ] Smoke test passes:

  ```bash
  redis-cli -u "$REDIS_URL" PING   # PONG
  ```

- [ ] Region + plan choice recorded in `## Locked decisions` below.

### Risks & rollback

- **Wrong region chosen** → re-provision in correct region; update `REDIS_URL`; no data loss (Essentials is empty).
- **Credential leaked** → rotate via Redis Cloud dashboard; update Vercel env + `.env.local`; no impact because the database is empty at provisioning time.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Plan | Essentials 250MB | Cheapest tier covers Phase 1 + 2; upgrade to 1GB if memory pressure shows. |
| 2 | Region | Match Neon (`ap-south-1` likely) | Minimize cross-region latency from Vercel functions. |
| 3 | TLS | Required (`rediss://`) | Encryption in transit is a non-negotiable for prod. |
| 4 | One DB or many? | One DB; separate subscriptions per environment when prod scales | Single endpoint simplifies `REDIS_URL`. |
| 5 | Credential rotation | Every 90 days | Vendor best practice. |

---

## Sub-slice B — `ioredis` client + cache seam

### What to build

The single, swappable Redis layer that every Greenroom feature consumes. All later issues route through this seam — feature code never imports `ioredis` directly.

### Files changed

- `package.json` — add `ioredis` + `@types/ioredis`. Remove in later slice if no consumer.
- `src/core/redis/client.ts` — new. The `ioredis` singleton.
- `src/core/redis/keys.ts` — new. Typed key builder.
- `src/core/cache/index.ts` — new. `get/set/del/wrap` API + factory.
- `src/app/api/v1/health/redis/route.ts` — new. Healthcheck endpoint.
- `src/test/integration/redis-cache-seam.test.ts` — new.
- `src/test/integration/setup.ts` — add `GenericContainer("redis:7-alpine")` alongside Postgres.

### Acceptance criteria

- [ ] `package.json` adds `ioredis` + `@types/ioredis`. No `@upstash/redis` (TCP-only plan).
- [ ] `src/core/redis/client.ts`:
  - [ ] Exports a singleton built from `new Redis(process.env.REDIS_URL!, ...)`.
  - [ ] `globalThis` guard against Next.js HMR socket leaks.
  - [ ] `lazyConnect: true` — defer TCP handshake to first command (Vercel cold-start).
  - [ ] `maxRetriesPerRequest: 3`, `enableReadyCheck: true`.
  - [ ] `tls: {}` when `REDIS_URL` starts with `rediss://`, otherwise `undefined`.
  - [ ] `reconnectOnError` returns `true` for `READONLY`, `ECONNRESET`, `ETIMEDOUT`.
  - [ ] `connectTimeout: 10_000`, `commandTimeout: 5_000`.
- [ ] `src/core/redis/keys.ts` — typed key builder. Exports `keys` object with at minimum: `rateLimit(ip)`, `featureGate(festivalId)`, `featureGateAll()`, `domainHost(host)`, `slugFestival(slug)`, `festivalProfile(festivalId)`, `programmeList(festivalId)`, `schedule(festivalId)`, `mediaList(festivalId)`, `newsList(festivalId)`, `leaderboardTop(festivalId)`, `leaderboardTeam(festivalId)`, `leaderboardCategory(categoryId, festivalId)`, `announcerQueue(festivalId)`, `trialCountdown(festivalId)`, `planFlagSnapshot(festivalId)`, `qrToken(participantId)`, `otpThrottle(userId, type)`, `participantOtp(participantId)`, `stagePortalPin(stageId)`, `twoFactorBackup(userId)`, `foodHallSession(slotId)`, `foodHallScanned(slotId)`, `auditDedup(actorId, action)`, `emailPrefs(userId)`, `pricingMatrix()`, `editLock(entityType, entityId)`, `judgeScoreDedup(judgeId, codeLetterId)`, `cloudinarySig(userId)`. All keys namespaced `greenroom:` prefix.
- [ ] `src/core/cache/index.ts`:
  - [ ] `get<T>(key)`, `set<T>(key, value, { ttlMs })`, `del(key)`, `wrap<T>(key, ttlMs, loader)`.
  - [ ] Internally `set` translates `ttlMs` → `redis.set(key, value, 'PX', ttlMs)`.
  - [ ] `wrap` is single-flight (cache miss → loader → cache → return).
  - [ ] Factory accepts `{ redis }` via DI for tests.
- [ ] `/api/v1/health/redis` route at `src/app/api/v1/health/redis/route.ts`:
  - [ ] GET → `PING`, returns `{ ok: true, latencyMs }` on success, `{ ok: false, error }` on failure.
  - [ ] No auth (uptime monitor endpoint).
- [ ] Integration test at `src/test/integration/redis-cache-seam.test.ts`:
  - [ ] Testcontainers Redis spin-up.
  - [ ] `get` after `set` returns the same value.
  - [ ] TTL honored within ±500ms.
  - [ ] `del` removes the key.
  - [ ] `wrap` populates on miss, serves cached on hit.
- [ ] `src/test/integration/setup.ts` adds a `GenericContainer("redis:7-alpine")` start alongside the existing Postgres container.

### Intended API shape

```ts
// src/core/redis/client.ts
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis: Redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 10_000,
    commandTimeout: 5_000,
    tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
    reconnectOnError: (err) =>
      ["READONLY", "ECONNRESET", "ETIMEDOUT"].some((t) =>
        err.message.includes(t),
      ),
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
```

```ts
// src/core/cache/index.ts (sketch — full impl in the slice PR)
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, opts: { ttlMs: number }): Promise<void>;
  del(key: string): Promise<void>;
  wrap<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T>;
}

export function createCache(deps: { redis: Redis }): Cache {
  const { redis } = deps;
  return {
    async get<T>(key: string) {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    async set<T>(key: string, value: T, { ttlMs }) {
      await redis.set(key, JSON.stringify(value), "PX", ttlMs);
    },
    async del(key) {
      await redis.del(key);
    },
    async wrap<T>(key, ttlMs, loader) {
      const hit = await redis.get(key);
      if (hit) return JSON.parse(hit) as T;
      const value = await loader();
      await redis.set(key, JSON.stringify(value), "PX", ttlMs);
      return value;
    },
  };
}
```

### Risks & rollback

- **`globalThis` singleton leaks** in dev (forgotten guard) → guard wraps the assignment; verified by code review.
- **Hanging connection** under Vercel cold-start → `commandTimeout: 5_000` ensures no request hangs >5s on a single Redis op.
- **Rollback path**: delete `src/core/redis/`, `src/core/cache/`, `/api/v1/health/redis`. Undo `package.json` + `next.config.ts`. No consumer depends on this slice yet, so trivial.

### Observability

- Log `redis:connected`, `redis:reconnected`, `redis:error` at `info` / `warn` / `error`.
- `/api/v1/health/redis` returns `{ ok, latencyMs }` — wire to Vercel uptime monitor.
- `commandTimeout` failures increment a counter (log on first per minute, not per request, to avoid log spam).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | TCP vs HTTP | TCP `ioredis` | Full RESP protocol; works for Phase 1 + 2. |
| 2 | Local dev | Docker `redis:7-alpine` via docker-compose | `.env.example` documents the prod `rediss://` alternative. |
| 3 | Seam client wiring | DI via factory (`createCache({ redis })`) | Tests inject Testcontainers client without env-var hackery. |
| 4 | TTL precision | Per-call `ttlMs` → `PX` | ioredis is ms-precise; no rounding loss. |
| 5 | `wrap` error | Throws | Callers wrap in try/catch for fallback (consistent with JSONB fallback pattern). |
| 6 | `lazyConnect` | `true` | Cuts Vercel cold-start by ~50-150ms. |
| 7 | `maxRetriesPerRequest` | `3` | Fail-fast; cache seam fails open at call site. |
| 8 | Command timeout | `5_000` ms | Single op cannot hang a request >5s. |
| 9 | Edge runtime | **Disallowed** | ioredis requires Node. Repo has zero `runtime = "edge"` routes today (verified). Future Edge routes need a separate solution. |

---

## Sub-slice C — Docker compose + Next.js config

### What to build

Local dev parity with prod (same RESP wire protocol) and Next.js bundler config to externalize ioredis.

### Files changed

- `docker-compose.yml` — add `redis` service + `redis_data` volume.
- `next.config.ts` — extend `serverExternalPackages` to include `"ioredis"`.
- `package.json` — add `db:redis:start`, `db:redis:stop`, `db:redis:logs` scripts; update `db:setup` chain.

### Acceptance criteria

- [ ] `docker-compose.yml` adds a `redis` service:
  - [ ] `image: redis:7-alpine`
  - [ ] `container_name: greenroom-redis`
  - [ ] `ports: ["6379:6379"]`
  - [ ] `command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-devpass}`
  - [ ] Named volume `redis_data`
  - [ ] Healthcheck via `redis-cli -a $REDIS_PASSWORD ping`
- [ ] `next.config.ts:57` extended to `serverExternalPackages: ["pg", "ioredis"]`.
- [ ] `package.json` adds scripts: `db:redis:start`, `db:redis:stop`, `db:redis:logs`. Updates `db:setup` to chain Redis into startup.
- [ ] `.env.example` adds a "Redis (Redis Cloud)" section between Database and Auth. Documents the `rediss://` (TLS) vs `redis://` (plaintext) distinction. Single `REDIS_URL` variable. Dev example: `REDIS_URL=redis://:devpass@localhost:6379`. Prod example: `REDIS_URL=rediss://default:<password>@<host>:<port>`.

### Risks & rollback

- **Webpack bundles `ioredis`** without `serverExternalPackages` → build fails on `tls.connect`. Rollback: revert `next.config.ts`.
- **Local Redis port collision** (6379 in use elsewhere) → change the `ports: ["6379:6379"]` mapping to `"6380:6379"` and update `.env.example` dev URL.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Redis version | `redis:7-alpine` (latest 7.x patch) | Revisit 8.x after stable release. |
| 2 | AOF persistence | `--appendonly yes` | Durability for local dev; not required for prod (managed vendor handles). |
| 3 | Auth | `--requirepass` | Local matches prod's authenticated model; surfaces auth bugs in dev. |
| 4 | `db:setup` flow | `pnpm db:start && pnpm db:push && pnpm db:seed` now starts Redis too | Single command brings the whole stack up. |

---

## Out of scope (deferred to other issues)

- Every concrete Redis use case → `ISSUE-45`, `ISSUE-46`.
- Better Auth / participant / stage-portal sessions → Redis (no win — Postgres-backed works).
- Sentinel / Cluster / HA (single-node sufficient at current scale).
- Redis Stack modules (JSON / Search / TimeSeries).

## Acceptance (overall)

- [ ] Redis Cloud Essentials database live.
- [ ] `REDIS_URL` in all three env surfaces.
- [ ] `src/core/redis/client.ts`, `src/core/redis/keys.ts`, `src/core/cache/index.ts` exist and are typed.
- [ ] `/api/v1/health/redis` returns `{ ok: true }` against the prod URL.
- [ ] `docker compose up -d` brings up Postgres + Redis.
- [ ] Integration tests pass with Testcontainers.
- [ ] `pnpm lint`, `pnpm check`, `pnpm test`, `pnpm test:integration` green.

## Verification

```bash
docker compose up -d
pnpm test:integration -- redis-cache-seam
pnpm dev
curl http://localhost:3000/api/v1/health/redis
# expected: {"ok":true,"latencyMs":<number>}
```

Against prod:

```bash
redis-cli -u "$REDIS_URL" PING            # PONG
curl https://greenroom.example.com/api/v1/health/redis
# expected: {"ok":true,"latencyMs":<number, typically 5-30ms>}
```

## Open questions to confirm

1. Redis Cloud Essentials vs Pro tier — Pro adds multi-AZ; revisit after first festival with concurrent live updates.
2. Backup policy — Essentials has daily backups; do we need more frequent?
3. Connection pool size — single shared `ioredis` per Vercel instance. Is that sufficient under festival-day bursts, or do we need `ioredis-cluster`?
4. Where does the `globalThis` singleton live in the build — top-level module scope, or wrapped in a `getRedis()` factory?