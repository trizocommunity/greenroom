import { keys } from "@/core/redis/keys";
import { requireAdminSession } from "@/core/sse/auth-helpers";
import { sseHandler } from "@/core/sse/sse-handler";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

/**
 * Live checkpoint scan feed. Every `checkpointScan` write publishes here; the
 * session drawer subscribes so the operator sees scans land in near-real-time.
 *
 * Auth: admin session (any festival role). A 30s polling fallback in the
 * client covers connections that can't hold the stream open.
 */
export const GET = sseHandler<Ctx>({
  channel: async (_req, ctx) => {
    const { sessionId } = await ctx.params;
    return keys.checkpointEvents(sessionId);
  },
  auth: async (req) => requireAdminSession(req),
});
