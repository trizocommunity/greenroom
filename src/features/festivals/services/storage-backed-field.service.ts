import { db } from "@/core/database/client";
import {
  mutateWithAccounting,
  type ResourceType,
} from "@/features/festivals/services/resource-mutation.service";
import { StorageUsageService } from "@/features/festivals/services/storage-usage.service";

const STORAGE_RESOURCE: ResourceType = "storage";

/**
 * Storage-backed Field Service
 *
 * Auto-accounts URL-size deltas for fields that point to remote assets
 * (images, logos, etc.). Callers describe the URLs being added and removed;
 * this service computes the size delta via HEAD requests and delegates the
 * counter update to ResourceMutationService.
 */
export const StorageBackedFieldService = {
  async mutateUrls<T>({
    festivalId,
    add = [],
    remove = [],
    operation,
    tx,
  }: {
    festivalId: string;
    add?: Array<string | null | undefined>;
    remove?: Array<string | null | undefined>;
    operation: (tx: typeof db) => Promise<T>;
    tx?: typeof db;
  }): Promise<T> {
    const [addMb, removeMb] = await Promise.all([
      StorageUsageService.getUrlsSizeMB(add),
      StorageUsageService.getUrlsSizeMB(remove),
    ]);
    const delta = addMb - removeMb;

    if (delta === 0) {
      return operation(tx ?? db);
    }

    return mutateWithAccounting({
      festivalId,
      resource: STORAGE_RESOURCE,
      delta,
      operation,
      tx,
    });
  },

  async mutateSingleUrl<T>({
    festivalId,
    currentUrl,
    nextUrl,
    operation,
    tx,
  }: {
    festivalId: string;
    currentUrl?: string | null;
    nextUrl?: string | null;
    operation: (tx: typeof db) => Promise<T>;
    tx?: typeof db;
  }): Promise<T> {
    const add: Array<string | null | undefined> =
      nextUrl && nextUrl !== currentUrl ? [nextUrl] : [];
    const remove: Array<string | null | undefined> =
      currentUrl && currentUrl !== nextUrl ? [currentUrl] : [];

    return StorageBackedFieldService.mutateUrls({
      festivalId,
      add,
      remove,
      operation,
      tx,
    });
  },
};
