import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  ok,
  unauthorized,
} from "@/api/lib";
import { publish } from "@/core/pubsub/redis-pubsub";
import { keys } from "@/core/redis/keys";
import {
  claimLaunchTrigger,
  verifyPairing,
} from "@/features/festivals/services/launch-pairing.service";

/**
 * POST /api/v1/festivals/:festivalId/launch-control/trigger
 *
 * Stage-controller trigger. Authenticated by the pairing token sent in
 * the request body (URL would also work, but body keeps the token out of
 * the access log and HTTP_REFERER on the stage browser).
 *
 * The trigger does NOT itself flip `publicSiteEnabled` — that mutation
 * runs on the display laptop (which has admin auth) when it receives the
 * LAUNCH event over SSE. Splitting "press detected" from "mutate DB" this
 * way means a leaked pairing token still cannot write to the database
 * unauthenticated; it can only request that an authenticated operator
 * launch.
 *
 * Guard order:
 *   1. Body shape + token presence
 *   2. verifyPairing (Redis) — also re-checks expiry
 *   3. festivalId binding (token-for-A cannot trigger festival-B)
 *   4. claimLaunchTrigger (Redis SETNX) — duplicate-launch guard
 *   5. publish LAUNCH on the festival's launch-control channel
 *
 * A failed guard at any step leaves the channel silent and the display
 * unaffected. The display never sees anything it shouldn't have.
 */
export const POST = async (
  req: Request,
  { params }: { params: Promise<{ festivalId: string }> },
) => {
  const { festivalId } = await params;

  let body: { token?: unknown };
  try {
    body = (await req.json()) as { token?: unknown };
  } catch {
    return badRequest("INVALID_BODY", "Body must be JSON");
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return badRequest("MISSING_TOKEN", "Pairing token is required");
  }

  const pairing = await verifyPairing(token);
  if (!pairing) return unauthorized("Pairing expired or invalid");

  if (pairing.festivalId !== festivalId) {
    return forbidden("Pairing is not bound to this festival");
  }

  const claimed = await claimLaunchTrigger(festivalId);
  if (!claimed) {
    return conflict(
      "ALREADY_LAUNCHED",
      "This festival has already been launched in the current window. Reset from the dashboard to re-arm.",
    );
  }

  // `claimLaunchTrigger` already placed the guard, so any duplicate event
  // reaching the channel this round will be ignored by the display. The
  // display also has its own `enabled` flag as a second guard.
  //
  // The payload carries the path-URL the stage controller should mirror
  // in its iframe. We use the same `/{slug}` shape the operator's
  // preview iframe uses — Vercel/custom-domain DNS rewrites the path
  // URL to the branded host for end visitors, but the stage device is
  // on a separate network anyway and `?remote=1` makes the public layout
  // render in passive mode.
  await publish(keys.festivalLaunchControl(festivalId), {
    type: "LAUNCH",
    at: Date.now(),
    source: "stage-controller",
    publicUrl: `/${pairing.slug}?remote=1`,
  });

  return ok({ accepted: true });
};