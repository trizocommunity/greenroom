# Issue 47 — Server-Side Deferred Work from Issue 46

## Status

- **Type**: AFK — server-side work only. Comprises three logical chunks: producer-side `publish()` calls for the 9 SSE channels, real implementations of the two skeleton Inngest functions, and backend integration tests for the Issue 46 functions + webhook signatures.
- **Blocked by**: Issue 46 (sub-slices 1–5 must be on `develop` first — they are, at `66fcadd`).
- **Blocks**: Issue 48 (frontend subscribers can't render live data without producer-side publishes).

## Summary

Issue 46 shipped the structural plumbing — 8 Inngest functions registered, 9 SSE consumer routes wired, the `keys.*` builder extended with the channel namespace, and the `src/core/pubsub/redis-pubsub.ts` + `src/core/sse/sse-handler.ts` shared infrastructure in place. What's missing is the **emit side** of every channel and the real implementations behind two skeletons.

This issue closes the gap. Three sub-slices ship together so the SSE channels actually carry data, the render queues stop returning `skipped`, and the functions have the test coverage the issue spec demanded.

| Sub-slice | Type | What it does |
|---|---|---|
| **A. Producer-side `publish()` calls** | AFK | 9 `publish(channel, payload)` calls at the relevant write sites in existing services |
| **B. Real render implementations** | AFK | `poster-render.ts` Konva pipeline + `cloudinary-transform.ts` `explicit()` call |
| **C. Backend integration tests** | AFK | Inngest function tests (mocks) + webhook signature positive/negative cases |

After this issue lands, every Issue 46 SSE channel will fire on its triggering event, the render queues will produce real outputs, and the test surface matches the issue spec.

## Table of contents

- [Sub-slice A — Producer-side `publish()` calls](#sub-slice-a--producer-side-publish-calls)
- [Sub-slice B — Real render implementations](#sub-slice-b--real-render-implementations)
- [Sub-slice C — Backend integration tests](#sub-slice-c--backend-integration-tests)
- [Out of scope](#out-of-scope)
- [Acceptance (overall)](#acceptance-overall)
- [Verification](#verification)
- [Open questions](#open-questions)

---

## Sub-slice A — Producer-side `publish()` calls

### What to build

For every Issue 46 SSE channel, add a `publish()` call at the existing write site that should trigger the live update. The `publish()` helper from `src/core/pubsub/redis-pubsub.ts` is already fire-and-forget and logs on failure, so writers don't need to change their happy-path semantics.

### Files changed

- `src/features/judgement/services/scoring-policy.service.ts` (UC3)
- `src/features/announcement/services/announcement-desk.service.ts` (UC6)
- `src/features/results/services/leaderboard.service.ts` (UC7, UC17)
- `src/features/food-entry/services/food-entry.service.ts` (UC9)
- `src/features/admin/services/analytics.service.ts` (UC13)
- `src/features/participants/actions/chest-number.actions.ts` (UC14)
- `src/features/schedule/actions/schedule.actions.ts` (UC15)
- `src/inngest/functions/cron-daily.ts` (UC16 ticker — see Sub-slice B notes) OR a new dedicated `src/inngest/functions/countdown-ticker.ts`
- `src/features/payments/services/payments-domain.service.ts` (cross-cutting — publish on payment success)
- (existing) `src/inngest/functions/resend-webhook.ts` already publishes for UC18 — no change needed

### Per-use-case payload shape

| Use case | Channel | Publisher | Write site | Payload |
|---|---|---|---|---|
| UC3 score events | `keys.programmeScoreEvents(programmeId)` | after `submitJudgeScoresAction` insert | `judgement.actions.ts` (or in the Inngest function step) | `{ programmeId, judgeId, submittedAt, scoresCount }` |
| UC6 announce | `keys.festivalAnnounce(festivalId)` | on advance-to-next | `announcement-desk.service.ts` | `{ programmeId, position, resultNumber, startedAt }` |
| UC7 standings | `keys.festivalStandings(festivalId)` | on `announceResult` complete | `leaderboard.service.ts` | `{ teamStandings, lastUpdatedAt }` |
| UC9 food-hall scan | `keys.foodHallEvents(slotId)` | on `recordFoodEntry` insert | `food-entry.service.ts` | `{ participantId, chestNumber, scannedAt }` |
| UC13 super-admin stats | `keys.superAdminStats()` | on every delta event (festival create, payment success, support ticket open) | `analytics.service.ts` (or at each event producer) | `{ type: 'festival_created', delta: 1, occurredAt }` |
| UC14 chest numbers | `keys.festivalChestNumbers(festivalId)` | on `assignChestNumbers` | `chest-number.actions.ts` | `{ groupId, range, assignedBy, assignedAt }` |
| UC15 schedule | `keys.festivalSchedule(festivalId)` | on `schedule_entry` write | `schedule.actions.ts` | `{ entryId, stageId, startsAt, endsAt }` |
| UC16 countdown | `keys.festivalCountdown(festivalId)` | per-minute/per-second ticker | new `countdown-ticker` (see Sub-slice B) | `{ daysToStart, daysToEnd, daysToExpire, tickedAt }` |
| UC17 results counter | `keys.festivalResultsCount(festivalId)` | on `announceResult` | `leaderboard.service.ts` (same call site as UC7) | `{ festivalId, count, lastResultAt }` |

### Acceptance criteria

- [ ] Each write site listed above has a `publish(channel, payload)` call in its happy path.
- [ ] Payloads match the table above — JSON-serialisable, no functions or class instances.
- [ ] Publish failures don't propagate the the throw — `publish()` already logs + swallows, so writers don't need extra try/catch.
- [ ] For UC3 + UC7 + UC17, the publish is wrapped in the same DB transaction boundary as the underlying write when possible, so a failed write doesn't emit a phantom event. (Best-effort; eventual consistency is acceptable per the issue spec.)
- [ ] One PR per channel cluster to keep reviews focused:
  - PR-1: UC3 + UC6 + UC7 + UC17 (results cluster)
  - PR-2: UC9 + UC13
  - PR-3: UC14 + UC15
  - PR-4: UC16 ticker (depends on Sub-slice B)

### Risks & rollback

- **Publish on every write = high Redis write volume** — each `announceResult` emits UC7 + UC17. With a 200-participant festival that's 400 publishes over the event. Acceptable; the cache seam and Pub/Sub both share the same Redis endpoint.
- **Event ordering vs DB commit** — if `publish()` runs before the DB commit lands, a subscriber can fetch the new state and see the old DB row. The issue spec accepts this; document.
- **Rollback**: each `publish()` is a one-line call; revert is mechanical.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Payload schema | Plain JSON objects, no shared type | Each channel has a small dedicated payload; over-typing adds friction. |
| 2 | Channel-name source | `keys.<channel>(...)` everywhere | Matches the issue's locked decision to namespace all keys under `greenroom:`. |
| 3 | Transactional publish | Out of scope | Eventual consistency accepted per the issue spec. |
| 4 | UC13 dedup | Coalesce deltas in 1-second windows | Matches the original spec's "channel noise during high-write bursts" mitigation. |
| 5 | UC16 cadence | 1s in final hour, 60s otherwise | Matches the original spec. |

---

## Sub-slice B — Real render implementations

### What to build

Replace the `skipped` returns in `poster-render.ts` and `cloudinary-transform.ts` with real pipelines. Both currently log a placeholder payload and return; both need actual side effects.

### B.1 — `poster-render.ts` (UC5)

**Konva → Cloudinary → store URL.** The Konva renderer is browser-side today (`poster-editor-preview.service.ts`); moving it server-side requires extracting the rendering function so it runs in Node without a DOM.

#### Files changed

- `src/inngest/functions/poster-render.ts` — replace placeholder with real steps
- `src/features/posters/services/poster-server-renderer.ts` — new. Pure Node function that takes a template ID + data and returns PNG/PDF bytes. Mirrors the existing `poster-editor-preview-placeholders.ts` shape.
- `src/core/integrations/cloudinary.ts` — extend (or create) with an `uploadBuffer(buffer, opts)` helper.

#### Acceptance criteria

- [ ] `poster-server-renderer.ts` exports `renderPosterToBuffer(templateId, data, format): Promise<Buffer>`.
- [ ] Konva's node entry (`konva/lib/index-node.js` or `canvas` polyfill) is used; if neither works in Node, fall back to `sharp` + JSON-driven layout for v1.
- [ ] `poster-render.ts` Inngest function does: `step.run("render", () => renderPosterToBuffer(...))` → `step.run("upload", () => uploadBuffer(buffer, { folder: "greenroom/posters" }))` → `step.run("store-url", () => writeUrlToTargetRow(...))`.
- [ ] Triggered by `render.poster.requested` events with payload `{ renderId, festivalId, templateId, targetRow }`.
- [ ] Failed render throws `NonRetriableError` (template shape is wrong → don't retry).
- [ ] Integration test: enqueue with a fixture template → buffer uploaded → target row URL matches the Cloudinary response (mocked).

### B.2 — `cloudinary-transform.ts` (UC12)

**`cloudinary.uploader.explicit()` call.** Apply eager transformations to an existing uploaded asset.

#### Files changed

- `src/inngest/functions/cloudinary-transform.ts` — replace placeholder with real call
- `src/core/integrations/cloudinary.ts` — add `applyTransformations(publicId, transformations)` helper

#### Acceptance criteria

- [ ] `applyTransformations` returns `{ secure_url, public_id, eager: [...] }`.
- [ ] Triggered by `transform.image.requested` events with `{ publicId, transformations: [...] }`.
- [ ] Failed transformation throws `NonRetriableError` on 4xx (bad publicId, unsupported transformation).
- [ ] Integration test: enqueue with a mock Cloudinary SDK → returns the eager URL.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Konva server rendering | Try `konva-node` first; fall back to `sharp` + JSON layout if unstable | Konva-node has known limitations with text rendering; `sharp` is the proven path for server-side image gen. |
| 2 | Output storage | Cloudinary URL only (per the issue spec) | `festivalExport`-style base64 storage is not in scope for posters. |
| 3 | Retry semantics | 4xx → `NonRetriableError`, 5xx → retry | Standard Inngest pattern. |

---

## Sub-slice C — Backend integration tests

### What to build

Test coverage for the 8 Inngest functions + 2 webhook handlers that Issue 46 shipped without tests. The cache-seam tests in `src/test/integration/` already cover the Redis primitives.

### C.1 — Inngest function tests

Use `@inngest/test`'s mock harness (or hand-rolled event invocation via `serve()`) to trigger each function with a fixture payload and assert the side effects.

#### Files added

- `src/test/integration/inngest/cron-daily.test.ts`
- `src/test/integration/inngest/email-send.test.ts`
- `src/test/integration/inngest/export-job.test.ts`
- `src/test/integration/inngest/csv-import.test.ts`
- `src/test/integration/inngest/poster-render.test.ts` (depends on Sub-slice B)
- `src/test/integration/inngest/cloudinary-transform.test.ts` (depends on Sub-slice B)
- `src/test/integration/inngest/razorpay-webhook.test.ts`
- `src/test/integration/inngest/resend-webhook.test.ts`

#### Acceptance criteria

- [ ] Each function has at least one positive test (event triggered → side effects observed).
- [ ] Idempotent functions (`razorpay-webhook`, `resend-webhook`) have a duplicate-delivery test.
- [ ] Retriable vs non-retriable errors asserted via `step.run`'s retry behaviour.
- [ ] No real network calls — Cloudinary, Resend, Razorpay are mocked.

### C.2 — Webhook signature verification tests

Positive (valid signature → 200 OK + queued) and negative (invalid signature → 403, missing header → 400, malformed body → 400) cases.

#### Files added

- `src/test/integration/api/payments-webhook.test.ts`
- `src/test/integration/api/resend-webhook.test.ts`

#### Acceptance criteria

- [ ] Valid HMAC passes.
- [ ] HMAC with wrong secret fails.
- [ ] Missing signature header returns 400.
- [ ] Malformed JSON body returns 400.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Inngest mock strategy | `@inngest/test` if available; otherwise invoke the function directly with a stubbed `Inngest` client | Avoid spinning up the Inngest dev server in tests. |
| 2 | Webhook test fixture | Hard-coded secrets + payload + signature triplets | Stable, fast, no clock dependency. |
| 3 | Testcontainers usage | Postgres + Redis (existing infra) only | No need for Inngest's server. |

---

## Out of scope

- Frontend SSE subscribers — Issue 48.
- Real Cron ticker for UC16 — handled in this issue as part of Sub-slice B (creates a new `countdown-ticker` function).
- Multi-region Redis — flagged in Issue 46 open questions.
- Vercel env var wiring (`INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`) — ops, not code.
- Smoke test removal — a one-line PR, doesn't justify its own issue.

## Acceptance (overall)

- [ ] Every Issue 46 SSE channel fires on its triggering event (UC3/6/7/9/13/14/15/16/17).
- [ ] `poster-render.ts` and `cloudinary-transform.ts` produce real outputs.
- [ ] All 8 Inngest functions have integration tests.
- [ ] Both webhook handlers have signature verification tests.
- [ ] `npm run test:integration` green.
- [ ] `npm run lint`, `npm run check`, `npm test` green.

## Verification

```bash
npm run test:integration -- inngest api/payments-webhook api/resend-webhook
```

Manual smoke: trigger a Stage Portal score in two browser tabs (after Issue 48 lands); observe the counter increment in tab B within ~1 second. Trigger a result publish; watch the standings SSE fire on the public landing page.

## Open questions

1. **`konva-node` vs `sharp` for poster rendering** — flagged in Sub-slice B locked decision #1. Decide before shipping Sub-slice B.
2. **UC16 ticker scheduling** — Inngest cron at 1s cadence is wasteful; the spec's "1s in final hour" cadence is better handled by a per-minute ticker that decides cadence server-side. Implement as Inngest cron `* * * * *` with the function deciding whether to publish.
3. **UC13 delta batching** — server-side 1-second window for batching. Implement as a lightweight in-memory debounce inside the function, or via a separate `super-admin-stats-batcher` function. Defer to implementation.
4. **UC16 cadence** — final-hour boundary needs the festival's `startDate` available. The ticker function must look it up on each tick.
5. **Inngest test harness** — confirm `@inngest/test` is the right package (vs `inngest/test`) before committing to Sub-slice C.