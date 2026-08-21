import { keys } from "@/core/redis/keys";
import { requireAdminSession } from "@/core/sse/auth-helpers";
import { sseHandler } from "@/core/sse/sse-handler";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ festivalId: string }> };

/**
 * UC15 — Programme scheduling conflict warnings. Every `schedule_entry`
 * write publishes here; other connected admins re-run conflict checks
 * client-side.
 *
 * Auth: admin session.
 */
export const GET = sseHandler<Ctx>({
  channel: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return keys.festivalSchedule(festivalId);
  },
  auth: async (req) => requireAdminSession(req),
});
