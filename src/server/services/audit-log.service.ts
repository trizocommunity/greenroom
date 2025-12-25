import { prisma as db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

type AuditAction =
  | "DELETE_FESTIVAL"
  | "FREEZE_EDITION"
  | "Freeze_EDITION_ADMIN"
  | "UPDATE_USER"
  | "Delete_FESTIVAL_ADMIN";

type TargetType = "FESTIVAL" | "EDITION" | "USER" | "PAYMENT";

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

export async function getAuditLogs() {
  return await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
