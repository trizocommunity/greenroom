import { keys } from "@/core/redis/keys";
import { requireAdminSession } from "@/core/sse/auth-helpers";
import { sseHandler } from "@/core/sse/sse-handler";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slotId: string }> };

/**
 * UC9 — Food-hall live scan counter. Every `foodHallEntry` write
 * publishes here; the food-entry dashboard subscribes.
 *
 * Auth: admin session only (volunteers use a separate UI path).
 */
export const GET = sseHandler<Ctx>({
  channel: async (_req, ctx) => {
    const { slotId } = await ctx.params;
    return keys.foodHallEvents(slotId);
  },
  auth: async (req) => requireAdminSession(req),
});
