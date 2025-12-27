import { getSession } from "@/lib/auth/session";
import { prisma as db } from "@/lib/db";

type AuditAction =
  | "DELETE_FESTIVAL"
  | "UPDATE_USER"
  | "Delete_FESTIVAL_ADMIN"
  | "CREATE_FESTIVAL"
  | "UPDATE_FESTIVAL"
  | "UPDATE_FESTIVAL_STATUS"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "UPDATE_PROFILE";

type TargetType = "FESTIVAL" | "USER" | "PAYMENT";

interface CreateAuditLogParams {
  action: AuditAction;
  targetType: TargetType;
  targetId: string;
  metadata?: Record<string, any>;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error("Audit log requires an authenticated user");
  }

  return await db.auditLog.create({
    data: {
      actorId: session.userId,
      actorRole: session.role,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata || {},
    },
  });
}

export async function getAuditLogs(params?: {
  search?: string;
  limit?: number;
}) {
  const { search, limit = 500 } = params || {};
  let whereClause: any = {};

  if (search) {
    // 1. Find users matching the search
    const matchingUsers = await db.user.findMany({
      where: {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
          { displayName: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    const userIds = matchingUsers.map((u) => u.id);

    // 2. Build AuditLog filter
    whereClause = {
      OR: [
        { actorId: { in: userIds } },
        { action: { contains: search, mode: "insensitive" } },
        { targetId: { contains: search, mode: "insensitive" } },
        { targetType: { contains: search, mode: "insensitive" } },
        { actorRole: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const logs = await db.auditLog.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // 3. Enrich with Actor details
  const actorIds = Array.from(new Set(logs.map((log) => log.actorId)));
  const actors = await db.user.findMany({
    where: { id: { in: actorIds } },
    select: {
      id: true,
      fullName: true,
      email: true,
      globalRole: true,
    },
  });

  const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

  return logs.map((log) => ({
    ...log,
    actor: actorMap.get(log.actorId) || null,
  }));
}
