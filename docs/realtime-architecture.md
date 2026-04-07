# Realtime Architecture

## Overview

Greenroom now supports a phased realtime architecture built around:

- Canonical domain events (`reporting.updated`, `judgment.submitted`, `standings.updated`, etc.)
- A durable `realtime_outbox` table for at-least-once dispatch
- Transport fanout through in-process bus + Redis pub/sub
- Room-scoped subscriptions (`festival`, `role`, `student`, `judgment`, `reporting`, `public`)

## Delivery Path

1. Domain mutation runs in server action/service.
2. Event is emitted via domain helper.
3. When dual-publish is enabled, event is persisted to `realtime_outbox`.
4. Dispatcher publishes event payload to transport fanout.
5. Clients consume via SSE (current default) and optional socket transport.

## Flags

- `REALTIME_ENABLED`
- `REALTIME_DUAL_PUBLISH`
- `REALTIME_OUTBOX_DISPATCHER_ENABLED`
- `REALTIME_OUTBOX_MAX_RETRIES`
- `REALTIME_OUTBOX_PROCESSING_LEASE_MS`
- `REALTIME_OUTBOX_STUCK_RECOVERY_ENABLED`
- `REALTIME_STRICT_AUTH`
- `REALTIME_SOCKET_ENABLED`
- `NEXT_PUBLIC_REALTIME_USE_SOCKET`
- `NEXT_PUBLIC_REALTIME_PUBLIC_STANDINGS`
- `REDIS_URL`
- `CRON_SECRET`

## Security Rules

- Room access is server-authorized (`authorizeRealtimeRoomJoin`).
- Festival isolation is required for every room key.
- Student-scoped realtime stream requires authenticated principal.
- Student room access only for owning team leader or privileged dashboard principal.
- Public standings room publishes redacted payloads only.

## Reliability Rules

- `REALTIME_ENABLED=false` hard-disables emit, dispatch, and subscribe entrypoints.
- Outbox claim uses guarded status updates to reduce duplicate worker claims.
- Stale `PROCESSING` rows are auto-recovered to `FAILED` based on lease timeout.
- Retry attempts are terminalized once max retry limit is reached.
