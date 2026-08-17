import { desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { auditLog, user as users } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { getRedis } from "@/core/redis/client";
import { keys } from "@/core/redis/keys";

/**
 * Audit log actions. Exported so other modules (e.g. Better Auth
 * `after` hooks in `src/core/auth/better-auth/auth.ts`) can pass typed
 * values into `createAuditLog`.
 */
export type AuditAction =
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
  | "UPGRADE_TO_INSTITUTIONAL"
  | "PASSWORD_RESET"
  | "CREATE_PROGRAMME"
  | "UPDATE_PROGRAMME"
  | "DELETE_PROGRAMME"
  | "ASSIGN_PARTICIPANTS"
  | "REMOVE_ASSIGNMENT"
  | "APPOINT_TEAM_LEAD"
  | "REPLACE_TEAM_LEAD"
  | "REMOVE_TEAM_LEAD"
  | "OPEN_REPORTING"
  | "CLOSE_REPORTING"
  | "MARK_REPORTED"
  | "ISSUE_CODE_LETTER"
  | "SUBMIT_JUDGE_SCORES"
  | "START_JUDGEMENT"
  | "CANCEL_JUDGEMENT"
  | "JUDGEMENT_AUTO_ASSIGN_OFF_STAGE"
  | "MARK_ABSENT"
  | "SAVE_RESULT"
  | "PUBLISH_RESULTS"
  | "ANNOUNCE_RESULTS"
  | "EXPIRE_FESTIVAL"
  | "REPLACE_FESTIVAL_LIFECYCLE"
  | "SIGN_IN_MAGIC_LINK"
  | "SIGN_IN_EMAIL_OTP"
  | "SIGN_IN_GOOGLE"
  | "LINK_GOOGLE_ACCOUNT"
  | "ENABLE_2FA"
  | "DISABLE_2FA"
  | "VERIFY_2FA"
  | "REGENERATE_BACKUP_CODES"
  | "CREATE_GENERAL_ENTRY_CATEGORY"
  | "UPDATE_GENERAL_ENTRY_CATEGORY"
  | "DELETE_GENERAL_ENTRY_CATEGORY"
  | "CREATE_GENERAL_ENTRY"
  | "UPDATE_GENERAL_ENTRY"
  | "DELETE_GENERAL_ENTRY"
  | "PUBLISH_GENERAL_ENTRY"
  | "UNPUBLISH_GENERAL_ENTRY";

type TargetType =
  | "FESTIVAL"
  | "USER"
  | "PAYMENT"
  | "PROGRAMME"
  | "PROGRAMME_ASSIGNMENT"
  | "PROGRAMME_TEAM_LEAD"
  | "REPORTING_SESSION"
  | "JUDGEMENT_SCORE"
  | "RESULT"
  | "GENERAL_ENTRY"
  | "GENERAL_ENTRY_CATEGORY";

/** Burst window — identical (actor, action, targetType, targetId) within
 *  this many ms collapse into a single audit row. */
const AUDIT_DEDUP_WINDOW_MS = 10_000;

/**
 * Identifies the actor for contexts with no admin session cookie — the
 * team-leader OTP portal (participant session, no `user` row) and judge
 * score submission (link-token + judgeId, no session at all). `actorId` is
 * a free-text column (no FK), so a participant/judge id is valid here.
 */
interface ActorOverride {
  actorId: string;
  actorRole: string;
}

interface CreateAuditLogParams {
  action: AuditAction;
  targetType: TargetType;
  targetId: string;
  metadata?: Record<string, unknown>;
  /** Bypass the getSession() lookup for non-admin-session callers. */
  actor?: ActorOverride;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  let actorId: string;
  let actorRole: string;

  if (params.actor) {
    actorId = params.actor.actorId;
    actorRole = params.actor.actorRole;
  } else {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }
    actorId = session.userId;
    actorRole = session.role;
  }

  // Dedupe bursty repeats: same actor + action + target within 10s collapse
  // into a single row. Redis counter is the fast path; DB stays authoritative.
  // Falls open to the DB on Redis failure — losing dedup briefly is better
  // than 500'ing audit writes during an incident.
  const dedupKey = keys.auditDedup(
    actorId,
    `${params.action}:${params.targetType}:${params.targetId}`,
  );
  try {
    const results = (await getRedis()
      .multi()
      .incr(dedupKey)
      .pexpire(dedupKey, AUDIT_DEDUP_WINDOW_MS, "NX")
      .exec()) as Array<[Error | null, number]>;
    const count = results[0]?.[1] ?? 1;
    if (count > 1) {
      return null;
    }
  } catch (err) {
    console.warn(
      "[audit-log] dedup fail-open (Redis unavailable):",
      err instanceof Error ? err.message : err,
    );
  }

  const { randomUUID } = await import("crypto");
  const result = await db
    .insert(auditLog)
    .values({
      id: randomUUID(),
      actorId,
      actorRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata || {},
    })
    .returning();

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
          ilike(users.displayName ?? "", `%${search}%`),
        ),
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
          ilike(auditLog.actorRole, `%${search}%`),
        ),
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
  const actors =
    actorIds.length > 0
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            globalRole: users.globalRole,
          })
          .from(users)
          .where(inArray(users.id, actorIds))
      : [];

  const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

  return logs.map((log) => ({
    ...log,
    actor: actorMap.get(log.actorId) || null,
  }));
}
