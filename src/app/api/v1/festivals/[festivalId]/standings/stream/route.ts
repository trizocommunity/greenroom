import { keys } from "@/core/redis/keys";
import { requirePublicFestivalEnabled } from "@/core/sse/auth-helpers";
import { sseHandler } from "@/core/sse/sse-handler";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ festivalId: string }> };

/**
 * UC7 — Live team standings. Result publish publishes here; the public
 * landing page and dashboard top-scorers page subscribe.
 *
 * Auth: festival must be publicly enabled (or expired).
 */
export const GET = sseHandler<Ctx>({
  channel: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return keys.festivalStandings(festivalId);
  },
  auth: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return requirePublicFestivalEnabled(festivalId);
  },
});
