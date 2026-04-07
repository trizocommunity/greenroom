function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const realtimeConfig = {
  enabled: parseBoolean(process.env.REALTIME_ENABLED, true),
  preferSocketTransport: parseBoolean(
    process.env.NEXT_PUBLIC_REALTIME_USE_SOCKET,
    false,
  ),
  enableDualPublish: parseBoolean(process.env.REALTIME_DUAL_PUBLISH, false),
  enforceStrictAuth: parseBoolean(process.env.REALTIME_STRICT_AUTH, false),
  outboxDispatchBatchSize: parseNumber(
    process.env.REALTIME_OUTBOX_BATCH_SIZE,
    100,
  ),
  outboxDispatchMaxRetries: parseNumber(
    process.env.REALTIME_OUTBOX_MAX_RETRIES,
    8,
  ),
  outboxProcessingLeaseMs: parseNumber(
    process.env.REALTIME_OUTBOX_PROCESSING_LEASE_MS,
    120000,
  ),
  outboxDispatcherEnabled: parseBoolean(
    process.env.REALTIME_OUTBOX_DISPATCHER_ENABLED,
    false,
  ),
  outboxStuckRecoveryEnabled: parseBoolean(
    process.env.REALTIME_OUTBOX_STUCK_RECOVERY_ENABLED,
    true,
  ),
  requireCronSecretInProduction: parseBoolean(
    process.env.REALTIME_REQUIRE_CRON_SECRET_IN_PRODUCTION,
    true,
  ),
  socketEnabled: parseBoolean(process.env.REALTIME_SOCKET_ENABLED, false),
  observabilityEnabled: parseBoolean(process.env.REALTIME_OBSERVABILITY, true),
  publicStandingsRealtimeEnabled: parseBoolean(
    process.env.NEXT_PUBLIC_REALTIME_PUBLIC_STANDINGS,
    false,
  ),
  reconnectBaseDelayMs: parseNumber(
    process.env.NEXT_PUBLIC_REALTIME_RECONNECT_BASE_MS,
    1000,
  ),
  reconnectMaxDelayMs: parseNumber(
    process.env.NEXT_PUBLIC_REALTIME_RECONNECT_MAX_MS,
    15000,
  ),
  redisUrl: process.env.REDIS_URL ?? "",
} as const;

export function isRealtimeRuntimeEnabled(): boolean {
  return realtimeConfig.enabled;
}

export type RealtimePrincipalType =
  | "dashboard-user"
  | "team-leader"
  | "judge-session"
  | "public";
