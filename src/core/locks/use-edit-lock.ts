"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  acquireLockAction,
  heartbeatLockAction,
  releaseLockAction,
} from "./lock.actions";

export function useEditLock(
  entityType: string,
  entityId: string | null | undefined,
  isOpen: boolean = true,
) {
  const [hasLock, setHasLock] = useState(true);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [isLoadingLock, setIsLoadingLock] = useState(false);

  useEffect(() => {
    // If not open or no entityId (e.g., creating a new item), we don't need a lock
    if (!isOpen || !entityId) {
      setHasLock(true);
      setLockedBy(null);
      return;
    }

    let heartbeatInterval: NodeJS.Timeout;
    let isActive = true;

    async function initLock() {
      setIsLoadingLock(true);
      try {
        const result = await acquireLockAction(entityType, entityId!);
        
        if (!isActive) return;

        if (result.acquired) {
          setHasLock(true);
          setLockedBy(null);

          heartbeatInterval = setInterval(async () => {
            const stillHasLock = await heartbeatLockAction(
              entityType,
              entityId!,
            );
            if (!stillHasLock && isActive) {
              setHasLock(false);
              setLockedBy("Another user (lock lost)");
              clearInterval(heartbeatInterval);
            }
          }, 30000); // 30s heartbeat
        } else {
          setHasLock(false);
          setLockedBy(result.heldBy);
        }
      } catch (err) {
        console.error("Failed to acquire lock", err); toast.error("Database connection failed. Unable to acquire edit lock.");
      } finally {
        if (isActive) setIsLoadingLock(false);
      }
    }

    initLock();

    const handleBeforeUnload = () => {
      releaseLockAction(entityType, entityId).catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isActive = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      releaseLockAction(entityType, entityId).catch(() => {});
    };
  }, [entityType, entityId, isOpen]);

  return { hasLock, lockedBy, isLoadingLock };
}
