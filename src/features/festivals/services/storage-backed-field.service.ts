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
      const result = await operation(tx ?? db);
      StorageBackedFieldService._cleanupRemovedUrls(remove);
      return result;
    }

    const result = await mutateWithAccounting({
      festivalId,
      resource: STORAGE_RESOURCE,
      delta,
      operation,
      tx,
    });
    
    StorageBackedFieldService._cleanupRemovedUrls(remove);
    return result;
  },

  /**
   * Helper to silently delete removed Cloudinary files so we don't
   * leak storage when a user deletes/replaces media in the DB.
   */
  _cleanupRemovedUrls(remove: Array<string | null | undefined>) {
    if (!remove || remove.length === 0) return;
    
    // We execute this in the background without blocking the response
    Promise.resolve().then(async () => {
      try {
        const { deleteFile, extractPublicIdFromUrl } = await import("@/core/integrations/cloudinary");
        for (const url of remove) {
          if (!url) continue;
          const publicId = extractPublicIdFromUrl(url);
          if (publicId) {
            await deleteFile(publicId);
          }
        }
      } catch (e) {
        console.error("Failed to delete removed files from Cloudinary:", e);
      }
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
