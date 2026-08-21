import { keys } from "@/core/redis/keys";
import { requirePublicFestivalEnabled } from "@/core/sse/auth-helpers";
import { sseHandler } from "@/core/sse/sse-handler";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ festivalId: string }> };

/**
 * UC6 — Live announcement sequence. The announcer desk publishes here
 * when it advances to a new programme; public screens and other staff
 * displays subscribe.
 *
 * Auth: festival must have `publicSiteEnabled = true` (or be expired —
 * expired festivals keep public access for historical results).
 */
export const GET = sseHandler<Ctx>({
  channel: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return keys.festivalAnnounce(festivalId);
  },
  auth: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return requirePublicFestivalEnabled(festivalId);
  },
});
