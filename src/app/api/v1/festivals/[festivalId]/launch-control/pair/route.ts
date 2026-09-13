import { eq } from "drizzle-orm";
import { ok, unauthorized } from "@/api/lib";
import { getAppBaseUrl } from "@/config/routes";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { mintPairing } from "@/features/festivals/services/launch-pairing.service";

/**
 * POST /api/v1/festivals/:festivalId/launch-control/pair
 *
 * Operator-only. Idempotent get-or-create for the festival's active
 * pairing: returns the existing pairing if one is still alive, mints a
 * fresh one if missing.
 *
 * Body `{ rotate: true }` forces a fresh mint and invalidates the
 * previous token — used by the operator's "Rotate" button when a URL
 * has leaked or staff has changed.
 *
 * The token is bound to the festivalId at mint time, so a leaked URL
 * cannot be redirected at a different festival's launch surface — the
 * trigger and SSE routes re-check the binding before honouring it.
 */
export const POST = async (
  req: Request,
  { params }: { params: Promise<{ festivalId: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { festivalId } = await params;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { id: true, slug: true, ownerId: true },
  });
  if (!festival) return unauthorized();

  const isSuperAdmin = session.role === "SUPER_ADMIN";
  if (festival.ownerId !== session.userId && !isSuperAdmin) {
    return unauthorized();
  }

  // Body is optional. Empty body or invalid JSON just means "no rotate".
  let rotate = false;
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text) as { rotate?: unknown };
      rotate = body.rotate === true;
    }
  } catch {
    return unauthorized();
  }

  const minted = await mintPairing({
    festivalId: festival.id,
    mintedBy: session.userId,
    rotate,
  });
  if (!minted) return unauthorized();

  const base = getAppBaseUrl().replace(/\/$/, "");
  const url = `${base}/festival-launch/${minted.token}`;

  return ok({
    token: minted.token,
    code: minted.code,
    url,
    expiresAt: new Date(minted.expiresAt).toISOString(),
    festival: {
      id: festival.id,
      slug: festival.slug,
    },
  });
};
