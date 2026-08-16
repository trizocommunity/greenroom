# Redis — Advanced Use Cases (Phase 2: Streams + Pub/Sub)

## Status

- **Type**: AFK — 17 use cases covering `XADD`, `XREAD`, `XREADGROUP`, `BLPOP`, `PUBLISH`, `SUBSCRIBE`, `PSUBSCRIBE`. Requires `ioredis` (TCP) which is wired in `ISSUE-44`.
- **Blocked by**: `ISSUE-44` (foundation) + `ISSUE-45` (some Phase 2 readers consume keys written by Phase 1 writers — e.g. announcer queue position is set by result publish, read by SSE).
- **Blocks**: nothing inside the Redis plan. Out-of-plan work that unblocks here: real-time analytics, scheduled jobs, webhook processing.

## Summary

Seventeen use cases that need the full Redis protocol: BullMQ-backed job queues for CPU-bound or external-bound work (exports, emails, CSV imports, image/PDF rendering, webhooks, scheduled jobs, Resend/Cloudinary pipelines), and pub/sub-driven real-time updates for the Stage Portal, announcer desk, Super Admin, public surfaces, and email bounce handling. Together with `ISSUE-45` this completes the platform's Redis adoption.

### Redis primitives used in this issue

`XADD`, `XREAD`, `XREADGROUP`, `XLEN`, `XPENDING`, `XACK`, `PUBLISH`, `SUBSCRIBE`, `PSUBSCRIBE`, `UNSUBSCRIBE`, plus `GET / SET / DEL / INCR / EXPIRE` for ephemeral state shared between writers and subscribers.

### Worker deployment model

BullMQ workers run as **separate long-lived processes**, not inside Vercel functions. Deploy targets: Railway / Fly / Render as a single Node service in the same project. One entrypoint (`npm run worker`) spins up all workers; can be split per environment later.

## Table of contents

- [Use case 1 — Export job queue via BullMQ](#use-case-1--export-job-queue-via-bullmq)
- [Use case 2 — Email send queue via BullMQ](#use-case-2--email-send-queue-via-bullmq)
- [Use case 3 — Stage Portal pub/sub live updates](#use-case-3--stage-portal-pubsub-live-updates)
- [Use case 4 — CSV import queue via BullMQ](#use-case-4--csv-import-queue-via-bullmq)
- [Use case 5 — Image / PDF / poster generation queue](#use-case-5--image--pdf--poster-generation-queue)
- [Use case 6 — Live announcement sequence pub/sub](#use-case-6--live-announcement-sequence-pubsub)
- [Use case 7 — Live team standings SSE](#use-case-7--live-team-standings-sse)
- [Use case 8 — Razorpay webhook idempotency + queue](#use-case-8--razorpay-webhook-idempotency--queue)
- [Use case 9 — Food-hall live scan counter pub/sub](#use-case-9--food-hall-live-scan-counter-pubsub)
- [Use case 10 — BullMQ scheduled jobs for festival expiry warnings](#use-case-10--bullmq-scheduled-jobs-for-festival-expiry-warnings)
- [Use case 11 — BullMQ for Resend webhook processing](#use-case-11--bullmq-for-resend-webhook-processing)
- [Use case 12 — BullMQ for Cloudinary image transformations](#use-case-12--bullmq-for-cloudinary-image-transformations)
- [Use case 13 — Live platform stats pub/sub (Super Admin)](#use-case-13--live-platform-stats-pubsub-super-admin)
- [Use case 14 — Live chest-number assignment pub/sub](#use-case-14--live-chest-number-assignment-pubsub)
- [Use case 15 — Programme scheduling conflict real-time warnings](#use-case-15--programme-scheduling-conflict-real-time-warnings)
- [Use case 16 — Live festival countdown SSE](#use-case-16--live-festival-countdown-sse)
- [Use case 17 — Live results counter SSE](#use-case-17--live-results-counter-sse)
- [Use case 18 — Email bounce / complaint pub/sub](#use-case-18--email-bounce--complaint-pubsub)
- [Out of scope](#out-of-scope-separate-tickets-if-needed)
- [Acceptance (overall)](#acceptance-overall)
- [Verification](#verification)
- [Open questions to confirm](#open-questions-to-confirm)

---

## Use case 1 — Export job queue via BullMQ

**Touches**: `src/features/exports/services/export-orchestrator.service.ts` (enqueue path) · new `src/features/exports/queue/export-queue.ts` · new `src/features/exports/workers/export-worker.ts` · `src/app/dashboard/[slug]/exports/page.tsx` (polling UI).

### What to build

Move the existing inline PDF/CSV export generation (CERTIFICATE, BADGE, CALL_LIST, RESULTS, TEAM_RESULT, JUDGE_LIST, VALUATION_SHEET) into a BullMQ worker. The server action enqueues and returns a job ID; the UI polls for completion.

### Acceptance criteria

- [ ] New dep: `bullmq`.
- [ ] `src/features/exports/queue/export-queue.ts` — queue `greenroom-exports`, concurrency 2.
- [ ] `src/features/exports/workers/export-worker.ts` — standalone Node entrypoint, consumes the queue, runs existing generator code, writes result to `festivalExport`.
- [ ] `enqueueExport(festivalId, type, params)` returns `{ jobId }`; existing inline callers migrated.
- [ ] UI `/dashboard/[slug]/exports` polls job status (15s), shows progress, links the download on completion.
- [ ] Retry: 3 attempts, exponential backoff; failed jobs in a `failed` tab.
- [ ] Integration test: enqueue small export → worker consumes → `festivalExport` row exists.

### Risks & rollback

- **Worker crash mid-job** → BullMQ requeues to another worker; idempotent generation protects against double-write to `festivalExport`.
- **Long-running exports** exceeding 5 min → adjust BullMQ `lockDuration` to 10 min.
- **Rollback**: revert `enqueueExport` to inline generation; remove the queue.

### Observability

- Log `export:enqueued`, `export:started`, `export:completed`, `export:failed` at info / warn.
- Metric: `export_jobs_in_flight{type="..."}`.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Queue name | `greenroom-exports` | Domain prefix; obvious in `redis-cli MONITOR`. |
| 2 | Concurrency | 2 | Avoids hammering Postgres / Cloudinary during CERTIFICATE bursts. |
| 3 | Connection | Shared `ioredis` singleton from `src/core/redis/client.ts` | Avoids opening a second TCP connection per worker. |
| 4 | Retry | 3 attempts, exponential backoff | BullMQ default. |
| 5 | Storage | Still base64 in `festivalExport` | No migration in this slice. |

---

## Use case 2 — Email send queue via BullMQ

**Touches**: `src/features/notifications/services/notification.service.ts` · new `src/features/notifications/queue/email-queue.ts` · new `src/features/notifications/workers/email-worker.ts`.

### What to build

Resend emails currently send synchronously inside server actions / API routes. Move to BullMQ. Sign-in OTP path stays sync (caller needs to know if Resend is down).

### Acceptance criteria

- [ ] `src/features/notifications/queue/email-queue.ts` — queue `greenroom-emails`, concurrency 5.
- [ ] `src/features/notifications/workers/email-worker.ts` — standalone Node entrypoint.
- [ ] `sendEmail(...)` enqueues; `sendEmailSync(...)` retained for the OTP path.
- [ ] Retry: 5 attempts, exponential backoff; 4xx errors fail immediately.
- [ ] Integration test: enqueue → worker drains → Resend test API receives the call.

### Risks & rollback

- **OTP path inadvertently queued** → keep `sendEmailSync` as the explicit API for OTP; audit callers.
- **Worker dies mid-send** → BullMQ requeues; Resend dedupes by `Idempotency-Key` header.
- **Rollback**: revert `sendEmail` to inline.

### Observability

- Log `email:enqueued`, `email:sent`, `email:failed`, `email:bounced`.
- Metric: `email_queue_depth`, `email_send_duration_seconds`.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Concurrency | 5 | Resend's API limit is comfortable at this rate. |
| 2 | Retry on 4xx | No | Bad template, don't retry. |
| 3 | Worker co-location | Same process as export worker; separate queue | One `npm run worker` entrypoint. |

---

## Use case 3 — Stage Portal pub/sub live updates

**Touches**: `src/features/judgement/services/scoring-policy.service.ts` (`submitScore` publish) · `src/features/stage-portal/actions/stage-portal-credential.actions.ts` (Stage Portal subscribe) · new `src/app/api/v1/programmes/[programmeId]/score-events/stream/route.ts` (SSE) · `src/app/dashboard/[slug]/event-works/announcement/page.tsx` (announcer subscribe).

### What to build

When a judge submits a score, other judges on the same programme and the announcer desk should see "X/Y judges have scored" update live. Publish score events; subscribe via SSE.

### Acceptance criteria

- [ ] Every `judgementScore` write publishes to channel `greenroom:programme:{programmeId}:score-events`.
- [ ] SSE endpoint `/api/v1/programmes/[programmeId]/score-events/stream` subscribes via `redis.subscribe(...)`, pushes events.
- [ ] Auth on SSE: ADMIN / ANNOUNCER / STAGE_MANAGER session OR `stagePortalSession` cookie.
- [ ] Stage Portal scoring page and announcer desk subscribe via SSE.
- [ ] SSE heartbeat every 30s (comment frame).
- [ ] Fallback: 15s polling if Redis down.
- [ ] Integration test: write score → SSE event reaches subscriber within 200ms.

### Risks & rollback

- **SSE through Vercel proxy** — Vercel functions time out at 60s (Pro) / 900s (Fluid). The SSE handler must keep the connection alive but flush heartbeats to avoid idle timeouts. File as a separate ticket if it bites.
- **Multi-region** — Vercel functions in different regions subscribe to the same channel; Redis Pub/Sub is single-region. Documented in `ISSUE-46` open questions.
- **Rollback**: stop publishing; UI falls back to 15s polling.

### Intended API shape

```ts
// SSE route handler sketch
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { programmeId: string } },
) {
  const channel = `greenroom:programme:${params.programmeId}:score-events`;
  const subscriber = redis.duplicate();
  await subscriber.subscribe(channel);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 30_000);

      subscriber.on("message", (_ch, msg) => {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
      });

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        subscriber.unsubscribe();
        subscriber.quit();
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
| 1 | Pub/Sub vs Streams | Pub/Sub | Events are ephemeral; offline subscribers don't need to catch up. |
| 2 | Transport | SSE | Simpler than WebSocket; one-way fits the use case. |
| 3 | Backpressure | None | Fire-and-forget. Subscriber that can't keep up gets the next event. |

---

## Use case 4 — CSV import queue via BullMQ

**Touches**: `src/features/participants/actions/import.actions.ts` · `src/features/programmes/...` · new `src/features/imports/queue/import-queue.ts` · new `src/features/imports/workers/import-worker.ts` · `src/app/dashboard/[slug]/pre-event-works/participants/import/page.tsx`.

### What to build

Bulk participant import and bulk programme upload (PRD §3.3, §3.4 — STANDARD+ feature) currently runs synchronously inside the server action. Move to BullMQ.

### Acceptance criteria

- [ ] Queue `greenroom-imports`, concurrency 1 (these touch a lot of rows).
- [ ] Worker validates the CSV row-by-row, creates `participant` / `programme` rows in batches, writes a per-row result.
- [ ] Progress surfaced via `INCR greenroom:import:{jobId}:progress` counter + `RPUSH greenroom:import:{jobId}:result <row>` list.
- [ ] `/dashboard/[slug]/pre-event-works/participants/import` page polls progress; final summary shows success/fail per row.
- [ ] Integration test: import 100-row CSV → worker drains → all rows present in `participant` table.

### Risks & rollback

- **Single-row failure blocks the batch** → worker continues, writes per-row result; final summary surfaces failures.
- **Duplicate chest numbers** in the same import → validate before insert.
- **Rollback**: revert to inline import; no data loss (validation happens before insert).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Concurrency | 1 | Avoid lock contention during heavy INSERT batches. |
| 2 | Progress tracking | Counter + list under per-job key | Cheap, no extra DB writes for progress. |

---

## Use case 5 — Image / PDF / poster generation queue

**Touches**: `src/features/posters/services/poster-editor-preview.service.ts` · new `src/features/render/queue/render-queue.ts` · new `src/features/render/workers/render-worker.ts`.

### What to build

Poster template editor generates Konva canvas → PNG/PDF for result posters, certificates, badges. Long-running for big certificate batches. Move to BullMQ.

### Acceptance criteria

- [ ] Queue `greenroom-render`, concurrency 3.
- [ ] Worker: Konva render → Cloudinary upload → store URL on the relevant row.
- [ ] Triggered by `announceResult` (poster), `bulkCertificateGeneration` action, `bulkBadgeGeneration`.
- [ ] Integration test: trigger render → worker uploads → URL stored.

### Risks & rollback

- **Konva crashes on malformed template** → wrap in try/catch; failed render returns typed `RENDER_FAILED` error, no row update.
- **Cloudinary rate limit** → 3 concurrency matches the limit headroom.
- **Rollback**: revert render to inline; results stay correct (poster is a UX enhancement).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Concurrency | 3 | Konva + Cloudinary are CPU/IO bound; 3 keeps throughput high without bursting Cloudinary. |
| 2 | Output storage | Cloudinary URL | First slice where we deliberately do NOT use `festivalExport`-style base64. |

---

## Use case 6 — Live announcement sequence pub/sub

**Touches**: `src/features/announcement/services/announcement-desk.service.ts` (publish) · new `src/app/api/v1/festivals/[festivalId]/announce/stream/route.ts` (SSE) · `src/app/[slug]/results/page.tsx` (subscribe) · `src/app/dashboard/[slug]/stage-manager/page.tsx` (subscribe).

### What to build

The announcer desk walks through results one at a time. Public screens and other staff displays should sync to "currently announcing programme X".

### Acceptance criteria

- [ ] Announcer advances queue → `PUBLISH greenroom:festival:{festivalId}:announce programme={id} position={n}`.
- [ ] Public `/[slug]/results` page subscribes; shows the current announcement badge.
- [ ] Stage manager view subscribes; shows what's on stage now.
- [ ] Integration test: publish event → two subscribers receive within 200ms.

### Risks & rollback

- **Missed events on reconnect** → client fetches current position via `GET /api/v1/festivals/[id]/announce/current` on SSE open; no replay needed.
- **Rollback**: stop publishing; UI polls every 15s (current behavior).

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Channel shape | Single channel per festival: `greenroom:festival:{festivalId}:announce` | Keeps subscribers narrow. |
| 2 | Payload | JSON: `{ programmeId, position, resultNumber, startedAt }` | All subscribers need these fields. |

---

## Use case 7 — Live team standings SSE

**Touches**: `src/features/results/services/leaderboard.service.ts` (publish) · new `src/app/api/v1/festivals/[festivalId]/standings/stream/route.ts` · `src/app/[slug]/page.tsx` · `src/app/dashboard/[slug]/event-works/top-scorers/page.tsx`.

### What to build

When a result publishes and updates `teamStandings`, the public `/[slug]` page and dashboard `/top-scorers` page should update without a 15s poll.

### Acceptance criteria

- [ ] `publishStandings` (and the existing JSONB update path) publishes to `greenroom:festival:{festivalId}:standings`.
- [ ] SSE endpoint `/api/v1/festivals/[festivalId]/standings/stream` subscribes and pushes new snapshots.
- [ ] Public results page + dashboard top-scorers page subscribe; replace polling with SSE-driven revalidation.
- [ ] Integration test: publish result → standings event reaches subscriber with new JSON.

### Risks & rollback

- **Large payload** (full standings for 2,000-participant PRO festival) → ~50KB JSON; fits in one SSE frame.
- **Rollback**: revert to polling.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Payload | Full standings JSON | Pro tier is 2,000 participants max; ~50KB. |
| 2 | Reconnection | Client auto-reconnects; server doesn't replay missed events | Standings are idempotent — last value wins. |

---

## Use case 8 — Razorpay webhook idempotency + queue

**Touches**: `src/app/api/v1/payments/webhook/route.ts` · new `src/features/payments/queue/webhook-queue.ts` · new `src/features/payments/workers/webhook-worker.ts` · `src/features/payments/services/payment.service.ts`.

### What to build

`POST /api/v1/payments/webhook` is the single source of truth for payment events. Today it processes synchronously. Move to a queue with idempotency keys so duplicate webhook deliveries are deduplicated.

### Acceptance criteria

- [ ] `SET keys.auditDedup(eventId) 1 NX EX 86400` on webhook receipt. If `NX` fails, return 200 OK immediately (already processed).
- [ ] Queue `greenroom-webhooks`, concurrency 5.
- [ ] Worker: verify signature (already done), update `payment` row, fire upgrade / `payment.service.ts` side-effects.
- [ ] Integration test: deliver same webhook twice → one DB update, one 200 OK.
- [ ] Signature verification stays in the route handler (before enqueue) — defense in depth.

### Risks & rollback

- **Webhook replay beyond 24h TTL** → bump TTL to 7 days if Razorpay's replay window exceeds our dedup.
- **Worker crashes between DB update and side-effect** → idempotency on the payment row (`payment.used = true` set early in worker); side-effects check this flag.
- **Rollback**: revert route handler to inline processing.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Idempotency TTL | 24 hours | Matches Razorpay's documented replay window. |
| 2 | Signature check | In route handler, before enqueue | Defense in depth — never enqueue untrusted payloads. |
| 3 | Retry | 5 attempts, exponential backoff | Razorpay expects eventual processing within minutes. |

---

## Use case 9 — Food-hall live scan counter pub/sub

**Touches**: `src/features/food-entry/services/food-entry.service.ts` (publish + INCR) · new `src/app/api/v1/food-hall/[slotId]/events/stream/route.ts` (SSE) · `src/app/dashboard/[slug]/event-works/food-entry/page.tsx` (subscribe).

### What to build

Multiple `VOLUNTEER` users scan participant QR codes simultaneously during food-hall windows. The food-entry page should show live totals: "142 / 200 scanned".

### Acceptance criteria

- [ ] Every `foodHallEntry` write `INCR`s `greenroom:foodhall:{slotId}:scanned` and publishes to `greenroom:foodhall:{slotId}:events`.
- [ ] `/dashboard/[slug]/event-works/food-entry` subscribes via SSE; updates counter live.
- [ ] Integration test: 10 simulated scans → counter reaches 10, subscribers see updates within 200ms.

### Risks & rollback

- **`INCR` races** during simultaneous scans → `INCR` is atomic; safe.
- **Counter drift** if `INCR` succeeds but DB write fails → reconciliation cron (already exists for `usage-counter.service.ts`); counter is best-effort, DB is truth.
- **Rollback**: stop publishing; counter reads from `SELECT COUNT(*)`.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Counter key | `greenroom:foodhall:{slotId}:scanned` — `INCR` on each scan, `DEL` when slot closes | Clean lifecycle; no stale counters. |
| 2 | Channel | `greenroom:foodhall:{slotId}:events` — payload `{ participantId, chestNumber, scannedAt }` | Subscribers want full event detail. |

---

## Use case 10 — BullMQ scheduled jobs for festival expiry warnings

**Touches**: `src/app/api/v1/cron/route.ts` (becomes thin enqueuer) · new `src/features/festivals/queue/cron-queue.ts` · new `src/features/festivals/workers/cron-worker.ts` · existing `src/features/festivals/services/festival-expiration.service.ts`.

### What to build

The Vercel cron at `/api/v1/cron` (per `vercel.json`) currently runs daily expiry warnings, archival, and export GC (PRD §2.4). Move the warning + archival work into BullMQ scheduled (repeating) jobs so multiple workers can share load and retries are automatic.

### Acceptance criteria

- [ ] New dep: `bullmq` (already added).
- [ ] Repeating job `greenroom-cron-daily` at cron pattern `0 0 * * *`.
- [ ] Job payload: `{ type: 'expiry-warnings' | 'archive-past' | 'expire-festivals' | 'export-gc' }`.
- [ ] Worker reads payload, calls existing cron services.
- [ ] Vercel cron route simplified to just enqueue the daily job (1 HTTP call, ~100ms).
- [ ] Integration test: enqueue manually → worker runs expiry check → festivals transition state correctly.

### Risks & rollback

- **Worker not running** → daily job accumulates; Vercel cron still fires as a backstop. Add a `/health/worker` endpoint.
- **Multiple workers racing on the same festival** → BullMQ job ID is per-`(date, type)`; only one worker processes it.
- **Rollback**: Vercel cron route reverts to inline processing of all four types.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Cron pattern | `0 0 * * *` (same as Vercel cron) | No behavior change for users. |
| 2 | Concurrency | 1 per type | Avoid races on the same festival rows. |

---

## Use case 11 — BullMQ for Resend webhook processing

**Touches**: `src/app/api/v1/resend/webhook/route.ts` · new `src/features/notifications/queue/resend-webhook-queue.ts` · new `src/features/notifications/workers/resend-webhook-worker.ts` · `src/features/email-preferences/`.

### What to build

Resend webhooks (delivery, bounce, complaint, opened) currently hit `/api/v1/resend/webhook` and process inline. Move to BullMQ with idempotency.

### Acceptance criteria

- [ ] Queue `greenroom-resend-webhooks`, concurrency 3.
- [ ] Route handler verifies signature, dedupes via `SETNX keys.auditDedup(eventId)`, enqueues.
- [ ] Worker: updates `email-preferences` opt-out flags on bounce/complaint, updates notification delivery status.
- [ ] Integration test: deliver same webhook twice → one queue job, one DB update.

### Risks & rollback

- **Webhook arrives after dedup TTL** → 7-day TTL is generous; bump if Resend extends replay.
- **Rollback**: revert route to inline; delete the queue.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Dedup TTL | 7 days | Resend's replay window. |
| 2 | Bounce handling | Auto-disable transactional email to bounced address; admin can re-enable | Standard SaaS pattern. |

---

## Use case 12 — BullMQ for Cloudinary image transformations

**Touches**: `src/features/posters/services/poster-editor-preview.service.ts` · new `src/features/media/queue/image-transform-queue.ts` · new `src/features/media/workers/image-transform-worker.ts`.

### What to build

Poster template editor uploads raw images, then applies transformations (crop, resize, format conversion). Today this is synchronous; large images block the upload.

### Acceptance criteria

- [ ] Queue `greenroom-image-transform`, concurrency 5.
- [ ] Worker: applies Cloudinary eager transformations, stores result URLs.
- [ ] Triggered on template save.
- [ ] Integration test: trigger transform → worker uploads → URLs stored.

### Risks & rollback

- **Cloudinary API limit** during burst → 5 concurrency is conservative; bump if headroom allows.
- **Rollback**: revert to inline transformation.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Concurrency | 5 | Cloudinary's API limit is comfortable at this rate. |

---

## Use case 13 — Live platform stats pub/sub (Super Admin)

**Touches**: `src/features/admin/services/analytics.service.ts` (publish) · new `src/app/api/v1/super-admin/stats/stream/route.ts` · `src/app/super-admin/analytics/page.tsx`.

### What to build

The Super Admin analytics page shows platform-wide numbers. Currently polled. Use pub/sub to push updates as they happen.

### Acceptance criteria

- [ ] Channel: `greenroom:super-admin:stats`.
- [ ] Publishes on every festival create, payment received, support ticket opened (whatever signals matter).
- [ ] SSE endpoint `/api/v1/super-admin/stats/stream` — Super Admin role only.
- [ ] `/super-admin/analytics` page subscribes; counters update live without refresh.
- [ ] Integration test: publish event → SSE subscriber receives within 200ms.

### Risks &rollback

- **Auth bypass on SSE** → check `SUPER_ADMIN` global role on every event, not just on connect.
- **Channel noise** during high-write bursts → batch deltas into 1-second windows server-side.
- **Rollback**: stop publishing; polling continues.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Granularity | Push deltas (`{ type: 'festival_created', delta: 1 }`) | Clients aggregate; no need to send full snapshots. |

---

## Use case 14 — Live chest-number assignment pub/sub

**Touches**: `src/features/participants/actions/chest-number.actions.ts` (publish) · new `src/app/api/v1/festivals/[festivalId]/chest-numbers/stream/route.ts` · `src/app/dashboard/[slug]/pre-event-works/chest-numbers/page.tsx`.

### What to build

`/dashboard/[slug]/pre-event-works/chest-numbers` (per PRD §2.3 + §4.3) assigns chest numbers from group `seriesStart` + offset. Multiple admins in the same festival could collide. Publish assignment events so other admins see live updates.

### Acceptance criteria

- [ ] Channel: `greenroom:festival:{festivalId}:chest-numbers`.
- [ ] Every `assignChestNumbers` write publishes the assigned numbers.
- [ ] `/dashboard/[slug]/pre-event-works/chest-numbers` subscribes via SSE; shows "X just assigned #142-#160 to group Y".
- [ ] Integration test: assign → two subscribers see event within 200ms.

### Risks & rollback

- **Series collision** between admins → server-side uniqueness check on insert; pub/sub is UX, not correctness.
- **Rollback**: stop publishing; manual refresh.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Payload | `{ groupId, chestNumberRange, assignedBy, assignedAt }` | All info the dashboard needs. |

---

## Use case 15 — Programme scheduling conflict real-time warnings

**Touches**: `src/features/schedule/actions/schedule.actions.ts` (publish) · new `src/app/api/v1/festivals/[festivalId]/schedule/stream/route.ts` · `src/app/dashboard/[slug]/pre-event-works/schedule/page.tsx` (subscribe + client-side conflict check).

### What to build

When an admin saves a `schedule_entry` that overlaps another entry on the same stage, show a real-time warning ("Stage 3 has a conflict at 14:30"). Use pub/sub to validate against recent edits.

### Acceptance criteria

- [ ] Channel: `greenroom:festival:{festivalId}:schedule`.
- [ ] Every `schedule_entry` write publishes the new entry.
- [ ] Other connected admins receive the event, re-run conflict check client-side, show toast if conflict.
- [ ] Server-side conflict check still authoritative on save (this is a UX enhancement, not a correctness fix).
- [ ] Integration test: write entry → conflicting subscriber sees warning.

### Risks & rollback

- **Spurious warnings** if client-side conflict logic drifts from server → server is authoritative; client warning is a UX courtesy, not enforcement.
- **Rollback**: stop publishing; no warning toast.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Authoritative check | Server-side stays in the server action | Pub/sub is a soft warning only. |

---

## Use case 16 — Live festival countdown SSE

**Touches**: new `src/app/api/v1/festivals/[festivalId]/countdown/stream/route.ts` (server-side ticker publishes every N seconds) · `src/app/[slug]/page.tsx` (subscribe).

### What to build

The public landing page (`/[slug]`) shows time until festival start / until expiry. Use SSE to push timer ticks every minute (or every second for the final hour).

### Acceptance criteria

- [ ] SSE endpoint `/api/v1/festivals/[festivalId]/countdown/stream`.
- [ ] Server-side ticker publishes to `greenroom:festival:{festivalId}:countdown` every second in the final hour, every minute otherwise.
- [ ] Public `/[slug]` page subscribes; updates the timer without client polling.
- [ ] Falls back to client-side `setInterval` if Redis down.
- [ ] Integration test: subscribe → receive ticks at expected cadence.

### Risks & rollback

- **Idle SSE connection timeout** on Vercel proxy → heartbeat every 30s (already in use case 3).
- **Rollback**: drop the SSE endpoint; client-side `setInterval`.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Cadence | 1s in final hour, 60s otherwise | Server decides based on `festival.startDate`. |

---

## Use case 17 — Live results counter SSE

**Touches**: `src/features/results/services/results.service.ts` (`announceResult` publish) · new `src/app/api/v1/festivals/[festivalId]/results-count/stream/route.ts` · `src/app/[slug]/results/page.tsx`.

### What to build

The public `/[slug]/results` page shows "47 results announced today" — currently polled at 15s. Push live updates via SSE.

### Acceptance criteria

- [ ] Channel: `greenroom:festival:{festivalId}:results-count`.
- [ ] Every result publish (`announceResult`) publishes `INCR`-equivalent event.
- [ ] SSE endpoint `/api/v1/festivals/[festivalId]/results-count/stream`.
- [ ] Public page subscribes; counter updates within 1s of announcement.
- [ ] Integration test: publish result → counter subscriber receives within 200ms.

### Risks & rollback

- **Counter drift** if publish event arrives before DB write → publish AFTER DB commit; safe.
- **Rollback**: stop publishing; polling continues.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Payload | `{ festivalId, count, lastResultAt }` | All info the public UI needs. |

---

## Use case 18 — Email bounce / complaint pub/sub

**Touches**: `src/features/notifications/workers/resend-webhook-worker.ts` (publish after dedup + DB write) · new global subscriber in `src/features/email-preferences/services/email-prefs-cache.ts` (auto-disable on bounce) · `src/features/admin/services/admin-notifications.service.ts` (in-app alert).

### What to build

When Resend reports a bounce or complaint (delivered via webhook → `greenroom-resend-webhooks` queue in use case 11), fan out to internal subscribers (notification preferences update, admin alert).

### Acceptance criteria

- [ ] Channel: `greenroom:email:bounce`.
- [ ] Resend webhook worker publishes after dedup and DB write.
- [ ] Subscribers: `email-preferences` service (auto-disable), `admin-notifications` service (in-app alert).
- [ ] Integration test: simulate bounce → both subscribers react.

### Risks & rollback

- **Subscriber crashes silently** → use Redis Streams for this channel (durable); Pub/Sub is fire-and-forget. Decision deferred.
- **Rollback**: stop publishing; email-prefs unchanged; admin alert falls back to email.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Channel scope | Global — not per-festival | Bounces affect users, not festivals. |
| 2 | Pub/Sub vs Streams | **Defer to Streams decision** (this is the one use case where durability matters) | The other 17 use cases don't need it. File as a follow-up if Resend guarantees aren't enough. |

---

## Out of scope (separate tickets if needed)

- Real-time chat / bidirectional events (would need WebSocket, not in this issue).
- Better Auth **session migration** to Redis (DB-backed sessions are fine; the cache layer is in `ISSUE-45` use cases 9-12 area).
- Bidirectional judge-to-judge coordination (chat-style).
- Email bounce durability — use case 18 may need Streams instead of Pub/Sub; revisit if Resend's delivery guarantee proves insufficient.

## Acceptance (overall)

- [ ] All 17 use cases ship in one or more PRs.
- [ ] Workers deploy cleanly on Railway / Fly as `npm run worker` (one process, multiple consumers).
- [ ] Every pub/sub channel has at least one SSE consumer in the UI.
- [ ] Every BullMQ queue has retry + dead-letter handling.
- [ ] All fail-open paths tested (Redis down → graceful degradation or polling fallback).
- [ ] `npm run test:integration` green.

## Verification

```bash
# In one terminal: workers
REDIS_URL=redis://:devpass@localhost:6379 npm run worker

# In another: integration tests
npm run test:integration

# Manual: trigger an export from /dashboard/[slug]/exports,
# watch the worker log, see the file appear in the dashboard.
# Then submit a Stage Portal score in two browser tabs;
# observe the counter increment in tab B within ~1 second.
```

## Open questions to confirm

1. **Worker hosting** — Railway or Fly? Single process or split per worker? (Current proposal: single process, multiple consumers, `npm run worker` entrypoint.)
2. **SSE auth** — how aggressively should we cache the festival-role check? Once per connection or once per event?
3. **Webhook queue ordering** — strict ordering by event timestamp, or first-in-first-done? Razorpay guarantees order so FIFO is fine; document.
4. **BullMQ vs Inngest / Trigger.dev** — both managed alternatives. Inngest has nicer DX for scheduled jobs; Trigger.dev has nicer UI for retries. Both require separate vendor relationships. Stick with BullMQ for now (vendor-consistent).
5. **SSE through Vercel proxy** — Vercel functions time out at 60s (Pro) or 900s (Fluid). SSE long-lived connections need careful timeout handling. File as a separate ticket if it bites.
6. **Multi-region Redis** — single-region Redis Cloud means Vercel functions in other regions see higher latency for pub/sub. Acceptable for Phase 1; revisit when traffic justifies multi-region.