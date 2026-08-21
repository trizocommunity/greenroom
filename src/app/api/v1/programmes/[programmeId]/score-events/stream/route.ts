import { keys } from "@/core/redis/keys";
import { requireAdminOrStagePortal } from "@/core/sse/auth-helpers";
import { sseHandler } from "@/core/sse/sse-handler";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ programmeId: string }> };

/**
 * UC3 — Stage Portal live updates. Score submissions publish to
 * `greenroom:programme:{programmeId}:score-events`; judges on the same
 * programme and the announcer desk subscribe.
 *
 * Auth: Greenroom admin session OR a valid `stagePortalSession` cookie
 * scoped to this festival.
 */
export const GET = sseHandler<Ctx>({
  channel: async (_req, ctx) => {
    const { programmeId } = await ctx.params;
    return keys.programmeScoreEvents(programmeId);
  },
  auth: async (req, ctx) => {
    const { programmeId } = await ctx.params;
    return requireAdminOrStagePortal(req, programmeId);
  },
});
