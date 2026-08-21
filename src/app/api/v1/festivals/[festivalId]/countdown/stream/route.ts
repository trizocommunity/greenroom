import { keys } from "@/core/redis/keys";
import { requirePublicFestivalEnabled } from "@/core/sse/auth-helpers";
import { sseHandler } from "@/core/sse/sse-handler";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ festivalId: string }> };

/**
 * UC16 — Live festival countdown. Server-side ticker publishes every
 * second in the final hour, every minute otherwise. The public
 * landing page subscribes to update the timer without client polling.
 *
 * Auth: festival must be publicly enabled (or expired).
 *
 * (Note: the actual ticker that publishes every minute/second is the
 * producer side, scheduled separately. This route is the consumer.)
 */
export const GET = sseHandler<Ctx>({
  channel: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return keys.festivalCountdown(festivalId);
  },
  auth: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return requirePublicFestivalEnabled(festivalId);
  },
});
