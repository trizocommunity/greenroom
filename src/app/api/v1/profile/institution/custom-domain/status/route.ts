import "server-only";

import { eq } from "drizzle-orm";
import { badRequest, createProtectedHandler, forbidden, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { user as usersTable } from "@/core/database/schema";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { syncFestivalDomainStatus } from "@/features/institutions/services/custom-domain-provisioning.service";

/**
 * Current custom-domain lifecycle status for one festival.
 *
 * Takes `?festivalId=` because TLS readiness is per festival, not per
 * institution: each branded host is attached to Vercel on its own and certified
 * over HTTP-01, so two festivals under the same verified apex can be in
 * different phases.
 *
 * Polled by Festival Live while TLS is provisioning. Reconciles
 * `festival.domainHttpsReadyAt` as a side effect — and attaches the host if it
 * isn't attached yet — so the branded URLs the rest of the app builds go live as
 * soon as the certificate actually serves. That lazy attach is also what
 * backfills festivals published before their apex was verified.
 *
 * Readable by any member of the institution — the docs give managers view
 * access to status and DNS instructions; only writes are owner-gated.
 */
const handler = createProtectedHandler({
  async GET({ user: sessionUser, request }) {
    if (!sessionUser) {
      return badRequest("UNAUTHORIZED", "Not authenticated");
    }

    const festivalId = new URL(request.url).searchParams
      .get("festivalId")
      ?.trim();
    if (!festivalId) {
      return badRequest("MISSING_FESTIVAL_ID", "festivalId is required");
    }

    const user = await db.query.user.findFirst({
      where: eq(usersTable.id, sessionUser.userId),
      columns: { institutionId: true },
    });

    if (!user?.institutionId) {
      return badRequest(
        "NOT_INSTITUTIONAL",
        "User does not have an institution",
      );
    }

    // The festival must belong to the caller's own institution: the response
    // carries that institution's DNS records and verification state.
    const festival = await findFestivalById(festivalId);
    if (!festival || festival.institutionId !== user.institutionId) {
      return forbidden();
    }

    const status = await syncFestivalDomainStatus(festivalId);
    return ok(status);
  },
});

export const GET = handler;
