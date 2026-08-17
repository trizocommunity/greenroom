# Issue 48 — Frontend + SSE Tests (Deferred from Issue 46)

## Status

- **Type**: AFK — frontend work only (no server changes) plus SSE integration tests. The shared React hooks + 9 `EventSource` consumers land together so the UI changes are reviewable in one pass.
- **Blocked by**: Issue 47 (producer-side `publish()` calls must exist before the UI sees anything).
- **Blocks**: nothing inside the issue tracker. Blocked externally by the Vercel SSE proxy decision (see Open questions).

## Summary

Issue 46 wired the server side — 9 SSE routes are open, auth checks pass, channels are subscribed, but no UI consumes them yet. This issue adds the missing client side:

1. A shared `useEventSource` hook with auto-reconnect + heartbeat detection + a typed `useLiveChannel<T>` wrapper.
2. Nine `EventSource` consumers in the `(festivalPublic)` route group and dashboard pages — one per Issue 46 use case (UC3, UC6, UC7, UC9, UC13, UC14, UC15, UC16, UC17).
3. Frontend integration tests for the SSE plumbing using a Testcontainers Redis backend and the `eventsource-client` polyfill.

After this issue lands, every public + dashboard surface that the spec calls for stops polling at 15s and switches to instant updates.

## Table of contents

- [Sub-slice A — Shared SSE infrastructure](#sub-slice-a--shared-sse-infrastructure)
- [Sub-slice B — Per-page SSE consumers](#sub-slice-b--per-page-sse-consumers)
- [Sub-slice C — Frontend SSE tests](#sub-slice-c--frontend-sse-tests)
- [Out of scope](#out-of-scope)
- [Acceptance (overall)](#acceptance-overall)
- [Verification](#verification)
- [Open questions](#open-questions)

---

## Sub-slice A — Shared SSE infrastructure

### What to build

A small `src/hooks/` directory with three primitives the per-page consumers share. Keep it minimal — no state-management library, no full client cache, just `useEffect` + a `useSyncExternalStore` for the snapshot.

### Files added

- `src/hooks/use-event-source.ts` — generic `EventSource` React hook.
  - Accepts `{ url, withCredentials?, eventName? }` + an optional `parse(payload) => T`.
  - Returns `{ data: T | null, error: Error | null, status: 'connecting' | 'open' | 'closed' }`.
  - Auto-reconnects with exponential backoff (1s, 2s, 4s, max 30s).
  - Detects server-side heartbeats (lines starting with `:`) and treats them as liveness pings, not data.
  - On `req.signal.abort` (component unmount), closes the connection.
- `src/hooks/use-live-channel.ts` — typed wrapper around `useEventSource`. Accepts `{ url: string | (() => Promise<string>), parse?: (raw: unknown) => T }` and returns the same shape with `data: T | null`.
- `src/hooks/__tests__/use-event-source.test.ts` — unit test using `eventsource-client` polyfill (see Sub-slice C).

### Acceptance criteria

- [ ] `useEventSource` opens the connection on mount and closes on unmount.
- [ ] Backoff is exponential with a 30s ceiling.
- [ ] Heartbeat lines (prefix `:`) are silently consumed and reset the liveness timer.
- [ ] Component unmount during reconnect aborts the pending backoff.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | State store | `useSyncExternalStore` | Avoids `useEffect` re-render pitfalls; React 18 recommended. |
| 2 | Backoff strategy | Exponential with jitter | Standard SSE client pattern. |
| 3 | Heartbeat detection | Lines starting with `:` are ignored | Server already emits `: heartbeat\n\n` every 30s (Issue 46). |
| 4 | Error surface | `{ data: null, error: Error, status }` | Keeps the contract minimal. Pages fall back to 15s polling on error. |

---

## Sub-slice B — Per-page SSE consumers

### What to build

Wire each consumer page to its Issue 46 SSE route via `useEventSource` or `useLiveChannel`. Existing pages already poll every 15s; we replace the poll loop with the live channel and keep the poll as a 30s safety net.

### Per-use-case table

| Use case | Channel route | Consumer page | Auth context | Polling fallback |
|---|---|---|---|---|
| UC3 score events | `/api/v1/programmes/{id}/score-events/stream` | `StagePortalScoringClient.tsx`, `announcement/page.tsx` (announcers tab) | Stage Portal session | Yes (30s) |
| UC6 announce | `/api/v1/festivals/{id}/announce/stream` | `(festivalPublic)/[slug]/results/page.tsx`, `dashboard/[slug]/stage-manager/page.tsx` | Public | Yes (30s) |
| UC7 standings | `/api/v1/festivals/{id}/standings/stream` | `(festivalPublic)/[slug]/page.tsx`, `dashboard/[slug]/event-works/top-scorers/page.tsx` | Public / Admin | Yes (30s) |
| UC9 food-hall events | `/api/v1/food-hall/{slotId}/events/stream` | `dashboard/[slug]/event-works/food-entry/page.tsx` | Admin | Yes (30s) |
| UC13 super-admin stats | `/api/v1/super-admin/stats/stream` | `app/super-admin/analytics/page.tsx` | Super Admin | Yes (60s) |
| UC14 chest numbers | `/api/v1/festivals/{id}/chest-numbers/stream` | `dashboard/[slug]/pre-event-works/chest-numbers/page.tsx` | Admin | Yes (30s) |
| UC15 schedule | `/api/v1/festivals/{id}/schedule/stream` | `dashboard/[slug]/pre-event-works/schedule/page.tsx` | Admin | Yes (30s) |
| UC16 countdown | `/api/v1/festivals/{id}/countdown/stream` | `(festivalPublic)/[slug]/page.tsx` | Public | Yes (60s — countdown only needs minute resolution) |
| UC17 results counter | `/api/v1/festivals/{id}/results-count/stream` | `(festivalPublic)/[slug]/results/page.tsx` | Public | Yes (30s) |

### Acceptance criteria

- [ ] Each consumer page opens its channel on mount.
- [ ] Incoming events update the page state in <500ms after publish.
- [ ] If the SSE connection fails (404, 500, network), the page falls back to 15-30s polling within 5s.
- [ ] No regressions in page-level unit tests — replace `setInterval(poll, 15000)` with `useLiveChannel` and assert the polling fallback runs on error.

### Risks & rollback

- **SSE through Vercel proxy** — 60s Pro / 900s Fluid timeout. Mitigated by the 30s heartbeat from Issue 46's `sse-handler.ts`. Document in the route's JSDoc.
- **Multi-region Redis** — single-region Redis Cloud means non-primary Vercel regions see higher latency for publish. Acceptable for v1; revisit when traffic justifies multi-region.
- **Page regression if SSE handler errors** — every consumer must keep its existing 15s poll loop as fallback. If SSE breaks on prod, pages degrade to polling silently.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Server-side heartbeat cadence | 30s (already in Issue 46) | Matches Vercel's idle-timeout window with margin. |
| 2 | Polling fallback cadence | 15s for results/standings/score, 30s for food-hall/chest/schedule, 60s for countdown/super-admin | Cost vs UX trade-off per surface. |
| 3 | Reconnect backoff | 1s → 2s → 4s → max 30s, with jitter | Standard pattern; matches Inngest's own retry strategy. |
| 4 | Event payload type | `unknown` → caller parses | Keeps the SSE route payload-agnostic; per-page `parse()` does the validation. |

---

## Sub-slice C — Frontend SSE tests

### What to build

Vitest tests for the SSE plumbing using `eventsource-client` (the standard `EventSource` polyfill that works under jsdom) + a Testcontainers Redis backend spinning up the actual pub/sub channels.

### Files added

- `src/hooks/__tests__/use-event-source.test.ts` — hook unit test (mount/unmount/reconnect/heartbeat/parse).
- `src/hooks/__tests__/use-live-channel.test.ts` — typed wrapper test.
- `src/test/integration/sse-channels.test.ts` — end-to-end Testcontainers test:
  - Spin up a Redis container via `@testcontainers/redis`.
  - Connect a real SSE handler (using `eventsource-client` against a `node:http` server with `sseHandler`).
  - `publish()` a payload.
  - Assert the consumer receives it.
  - Repeat for all 9 channels (parameterised).
- `src/test/integration/sse-auth.test.ts` — every SSE route returns 401/403 for missing/invalid auth.

### Acceptance criteria

- [ ] `use-event-source.test.ts` covers: open/close, reconnect with backoff, heartbeat ignored, parse function applied, error surfaced.
- [ ] `sse-channels.test.ts` covers all 9 channels.
- [ ] `sse-auth.test.ts` covers: no auth header → 401, wrong role → 403, public route → 200.
- [ ] Tests run under `npm run test:integration` and finish in <60s combined.

### Locked decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | SSE test harness | `eventsource-client` polyfill in jsdom | Standard, mature, runs in vitest without browser. |
| 2 | Real Redis or mock? | Testcontainers (real Redis) | Matches the issue's "no N+1 queries, all fail-open paths tested" requirement. |
| 3 | Auth tests | Direct invocation of the route handler with a `Request` stub | Faster than spinning up Next.js per case. |

---

## Out of scope

- Server-side producer publishes — Issue 47.
- Real Konva/Cloudinary render implementations — Issue 47.
- Vercel proxy SSE timeout tweaks — operational, separate ticket if it bites.
- Removing the existing 15s polling entirely — keep as fallback for at least one release cycle.
- Any new pages that didn't exist before Issue 46 lands (none expected).

## Acceptance (overall)

- [ ] Every Issue 46 use case has at least one page that consumes its SSE channel live.
- [ ] Each consumer page has a documented polling fallback.
- [ ] `npm run test:integration` covers all 9 channels end-to-end.
- [ ] `npm run lint`, `npm run check`, `npm test` green.

## Verification

```bash
npm run test:integration -- sse-channels sse-auth
```

Manual: open two browser tabs on the same festival; in tab A submit a Stage Portal score; observe the counter in tab B increment within ~1 second. Disconnect wifi; reconnect within 5s; observe the consumer reconnects.

## Open questions

1. **SSE through Vercel proxy** — 60s Pro / 900s Fluid max. The 30s heartbeat from `sse-handler.ts` keeps the connection alive, but if Vercel aggressively closes long-lived connections, the workaround is `EventSource` reconnect (which we already have). File a separate ticket if it bites.
2. **Multi-region Redis** — single-region Redis Cloud means non-primary Vercel regions see higher latency for `publish()`. Acceptable for v1; revisit when traffic justifies multi-region.
3. **Per-region SSE routing** — when Vercel serves from a non-primary region, the SSE handler runs in that region. All regions subscribe to the same Redis Cloud endpoint; latency is symmetric. No routing change needed.
4. **`useLiveChannel` vs `useEventSource`** — keep both, with the typed wrapper being the recommended surface. Drop `useEventSource` later if no consumer needs the raw form.
5. **Server-side batching of UC13 deltas** — currently every festival_create/payment_success publishes a delta. If traffic gets bursty, batch in 1-second windows (see Issue 47 open question #3).
6. **Tanstack Query integration** — Issue 45 UC8 deferred this. If Tanstack Query is wired up after this issue lands, `useLiveChannel` could push directly into the query cache instead of using `useState`. Defer.