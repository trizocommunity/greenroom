import { db } from "@/core/database/client";
import { UsageCounterService } from "@/features/festivals/services/usage-counter.service";

export type ResourceType = "participants" | "programmes" | "stages" | "storage";

/**
 * Resource Mutation Service
 *
 * Wraps a database operation with atomic usage-counter bookkeeping.
 *
 * - If a transaction is supplied, the counter is updated inside that transaction.
 * - If no transaction is supplied, the counter update and operation are wrapped
 *   in a fresh transaction so that the accounting and the mutation roll back
 *   together on failure.
 */
export async function mutateWithAccounting<T>({
  festivalId,
  resource,
  delta,
  operation,
  tx,
}: {
  festivalId: string;
  resource: ResourceType;
  delta: number;
  operation: (tx: typeof db) => Promise<T>;
  tx?: typeof db;
}): Promise<T> {
  if (tx) {
    await UsageCounterService.incrementUsage(festivalId, resource, delta, tx);
    return operation(tx);
  }

  return db.transaction(async (tx) => {
    await UsageCounterService.incrementUsage(festivalId, resource, delta, tx);
    return operation(tx);
  });
}
