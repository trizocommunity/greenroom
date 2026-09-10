import "server-only";
import { getSessionFromHeaders } from "@/core/auth/session";
import { publish } from "@/core/pubsub/redis-pubsub";
import { keys } from "@/core/redis/keys";
import { sseHandler } from "@/core/sse/sse-handler";
import {
  releaseLaunchTrigger,
  verifyPairing,
} from "@/features/festivals/services/launch-pairing.service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ festivalId: string }> };

/**
 * SSE channel for the launch-control surface. Two audiences share the
 * same channel:
 *
 *   - Display laptop (admin cookie): receives LAUNCH events and runs
 *     the local `handleLaunch()` choreography.
 *   - Stage device (?token=): receives RESET events so the controller
 *     re-arms when the operator takes the festival offline. Also
 *     receives LAUNCH so the controller can disable its Space-key
 *     handler and show "Launched" state.
 *
 * The auth callback runs once per connection: admin OR token, and the
 * token (when used) must be bound to the festival in the URL. Each
 * subscriber gets its own Redis duplicate so a slow display doesn't
 * block the stage and vice versa.
 */
export const GET = sseHandler<Ctx>({
  channel: async (_req, ctx) => {
    const { festivalId } = await ctx.params;
    return keys.festivalLaunchControl(festivalId);
  },
  auth: async (req, ctx) => {
    const { festivalId } = await ctx.params;
    // Fast path for stage controllers — check the pairing token first
    // and skip `getSessionFromHeaders` (Better Auth's session lookup
    // can be slow or hang on anonymous requests from a fresh device,
    // which leaves the SSE in `pending` and the stage controller's
    // pill stuck on "Reconnecting…"). Only fall back to the admin
    // session check when no token is supplied (the display laptop).
    const url = new URL(req.url);
    const token = url.searchParams.get("token")?.trim() ?? "";
    if (token) {
      const pairing = await verifyPairing(token);
      if (pairing && pairing.festivalId === festivalId) {
        return null;
      }
      return unauthorizedResponse();
    }

    const admin = await getSessionFromHeaders(req.headers);
    if (admin) return null;
    return unauthorizedResponse();
  },
});

/**
 * POST /api/v1/festivals/:festivalId/launch-control/stream
 *
 * Admin-only side-band used by the dashboard to publish RESET (re-arm)
 * and clear the idempotency guard when the operator takes the festival
 * offline or wants to re-fire. Without this, the SETNX guard would
 * hold for 10 minutes after the first successful launch and the stage
 * controller would always get 409 on the second try.
 */
export const POST = async (
  req: Request,
  { params }: { params: Promise<{ festivalId: string }> },
) => {
  const session = await getSessionFromHeaders(req.headers);
  if (!session?.userId) return unauthorizedResponse();

  const { festivalId } = await params;

  let body: { action?: unknown };
  try {
    body = (await req.json()) as { action?: unknown };
  } catch {
    return jsonResponse(400, { error: "INVALID_BODY" });
  }

  if (body.action === "reset") {
    await releaseLaunchTrigger(festivalId);
    await publish(keys.festivalLaunchControl(festivalId), {
      type: "RESET",
      at: Date.now(),
    });
    return jsonResponse(200, { ok: true });
  }

  return jsonResponse(400, { error: "UNKNOWN_ACTION" });
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthorizedResponse(): Response {
  return jsonResponse(401, { error: "UNAUTHORIZED" });
}