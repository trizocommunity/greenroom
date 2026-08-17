import { keys } from "@/core/redis/keys";
import { requirePublicFestivalEnabled } from "@/core/sse/auth-helpers";
import { sseHandler } from "@/core/sse/sse-handler";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ festivalId: string }> };

/**
 * UC17 — Live results counter. Every `announceResult` publishes here;
 * the public results page subscribes to update "47 results announced
 * today" without polling.
 *
 * Auth: festival must be publicly enabled (or expired).
 */
export const GET = sseHandler<Ctx>({
  channel: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return keys.festivalResultsCount(festivalId);
  },
  auth: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return requirePublicFestivalEnabled(festivalId);
  },
});
