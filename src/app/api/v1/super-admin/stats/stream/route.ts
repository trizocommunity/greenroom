import { keys } from "@/core/redis/keys";
import { requireSuperAdmin } from "@/core/sse/auth-helpers";
import { sseHandler } from "@/core/sse/sse-handler";

export const dynamic = "force-dynamic";

/**
 * UC13 — Live platform stats (Super Admin). Every festival create,
 * payment received, support ticket opened pushes a delta here; the
 * `/super-admin/analytics` page subscribes.
 *
 * Auth: SUPER_ADMIN only.
 */
export const GET = sseHandler({
  channel: keys.superAdminStats(),
  auth: async (req) => requireSuperAdmin(req),
});
