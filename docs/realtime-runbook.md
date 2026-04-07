# Realtime Runbook

## Health Checks

- Cron dispatcher endpoint: `GET /api/cron/realtime-dispatch`
- DB backlog: query `realtime_outbox` grouped by `status`
- SSE endpoint: `GET /api/realtime/notifications`

## Common Issues

### Outbox backlog increasing

1. Verify `REALTIME_OUTBOX_DISPATCHER_ENABLED=true`.
2. Check Redis connectivity (`REDIS_URL`).
3. Call `/api/cron/realtime-dispatch` manually with `Authorization: Bearer <CRON_SECRET>`.
4. Inspect `errorMessage`, `retryCount`, and `updatedAt` in `realtime_outbox`.
5. If rows are stuck in `PROCESSING`, ensure stale recovery is enabled (`REALTIME_OUTBOX_STUCK_RECOVERY_ENABLED=true`) and lease is sane (`REALTIME_OUTBOX_PROCESSING_LEASE_MS`).

### Clients not updating in realtime

1. Confirm room authorization (principal has festival scope).
2. Check browser event stream/socket connection status (SSE is primary; socket should auto-fallback).
3. Validate emitted event names and room keys.
4. Confirm fallback query invalidation still works.

### Security concern (wrong user receiving updates)

1. Disable realtime with `REALTIME_ENABLED=false` (all transports and dispatchers stop).
2. Ensure strict auth checks are on (`REALTIME_STRICT_AUTH=true`).
3. Audit room joins and festival/student IDs in logs.

## Rollback

1. Disable dual-publish: `REALTIME_DUAL_PUBLISH=false`.
2. Disable dispatcher: `REALTIME_OUTBOX_DISPATCHER_ENABLED=false`.
3. Disable socket transport preference: `NEXT_PUBLIC_REALTIME_USE_SOCKET=false`.
4. Keep SSE/polling behavior active and validate unread notification polling.
5. Re-enable only after canary metrics recover (dispatch success rate, backlog age, reconnect rate).

## Production Env Guardrails

- `CRON_SECRET` must be set in production (cron routes fail closed otherwise).
- Keep `REALTIME_REQUIRE_CRON_SECRET_IN_PRODUCTION=true`.
- Keep `REALTIME_SOCKET_ENABLED=false` until socket server endpoint is fully wired and load tested.
