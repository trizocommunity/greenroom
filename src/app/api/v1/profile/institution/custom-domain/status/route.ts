import "server-only";

import { eq } from "drizzle-orm";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { user as usersTable } from "@/core/database/schema";
import { syncCustomDomainStatus } from "@/features/institutions/services/custom-domain-provisioning.service";

/**
 * Current custom-domain lifecycle status for the caller's institution.
 *
 * Polled by Festival Live while TLS is provisioning. Reconciles
 * `httpsReadyAt` as a side effect, so the branded URLs the rest of the app
 * builds go live as soon as the certificate actually serves.
 *
 * Readable by any member of the institution — the docs give managers view
 * access to status and DNS instructions; only writes are owner-gated.
 */
const handler = createProtectedHandler({
  async GET({ user: sessionUser }) {
    if (!sessionUser) {
      return badRequest("UNAUTHORIZED", "Not authenticated");
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

    const status = await syncCustomDomainStatus(user.institutionId);
    return ok(status);
  },
});

export const GET = handler;
