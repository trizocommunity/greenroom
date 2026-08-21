# Issue 46 — Advanced Use Cases (Inngest + Redis Pub/Sub)

## Status

- **Type**: AFK — 17 use cases across two runtime primitives:
  - **Inngest** for durable job queues (8 use cases — exports, emails, imports, render, webhooks × 2, image transforms, cron). Replaces the BullMQ plan from the prior version of this issue.
  - **Redis Pub/Sub** for live fan-out to SSE subscribers (9 use cases — Stage Portal, announcer, standings, food-hall, Super Admin stats, chest-numbers, schedule, results, email bounce).
- **Blocked by**: Issue 44 (foundation — `ioredis` client + cache seam), Issue 45 (cache use cases — Redis Cloud subscription already running).
- **Blocks**: nothing inside the Redis plan. Out-of-plan work that unblocks here: real-time analytics, scheduled jobs, webhook processing.

## Why Inngest, not BullMQ

The original version of this issue planned self-hosted BullMQ workers on Railway / Fly / Render. That decision was reversed because:

1. **Vercel can't host long-lived workers** (60s Pro / 900s Fluid max, ephemeral invocations).
2. **Adding a third vendor** (worker VM) to the existing Vercel + Redis Cloud stack was operationally heavy.
3. **Inngest is free at current scale** (50k runs/mo covers Greenroom until ~1k active festivals).

Inngest gives us durable functions, cron triggers, retries, concurrency control, and step-level checkpoints without any infra to own. The trade-off is SDK lock-in; mitigated by keeping the Inngest wrappers thin (5–15 lines per use case).

Redis Pub/Sub stays in use for SSE fan-out — Inngest is a function orchestrator, not a pub/sub broker, so the 9 live-update channels continue to use Redis directly on the same `REDIS_URL`.

## Architecture

```
┌─────────────────┐                  ┌─────────────────┐
│  Vercel (Next)  │  inngest.send()  │  Inngest cloud  │
│  - Server       │ ───────────────► │  - Function run │
│    actions      │                  │  - Retry/backoff│
│  - API routes   │ ◄────────────── │  - Cron trigger │
└─────────────────┘   webhook call   └─────────────────┘
        │                                    │
        │                                    │ step.run
        │                                    ▼
        │                            ┌─────────────────┐
        │                            │   Postgres      │
        │                            │   (writes)      │
        │                            └─────────────────┘
        │
        │ redis.publish()           ┌─────────────────┐
        ├────────────────────────►  │  Redis Cloud    │
        │                            │  (Pub/Sub)      │
        │  redis.duplicate().sub()  │                 │
        │ ◄────────────────────────  │  + Cache keys   │
        │                            │    (Issue 45)   │
        ▼                            └─────────────────┘
┌─────────────────┐
│  SSE clients    │
│  (Stage Portal, │
│   announcer,    │
│   public site)  │
└─────────────────┘
```

### Vendor integration

- **Inngest**: `@inngest/sdk` package; `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` env vars; one webhook route at `/api/inngest`.
- **Local dev**: `pnpm dlx inngest-cli@latest dev` runs alongside `next dev`. Vercel + Inngest deploy integration auto-configures the prod webhook.
- **Redis Pub/Sub**: reuses the `ioredis` singleton from Issue 44; SSE handlers create a duplicate connection and `subscribe` to channels.

## Cache-key namespace map

All keys continue to live under the `greenroom:` prefix using the typed builder at `src/core/redis/keys.ts`. Inngest events use the SDK's own event-name namespace (`export.requested`, `email.requested`, etc.) — no Redis key collision.

## File layout

```
src/
  inngest/
    client.ts                          # New Inngest client
    functions/
      export-job.ts                    # UC1
      email-send.ts                    # UC2
      csv-import.ts                    # UC4
      poster-render.ts                 # UC5
      razorpay-webhook.ts              # UC8
      cron-daily.ts                    # UC10
      resend-webhook.ts                # UC11
      cloudinary-transform.ts          # UC12
      index.ts                         # exports.inngest = [ ... ]
  core/
    pubsub/
      redis-pubsub.ts                  # thin publish/subscribe wrapper
      channels.ts                      # typed channel-name builder
    sse/
      sse-handler.ts                   # SSE route helper (subscriber → stream)
  app/
    api/
      inngest/
        route.ts                       # Inngest webhook handler
      v1/
        programmes/[programmeId]/score-events/stream/route.ts   # UC3
        festivals/[festivalId]/announce/stream/route.ts          # UC6
        festivals/[festivalId]/standings/stream/route.ts         # UC7
        festivals/[festivalId]/chest-numbers/stream/route.ts     # UC14
        festivals/[festivalId]/schedule/stream/route.ts          # UC15
        festivals/[festivalId]/countdown/stream/route.ts          # UC16
        festivals/[festivalId]/results-count/stream/route.ts      # UC17
        food-hall/[slotId]/events/stream/route.ts                # UC9
        super-admin/stats/stream/route.ts                        # UC13
```

## Table of contents

- [UC1 — Export job queue (Inngest)](#uc1--export-job-queue-inngest)
- [UC2 — Email send queue (Inngest)](#uc2--email-send-queue-inngest)
- [UC3 — Stage Portal live updates (Pub/Sub)](#uc3--stage-portal-live-updates-pubsub)
- [UC4 — CSV import queue (Inngest)](#uc4--csv-import-queue-inngest)
- [UC5 — Image/PDF/poster generation queue (Inngest)](#uc5--imagepdfposter-generation-queue-inngest)
- [UC6 — Live announcement sequence (Pub/Sub)](#uc6--live-announcement-sequence-pubsub)
- [UC7 — Live team standings SSE (Pub/Sub)](#uc7--live-team-standings-sse-pubsub)
- [UC8 — Razorpay webhook idempotency + queue (Inngest)](#uc8--razorpay-webhook-idempotency--queue-inngest)
- [UC9 — Food-hall live scan counter (Pub/Sub)](#uc9--food-hall-live-scan-counter-pubsub)
- [UC10 — Festival expiry warnings (Inngest cron)](#uc10--festival-expiry-warnings-inngest-cron)
- [UC11 — Resend webhook processing (Inngest)](#uc11--resend-webhook-processing-inngest)
- [UC12 — Cloudinary image transformations (Inngest)](#uc12--cloudinary-image-transformations-inngest)
- [UC13 — Live platform stats (Pub/Sub)](#uc13--live-platform-stats-pubsub)
- [UC14 — Live chest-number assignment (Pub/Sub)](#uc14--live-chest-number-assignment-pubsub)
- [UC15 — Programme scheduling conflict warnings (Pub/Sub)](#uc15--programme-scheduling-conflict-warnings-pubsub)
- [UC16 — Live festival countdown SSE (Pub/Sub)](#uc16--live-festival-countdown-sse-pubsub)
- [UC17 — Live results counter SSE (Pub/Sub)](#uc17--live-results-counter-sse-pubsub)
- [UC18 — Email bounce handling (Pub/Sub)](#uc18--email-bounce-handling-pubsub)
- [Out of scope](#out-of-scope)
- [Acceptance (overall)](#acceptance-overall)
- [Verification](#verification)
- [Open questions](#open-questions)

---

## UC1 — Export job queue (Inngest)

**Touches**: `src/features/exports/services/export-orchestrator.service.ts` · new `src/inngest/functions/export-job.ts` · `src/app/dashboard/[slug]/exports/page.tsx`.

### What to build

Move the existing inline PDF/CSV export generation (CERTIFICATE, BADGE, CALL_LIST, RESULTS, TEAM_RESULT, JUDGE_LIST, VALUATION_SHEET) into an Inngest function. The server action calls `inngest.send({ name: "export.requested", data: { festivalId, type, params } })` and returns immediately; the UI polls `festivalExport.status` for completion.

### Acceptance criteria

- [ ] New dep: `@inngest/sdk`.
- [ ] `src/inngest/functions/export-job.ts` — `inngest.createFunction({id: "export-job", concurrency: 2}, {event: "export.requested"}, fn)`. Inside: `step.run("load", ...)` → `step.run("generate", ...)` → `step.run("store", ...)`.
- [ ] `enqueueExport(festivalId, type, params)` helper that calls `inngest.send()`.
- [ ] Existing inline callers migrated to the new enqueue helper.
- [ ] UI polls for completion (15s). Links the download on completion.
- [ ] Retry: 3 attempts, exponential backoff via Inngest's built-in `retries` config.
- [ ] Integration test: enqueue small export → Inngest mock → function runs → `festivalExport` row exists.

### Risks & rollback

- **Function times out** → Inngest steps have configurable timeouts; long exports need a generous `step.run` timeout (5 min default is enough for most types).
- **Function retry creates duplicate `festivalExport`** → use `dedupe: { key: "event.data.requestId", ttl: "1h" }` on the Inngest function to coalesce accidental double-clicks.
- **Rollback**: revert `enqueueExport` to inline generation; remove the function registration.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Function name | `export-job` | Matches Inngest's `id` namespace. |
| 2 | Concurrency | 2 | Avoids hammering Postgres / Cloudinary during CERTIFICATE bursts. |
| 3 | Retry | 3 attempts, exponential backoff | Inngest default. |
| 4 | Storage | Still base64 in `festivalExport` | No migration in this slice. |

---

## UC2 — Email send queue (Inngest)

**Touches**: `src/core/integrations/email/send.ts` · new `src/inngest/functions/email-send.ts`.

### What to build

Resend emails currently send synchronously inside server actions / API routes. Move to Inngest. Sign-in OTP path stays sync (`sendEmailSync`) because the caller needs to know if Resend is down.

### Acceptance criteria

- [ ] `src/inngest/functions/email-send.ts` — `inngest.createFunction({id: "email-send", concurrency: 5}, {event: "email.requested"}, fn)`.
- [ ] `sendEmail(...)` calls `inngest.send({name: "email.requested", data: {to, kind}})`. `sendEmailSync(...)` retained for the OTP path.
- [ ] Retry: 5 attempts, exponential backoff; 4xx errors fail immediately via `if (step.error.name === "NonRetriableError") throw`.
- [ ] Integration test: enqueue → function drains → Resend test API receives the call (mocked).

### Risks & rollback

- **OTP path inadvertently queued** → keep `sendEmailSync` as the explicit API for OTP; audit callers.
- **Function dies mid-send** → Inngest requeues; Resend dedupes by `Idempotency-Key` header.
- **Rollback**: revert `sendEmail` to inline.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Concurrency | 5 | Resend's API limit is comfortable at this rate. |
| 2 | Retry on 4xx | No | Bad template, don't retry. |
| 3 | Function co-location | Same process as export function; separate event names | One `pnpm worker` equivalent (Inngest handles routing). |

---

## UC3 — Stage Portal live updates (Pub/Sub)

**Touches**: `src/features/judgement/services/scoring-policy.service.ts` (publish) · `src/features/stage-portal/actions/stage-portal-credential.actions.ts` (Stage Portal subscribe) · new `src/app/api/v1/programmes/[programmeId]/score-events/stream/route.ts` (SSE) · `src/app/dashboard/[slug]/event-works/announcement/page.tsx` (announcer subscribe).

### What to build

When a judge submits a score, other judges on the same programme and the announcer desk should see "X/Y judges have scored" update live. Publish score events via Redis Pub/Sub; subscribe via SSE.

### Acceptance criteria

- [ ] Every `judgementScore` write publishes to channel `greenroom:programme:{programmeId}:score-events`.
- [ ] SSE endpoint `/api/v1/programmes/[programmeId]/score-events/stream` subscribes via `redis.duplicate()`, pushes events.
- [ ] Auth on SSE: ADMIN / ANNOUNCER / STAGE_MANAGER session OR `stagePortalSession` cookie.
- [ ] Stage Portal scoring page and announcer desk subscribe via SSE.
- [ ] SSE heartbeat every 30s (comment frame).
- [ ] Fallback: 15s polling if Redis down.
- [ ] Integration test: publish score → SSE event reaches subscriber within 200ms.

### Risks & rollback

- **SSE through Vercel proxy** — Vercel functions time out at 60s (Pro) / 900s (Fluid). The SSE handler must keep the connection alive but flush heartbeats to avoid idle timeouts.
- **Multi-region** — Vercel functions in different regions subscribe to the same channel; Redis Pub/Sub is single-region. Documented in open questions.
- **Rollback**: stop publishing; UI falls back to 15s polling.

### Intended API shape

```ts
// src/core/pubsub/redis-pubsub.ts (sketch)
export async function publish(channel: string, payload: unknown): Promise<void> {
  const redis = getRedis();
  await redis.publish(channel, JSON.stringify(payload));
}

export async function subscribe(
  channel: string,
  handler: (payload: unknown) => void,
): Promise<() => Promise<void>> {
  const sub = getRedis().duplicate();
  await sub.subscribe(channel);
  sub.on("message", (_ch, msg) => handler(JSON.parse(msg)));
  return async () => {
    await sub.unsubscribe(channel);
    await sub.quit();
  };
}

// SSE route handler sketch
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { programmeId: string } },
) {
  const channel = keys.scoreEvents(params.programmeId);
  const unsubscribe = await subscribe(channel, (payload) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
  });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 30_000);

      req.signal.addEventListener("abort", async () => {
        clearInterval(heartbeat);
        await unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Transport | SSE | Simpler than WebSocket; one-way fits the use case. |
| 2 | Backpressure | None | Fire-and-forget. Subscriber that can't keep up gets the next event. |
| 3 | Reconnect | Client auto-reconnects; server doesn't replay missed events | Standings are idempotent — last value wins. |

---

## UC4 — CSV import queue (Inngest)

**Touches**: `src/features/participants/actions/import.actions.ts` · `src/features/programmes/...` · new `src/inngest/functions/csv-import.ts` · `src/app/dashboard/[slug]/pre-event-works/participants/import/page.tsx`.

### What to build

Bulk participant import and bulk programme upload (PRD §3.3, §3.4 — STANDARD+ feature) currently runs synchronously inside the server action. Move to Inngest.

### Acceptance criteria

- [ ] `inngest.createFunction({id: "csv-import", concurrency: 1}, {event: "import.requested"}, fn)`.
- [ ] Function validates CSV row-by-row, creates `participant` / `programme` rows in batches, writes a per-row result.
- [ ] Progress surfaced via `step.run("progress", ...)` — Inngest tracks state natively, no Redis progress counter needed.
- [ ] `/dashboard/[slug]/pre-event-works/participants/import` page polls Inngest's function-run status.
- [ ] Integration test: import 100-row CSV → function drains → all rows present in `participant` table.

### Risks & rollback

- **Single-row failure blocks the batch** → `step.run` retries per-batch; failures are written to a per-row result list.
- **Duplicate chest numbers** in the same import → validate before insert.
- **Rollback**: revert to inline import.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Concurrency | 1 | Avoid lock contention during heavy INSERT batches. |
| 2 | Progress | Use Inngest's `step.run` outputs + a per-row results table | No Redis progress counter required. |

---

## UC5 — Image/PDF/poster generation queue (Inngest)

**Touches**: `src/features/posters/services/poster-editor-preview.service.ts` · new `src/inngest/functions/poster-render.ts`.

### What to build

Poster template editor generates Konva canvas → PNG/PDF for result posters, certificates, badges. Long-running for big certificate batches. Move to Inngest.

### Acceptance criteria

- [ ] `inngest.createFunction({id: "poster-render", concurrency: 3}, {event: "render.requested"}, fn)`.
- [ ] Function: `step.run("konva", ...)` → `step.run("upload-cloudinary", ...)` → `step.run("store-url", ...)`.
- [ ] Triggered by `announceResult` (poster), `bulkCertificateGeneration` action, `bulkBadgeGeneration`.
- [ ] Integration test: trigger render → function uploads → URL stored.

### Risks & rollback

- **Konva crashes on malformed template** → wrap in try/catch; throw `NonRetriableError` from `step.run`.
- **Cloudinary rate limit** → 3 concurrency matches the limit headroom.
- **Rollback**: revert render to inline.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Concurrency | 3 | Konva + Cloudinary are CPU/IO bound; 3 keeps throughput high without bursting Cloudinary. |
| 2 | Output storage | Cloudinary URL | First slice where we deliberately do NOT use `festivalExport`-style base64. |

---

## UC6 — Live announcement sequence (Pub/Sub)

**Touches**: `src/features/announcement/services/announcement-desk.service.ts` (publish) · new `src/app/api/v1/festivals/[festivalId]/announce/stream/route.ts` (SSE) · `src/app/[slug]/results/page.tsx` (subscribe) · `src/app/dashboard/[slug]/stage-manager/page.tsx` (subscribe).

### What to build

The announcer desk walks through results one at a time. Public screens and other staff displays should sync to "currently announcing programme X".

### Acceptance criteria

- [ ] Announcer advances queue → `redis.publish("greenroom:festival:{festivalId}:announce", {programmeId, position, resultNumber, startedAt})`.
- [ ] Public `/[slug]/results` page subscribes; shows the current announcement badge.
- [ ] Stage manager view subscribes; shows what's on stage now.
- [ ] Integration test: publish event → two subscribers receive within 200ms.

### Risks & rollback

- **Missed events on reconnect** → client fetches current position via `GET /api/v1/festivals/[id]/announce/current` on SSE open.
- **Rollback**: stop publishing; UI polls every 15s.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Channel shape | Single channel per festival: `greenroom:festival:{festivalId}:announce` | Keeps subscribers narrow. |

---

## UC7 — Live team standings SSE (Pub/Sub)

**Touches**: `src/features/results/services/leaderboard.service.ts` (publish) · new `src/app/api/v1/festivals/[festivalId]/standings/stream/route.ts` · `src/app/[slug]/page.tsx` · `src/app/dashboard/[slug]/event-works/top-scorers/page.tsx`.

### What to build

When a result publishes and updates `teamStandings`, the public `/[slug]` page and dashboard `/top-scorers` page should update without a 15s poll.

### Acceptance criteria

- [ ] `publishStandings` publishes to `greenroom:festival:{festivalId}:standings`.
- [ ] SSE endpoint subscribes and pushes new snapshots.
- [ ] Public results page + dashboard top-scorers page subscribe.
- [ ] Integration test: publish result → standings event reaches subscriber with new JSON.

### Risks & rollback

- **Large payload** (full standings for 2,000-participant PRO festival) → ~50KB JSON; fits in one SSE frame.
- **Rollback**: revert to polling.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Payload | Full standings JSON | Pro tier is 2,000 participants max; ~50KB. |
| 2 | Reconnection | Client auto-reconnects; server doesn't replay missed events | Standings are idempotent. |

---

## UC8 — Razorpay webhook idempotency + queue (Inngest)

**Touches**: `src/app/api/v1/payments/webhook/route.ts` · new `src/inngest/functions/razorpay-webhook.ts` · `src/features/payments/services/payment.service.ts`.

### What to build

`POST /api/v1/payments/webhook` is the single source of truth for payment events. Today it processes synchronously. Move to Inngest with idempotency keys so duplicate webhook deliveries are deduplicated.

### Acceptance criteria

- [ ] `inngest.createFunction({id: "razorpay-webhook", concurrency: 5, dedupe: {key: "event.data.eventId", ttl: "7d"}}, {event: "razorpay.webhook"}, fn)`.
- [ ] Route handler verifies signature (already done), then calls `inngest.send({name: "razorpay.webhook", data: {eventId, ...}})`.
- [ ] Function: update `payment` row, fire upgrade / `payment.service.ts` side-effects.
- [ ] Integration test: deliver same webhook twice → one DB update, one function run.
- [ ] Signature verification stays in the route handler (before enqueue) — defense in depth.

### Risks & rollback

- **Webhook replay beyond 7d TTL** → bump TTL if Razorpay's replay window exceeds our dedup.
- **Function crashes between DB update and side-effect** → use `step.run` for atomicity; check `payment.used` flag before side-effects.
- **Rollback**: revert route handler to inline processing.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Idempotency TTL | 7 days | Matches Razorpay's documented replay window. |
| 2 | Signature check | In route handler, before enqueue | Defense in depth. |
| 3 | Retry | 5 attempts, exponential backoff | Razorpay expects eventual processing within minutes. |

---

## UC9 — Food-hall live scan counter (Pub/Sub)

**Touches**: `src/features/food-entry/services/food-entry.service.ts` (publish + INCR) · new `src/app/api/v1/food-hall/[slotId]/events/stream/route.ts` (SSE) · `src/app/dashboard/[slug]/event-works/food-entry/page.tsx` (subscribe).

### What to build

Multiple `VOLUNTEER` users scan participant QR codes simultaneously during food-hall windows. The food-entry page should show live totals: "142 / 200 scanned".

### Acceptance criteria

- [ ] Every `foodHallEntry` write publishes to `greenroom:foodhall:{slotId}:events`.
- [ ] Counter is also surfaced via Redis `INCR greenroom:foodhall:{slotId}:scanned` (cache seam from Issue 45).
- [ ] `/dashboard/[slug]/event-works/food-entry` subscribes via SSE; updates counter live.
- [ ] Integration test: 10 simulated scans → counter reaches 10, subscribers see updates within 200ms.

### Risks & rollback

- **`INCR` races** during simultaneous scans → `INCR` is atomic; safe.
- **Counter drift** if `INCR` succeeds but DB write fails → reconciliation cron (already exists for `usage-counter.service.ts`); counter is best-effort, DB is truth.
- **Rollback**: stop publishing; counter reads from `SELECT COUNT(*)`.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Channel | `greenroom:foodhall:{slotId}:events` — payload `{ participantId, chestNumber, scannedAt }` | Subscribers want full event detail. |

---

## UC10 — Festival expiry warnings (Inngest cron)

**Touches**: `src/app/api/v1/cron/route.ts` (becomes thin Inngest emitter) · new `src/inngest/functions/cron-daily.ts` · existing `src/features/festivals/services/festival-expiration.service.ts`.

### What to build

The Vercel cron at `/api/v1/cron` (per `vercel.json`) currently runs daily expiry warnings, archival, and export GC (PRD §2.4). Move into Inngest's cron scheduler.

### Acceptance criteria

- [ ] `inngest.createFunction({id: "cron-daily"}, {cron: "0 0 * * *"}, fn)`.
- [ ] Function payload: `step.run("expiry-warnings", ...)`, `step.run("archive-past", ...)`, `step.run("expire-festivals", ...)`, `step.run("export-gc", ...)`.
- [ ] Existing cron services called from each `step.run`.
- [ ] Vercel cron route simplified or removed (single HTTP call to Inngest, optional).
- [ ] Integration test: trigger manually → festival transitions state correctly.

### Risks & rollback

- **Function not running** → Inngest retries on failure; manual trigger via dashboard if needed.
- **Multiple workers racing on the same festival** → Inngest job IDs are unique per `(date, type)`; only one execution.
- **Rollback**: revert to Vercel cron inline processing.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Cron pattern | `0 0 * * *` (same as Vercel cron) | No behavior change. |
| 2 | Per-type concurrency | 1 | Avoid races on the same festival rows. |

---

## UC11 — Resend webhook processing (Inngest)

**Touches**: `src/app/api/v1/resend/webhook/route.ts` · new `src/inngest/functions/resend-webhook.ts` · `src/features/email-preferences/`.

### What to build

Resend webhooks (delivery, bounce, complaint, opened) currently hit `/api/v1/resend/webhook` and process inline. Move to Inngest with idempotency.

### Acceptance criteria

- [ ] `inngest.createFunction({id: "resend-webhook", concurrency: 3, dedupe: {key: "event.data.eventId", ttl: "7d"}}, {event: "resend.webhook"}, fn)`.
- [ ] Route handler verifies signature, dedupes via Inngest dedupe config, enqueues.
- [ ] Function: updates `email-preferences` opt-out flags on bounce/complaint, updates notification delivery status.
- [ ] Integration test: deliver same webhook twice → one function run, one DB update.

### Risks & rollback

- **Webhook arrives after dedup TTL** → 7-day TTL is generous; bump if Resend extends replay.
- **Rollback**: revert route to inline; delete the function.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Dedup TTL | 7 days | Resend's replay window. |
| 2 | Bounce handling | Auto-disable transactional email to bounced address; admin can re-enable | Standard SaaS pattern. |

---

## UC12 — Cloudinary image transformations (Inngest)

**Touches**: `src/features/posters/services/poster-editor-preview.service.ts` · new `src/inngest/functions/cloudinary-transform.ts`.

### What to build

Poster template editor uploads raw images, then applies transformations (crop, resize, format conversion). Today this is synchronous; large images block the upload.

### Acceptance criteria

- [ ] `inngest.createFunction({id: "cloudinary-transform", concurrency: 5}, {event: "transform.requested"}, fn)`.
- [ ] Function: `step.run("apply", ...)` → `step.run("upload", ...)` → `step.run("store-url", ...)`.
- [ ] Triggered on template save.
- [ ] Integration test: trigger transform → function uploads → URLs stored.

### Risks & rollback

- **Cloudinary API limit** during burst → 5 concurrency is conservative; bump if headroom allows.
- **Rollback**: revert to inline transformation.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Concurrency | 5 | Cloudinary's API limit is comfortable at this rate. |

---

## UC13 — Live platform stats (Pub/Sub)

**Touches**: `src/features/admin/services/analytics.service.ts` (publish) · new `src/app/api/v1/super-admin/stats/stream/route.ts` · `src/app/super-admin/analytics/page.tsx`.

### What to build

The Super Admin analytics page shows platform-wide numbers. Currently polled. Use Pub/Sub to push updates as they happen.

### Acceptance criteria

- [ ] Channel: `greenroom:super-admin:stats`.
- [ ] Publishes on every festival create, payment received, support ticket opened.
- [ ] SSE endpoint — Super Admin role only.
- [ ] `/super-admin/analytics` page subscribes; counters update live without refresh.
- [ ] Integration test: publish event → SSE subscriber receives within 200ms.

### Risks & rollback

- **Auth bypass on SSE** → check `SUPER_ADMIN` global role on every event, not just on connect.
- **Channel noise** during high-write bursts → batch deltas into 1-second windows server-side.
- **Rollback**: stop publishing; polling continues.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Granularity | Push deltas (`{ type: 'festival_created', delta: 1 }`) | Clients aggregate; no need to send full snapshots. |

---

## UC14 — Live chest-number assignment (Pub/Sub)

**Touches**: `src/features/participants/actions/chest-number.actions.ts` (publish) · new `src/app/api/v1/festivals/[festivalId]/chest-numbers/stream/route.ts` · `src/app/dashboard/[slug]/pre-event-works/chest-numbers/page.tsx`.

### What to build

`/dashboard/[slug]/pre-event-works/chest-numbers` (per PRD §2.3 + §4.3) assigns chest numbers from group `seriesStart` + offset. Multiple admins in the same festival could collide. Publish assignment events so other admins see live updates.

### Acceptance criteria

- [ ] Channel: `greenroom:festival:{festivalId}:chest-numbers`.
- [ ] Every `assignChestNumbers` write publishes the assigned numbers.
- [ ] `/dashboard/[slug]/pre-event-works/chest-numbers` subscribes via SSE.
- [ ] Integration test: assign → two subscribers see event within 200ms.

### Risks & rollback

- **Series collision** between admins → server-side uniqueness check on insert; pub/sub is UX, not correctness.
- **Rollback**: stop publishing; manual refresh.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Payload | `{ groupId, chestNumberRange, assignedBy, assignedAt }` | All info the dashboard needs. |

---

## UC15 — Programme scheduling conflict warnings (Pub/Sub)

**Touches**: `src/features/schedule/actions/schedule.actions.ts` (publish) · new `src/app/api/v1/festivals/[festivalId]/schedule/stream/route.ts` · `src/app/dashboard/[slug]/pre-event-works/schedule/page.tsx` (subscribe).

### What to build

When an admin saves a `schedule_entry` that overlaps another entry on the same stage, show a real-time warning ("Stage 3 has a conflict at 14:30").

### Acceptance criteria

- [ ] Channel: `greenroom:festival:{festivalId}:schedule`.
- [ ] Every `schedule_entry` write publishes the new entry.
- [ ] Other connected admins receive the event, re-run conflict check client-side, show toast if conflict.
- [ ] Server-side conflict check still authoritative on save.
- [ ] Integration test: write entry → conflicting subscriber sees warning.

### Risks & rollback

- **Spurious warnings** if client-side conflict logic drifts from server → server is authoritative; client warning is UX courtesy.
- **Rollback**: stop publishing; no warning toast.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Authoritative check | Server-side stays in the server action | Pub/sub is a soft warning only. |

---

## UC16 — Live festival countdown SSE (Pub/Sub)

**Touches**: new `src/app/api/v1/festivals/[festivalId]/countdown/stream/route.ts` · `src/app/[slug]/page.tsx` (subscribe).

### What to build

The public landing page (`/[slug]`) shows time until festival start / until expiry. Use SSE to push timer ticks every minute (or every second for the final hour).

### Acceptance criteria

- [ ] SSE endpoint `/api/v1/festivals/[festivalId]/countdown/stream`.
- [ ] Server-side ticker publishes to `greenroom:festival:{festivalId}:countdown` every second in the final hour, every minute otherwise.
- [ ] Public `/[slug]` page subscribes; updates the timer without client polling.
- [ ] Falls back to client-side `setInterval` if Redis down.
- [ ] Integration test: subscribe → receive ticks at expected cadence.

### Risks & rollback

- **Idle SSE connection timeout** on Vercel proxy → heartbeat every 30s.
- **Rollback**: drop the SSE endpoint; client-side `setInterval`.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Cadence | 1s in final hour, 60s otherwise | Server decides based on `festival.startDate`. |

---

## UC17 — Live results counter SSE (Pub/Sub)

**Touches**: `src/features/results/services/results.service.ts` (`announceResult` publish) · new `src/app/api/v1/festivals/[festivalId]/results-count/stream/route.ts` · `src/app/[slug]/results/page.tsx`.

### What to build

The public `/[slug]/results` page shows "47 results announced today" — currently polled at 15s. Push live updates via SSE.

### Acceptance criteria

- [ ] Channel: `greenroom:festival:{festivalId}:results-count`.
- [ ] Every result publish (`announceResult`) publishes `INCR`-equivalent event.
- [ ] SSE endpoint subscribes.
- [ ] Public page subscribes; counter updates within 1s of announcement.
- [ ] Integration test: publish result → counter subscriber receives within 200ms.

### Risks & rollback

- **Counter drift** if publish event arrives before DB commit → publish AFTER DB commit; safe.
- **Rollback**: stop publishing; polling continues.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Payload | `{ festivalId, count, lastResultAt }` | All info the public UI needs. |

---

## UC18 — Email bounce handling (Pub/Sub)

**Touches**: `src/inngest/functions/resend-webhook.ts` (publish after dedup + DB write) · new subscriber in `src/features/email-preferences/services/email-prefs-cache.ts` (auto-disable on bounce) · `src/features/admin/services/admin-notifications.service.ts` (in-app alert).

### What to build

When Resend reports a bounce or complaint (delivered via webhook → `resend-webhook` Inngest function in UC11), fan out to internal subscribers (notification preferences update, admin alert).

### Acceptance criteria

- [ ] Channel: `greenroom:email:bounce`.
- [ ] Resend webhook Inngest function publishes after dedup and DB write.
- [ ] Subscribers: `email-preferences` service (auto-disable), `admin-notifications` service (in-app alert).
- [ ] Integration test: simulate bounce → both subscribers react.

### Risks & rollback

- **Subscriber crashes silently** → use Redis Streams for this channel (durable); Pub/Sub is fire-and-forget. Decision deferred.
- **Rollback**: stop publishing; email-prefs unchanged; admin alert falls back to email.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Channel scope | Global — not per-festival | Bounces affect users, not festivals. |
| 2 | Pub/Sub vs Streams | **Defer to Streams decision** | The other 17 use cases don't need it. File as a follow-up if Resend guarantees aren't enough. |

---

## Out of scope

- Real-time chat / bidirectional events (would need WebSocket, not in this issue).
- Better Auth **session migration** to Redis (DB-backed sessions are fine; this issue covers **validation cache** of active sessions, not full session migration).
- Bidirectional judge-to-judge coordination (chat-style).
- Email bounce durability — use case 18 may need Streams instead of Pub/Sub; revisit if Resend's delivery guarantee proves insufficient.

## Acceptance (overall)

- [ ] All 8 Inngest functions live.
- [ ] All 9 SSE channels live.
- [ ] Vercel + Inngest deploy integration configured.
- [ ] Every Inngest function has retry + dedupe where applicable.
- [ ] All fail-open paths tested (Redis down → graceful degradation or polling fallback).
- [ ] `pnpm lint`, `pnpm check`, `pnpm test`, `pnpm test:integration` green.

## Verification

```bash
# In one terminal: Inngest dev server
pnpm dlx inngest-cli@latest dev

# In another: Next dev
pnpm dev

# In another: integration tests
pnpm test:integration
```

Manual: trigger an export from `/dashboard/[slug]/exports`, watch the Inngest dashboard, see the file appear in the dashboard. Then submit a Stage Portal score in two browser tabs; observe the counter increment in tab B within ~1 second.

## Open questions

1. **Multi-region Redis** — single-region Redis Cloud means Vercel functions in other regions see higher latency for pub/sub. Acceptable for Phase 1; revisit when traffic justifies multi-region.
2. **SSE through Vercel proxy** — Vercel functions time out at 60s (Pro) / 900s (Fluid). SSE long-lived connections need careful timeout handling. File as a separate ticket if it bites.
3. **Inngest step timeouts** — default 5min per step; long exports may need higher values. Decide per function.
4. **Email bounce durability** — UC18 may need Streams instead of Pub/Sub; revisit if Resend's delivery guarantee proves insufficient.
5. **Multi-region Vercel** — Vercel functions in different regions share one Inngest account; no extra config needed. SSE handlers in non-primary regions still subscribe to the same Redis Cloud endpoint.