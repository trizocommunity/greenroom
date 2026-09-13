import "server-only";
import { eq } from "drizzle-orm";
import { getSessionFromHeaders } from "@/core/auth/session";
import { getStagePortalSessionFromCookie } from "@/core/auth/stage-portal-session";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  programme as programmeTable,
} from "@/core/database/schema";
import { verifyPairing } from "@/features/festivals/services/launch-pairing.service";

/**
 * Common authorization helpers for Issue 46 SSE routes.
 *
 * Three audiences per channel:
 *   - Greenroom admins (any role) — full access
 *   - Stage Portal users (judges) — access only via a valid
 *     `stagePortalSession` cookie, scoped to the programme/festival
 *     they're judging
 *   - Public (anonymous) — for public surfaces (announcer, results)
 *     on `(festivalPublic)` route groups; auth check passes if the
 *     festival is publicly enabled
 *
 * All helpers return `Response | null` — null means allow, Response is
 * the 401/403/404 to send back to the client.
 */

function jsonError(message: string, status: 401 | 403 | 404): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function requireAdminSession(
  req: Request,
): Promise<Response | null> {
  const session = await getSessionFromHeaders(req.headers);
  if (!session) return jsonError("UNAUTHORIZED", 401);
  return null;
}

export async function requireAdminOrStagePortal(
  req: Request,
  programmeId: string,
): Promise<Response | null> {
  const admin = await getSessionFromHeaders(req.headers);
  if (admin) return null;

  const stage = await getStagePortalSessionFromCookie();
  if (!stage) return jsonError("UNAUTHORIZED", 401);

  const programmeRow = await db.query.programme.findFirst({
    where: eq(programmeTable.id, programmeId),
    columns: { id: true, festivalId: true },
  });
  if (!programmeRow) return jsonError("PROGRAMME_NOT_FOUND", 404);

  if (stage.festivalId !== programmeRow.festivalId) {
    return jsonError("FORBIDDEN", 403);
  }
  return null;
}

export async function requirePublicFestivalEnabled(
  festivalId: string,
): Promise<Response | null> {
  const festivalRow = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { publicSiteEnabled: true, status: true },
  });
  if (!festivalRow) return jsonError("FESTIVAL_NOT_FOUND", 404);
  if (!festivalRow.publicSiteEnabled && festivalRow.status !== "EXPIRED") {
    return jsonError("FORBIDDEN", 403);
  }
  return null;
}

export async function requireSuperAdmin(
  req: Request,
): Promise<Response | null> {
  const session = await getSessionFromHeaders(req.headers);
  if (!session) return jsonError("UNAUTHORIZED", 401);
  if (session.role !== "SUPER_ADMIN") return jsonError("FORBIDDEN", 403);
  return null;
}

/**
 * Authenticate a launch-controller SSE connection. The token is supplied via
 * the `?token=` query parameter (the stage page embeds it in the URL, so the
 * browser cannot put it in a cookie). We accept either the canonical token
 * or the 6-digit pairing code — same Redis record either way.
 *
 * Returns `{ pairing, denied }`. Callers should use `denied` as the HTTP
 * response (401) and `pairing.festivalId` to scope the SSE channel.
 */
export async function requireLaunchPairing(req: Request): Promise<
  | {
      pairing: { festivalId: string; slug: string; name: string };
      denied: null;
    }
  | { pairing: null; denied: Response }
> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return { pairing: null, denied: jsonError("UNAUTHORIZED", 401) };
  }
  const record = await verifyPairing(token);
  if (!record) {
    return { pairing: null, denied: jsonError("UNAUTHORIZED", 401) };
  }
  return {
    pairing: {
      festivalId: record.festivalId,
      slug: record.slug,
      name: record.name,
    },
    denied: null,
  };
}
