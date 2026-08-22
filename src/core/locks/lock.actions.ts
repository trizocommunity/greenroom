"use server";

import { getSession } from "@/core/auth/session";
import {
  acquireEditLock,
  heartbeatEditLock,
  releaseEditLock,
} from "./edit-lock";

type EntityType = string;

async function getActorId() {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error("Unauthorized");
  }
  return session.name || session.email || "Unknown User";
}

export async function acquireLockAction(
  entityType: EntityType,
  entityId: string,
) {
  const actorId = await getActorId();
  return acquireEditLock(entityType, entityId, actorId);
}

export async function releaseLockAction(
  entityType: EntityType,
  entityId: string,
) {
  const actorId = await getActorId();
  return releaseEditLock(entityType, entityId, actorId);
}

export async function heartbeatLockAction(
  entityType: EntityType,
  entityId: string,
) {
  const actorId = await getActorId();
  return heartbeatEditLock(entityType, entityId, actorId);
}
