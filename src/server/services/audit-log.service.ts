import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { auditLog, user as users } from "../db/schema";
import { desc, eq, ilike, inArray, or } from "drizzle-orm";

type AuditAction =
  | "DELETE_FESTIVAL"
  | "UPDATE_USER"
  | "DELETE_FESTIVAL_ADMIN"
  | "CREATE_FESTIVAL"
  | "UPDATE_FESTIVAL"
  | "UPDATE_FESTIVAL_STATUS"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "UPDATE_PROFILE"
  | "CREATE_MEMBER"
  | "REVOKE_MEMBER"
  | "COMPLETE_ONBOARDING"
  | "PASSWORD_RESET";

type TargetType = "FESTIVAL" | "USER" | "PAYMENT";

interface CreateAuditLogParams {
  action: AuditAction;
  targetType: TargetType;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  const session = await getSession();

  if (!session?.userId) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  const { randomUUID } = await import("crypto");
  const result = await db.insert(auditLog).values({
    id: randomUUID(),
    actorId: session.userId,
    actorRole: session.role,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata || {},
  }).returning();

  return result[0];
}

export async function getAuditLogs(params?: {
  search?: string;
  limit?: number;
}) {
  const { search, limit = 500 } = params || {};

  let logs: (typeof auditLog.$inferSelect)[];

  if (search) {
    // 1. Find users matching the search
    const matchingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.fullName ?? "", `%${search}%`),
          ilike(users.displayName ?? "", `%${search}%`)
        )
      );
    const userIds = matchingUsers.map((u) => u.id);

    // 2. Build AuditLog filter
    logs = await db
      .select()
      .from(auditLog)
      .where(
        or(
          userIds.length > 0 ? inArray(auditLog.actorId, userIds) : undefined,
          ilike(auditLog.action, `%${search}%`),
          ilike(auditLog.targetId, `%${search}%`),
          ilike(auditLog.targetType, `%${search}%`),
          ilike(auditLog.actorRole, `%${search}%`)
        )
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  } else {
    logs = await db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }

  // 3. Enrich with Actor details
  const actorIds = Array.from(new Set(logs.map((log) => log.actorId)));
  const actors = actorIds.length > 0
    ? await db
        .select({ id: users.id, fullName: users.fullName, email: users.email, globalRole: users.globalRole })
        .from(users)
        .where(inArray(users.id, actorIds))
    : [];

  const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

  return logs.map((log) => ({
    ...log,
    actor: actorMap.get(log.actorId) || null,
  }));
}
