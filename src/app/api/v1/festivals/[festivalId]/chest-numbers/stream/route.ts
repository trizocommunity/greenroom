import { keys } from "@/core/redis/keys";
import { requireAdminSession } from "@/core/sse/auth-helpers";
import { sseHandler } from "@/core/sse/sse-handler";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ festivalId: string }> };

/**
 * UC14 — Live chest-number assignment. Every `assignChestNumbers`
 * write publishes here; the chest-numbers dashboard subscribes so
 * multiple admins don't collide on the same range.
 *
 * Auth: admin session.
 */
export const GET = sseHandler<Ctx>({
  channel: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return keys.festivalChestNumbers(festivalId);
  },
  auth: async (req) => requireAdminSession(req),
});
