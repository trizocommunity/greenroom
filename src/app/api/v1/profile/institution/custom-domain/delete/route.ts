import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { badRequest, createProtectedHandler, forbidden, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { user as usersTable } from "@/core/database/schema";
import {
  deleteInstitutionCustomDomain,
  findInstitutionById,
} from "@/features/institutions/repositories/institution.repository";
import { detachAllFestivalsForApex } from "@/features/institutions/services/custom-domain-provisioning.service";

const bodySchema = z.object({
  /** Caller types the apex into the confirmation dialog. Must match exactly. */
  apexConfirmation: z.string().min(1),
});

const handler = createProtectedHandler({
  async DELETE({ user: sessionUser, request }) {
    if (!sessionUser) {
      return badRequest("UNAUTHORIZED", "Not authenticated");
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw.data ?? raw);
    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const user = await db.query.user.findFirst({
      where: eq(usersTable.id, sessionUser.userId),
      with: { institution: true },
    });

    if (!user?.institutionId || !user.institution) {
      return badRequest(
        "NOT_INSTITUTIONAL",
        "User does not have an institution",
      );
    }

    if (user.institution.ownerId !== sessionUser.userId) {
      return forbidden(
        "Only the institution owner can delete the custom domain",
      );
    }

    if (!user.institution.customDomain) {
      return badRequest("NO_DOMAIN", "No custom domain is configured");
    }

    // Confirmation: caller must type the apex exactly. Comparison is
    // case-insensitive and whitespace-trimmed — same normalization we apply
    // on save — so a copy-paste from the UI matches reliably.
    const typed = parsed.data.apexConfirmation.trim().toLowerCase();
    const actual = user.institution.customDomain.trim().toLowerCase();
    if (typed !== actual) {
      return badRequest(
        "CONFIRMATION_MISMATCH",
        "Type the apex domain exactly to confirm",
      );
    }

    const { previousDomain } = await deleteInstitutionCustomDomain(
      user.institutionId,
    );

    if (previousDomain) {
      // Release every branded host on Vercel. Detach is best-effort by
      // contract — the row is already gone, so even if Vercel is unreachable
      // the domain is reset in our DB.
      await detachAllFestivalsForApex(user.institutionId, previousDomain);
    }

    const fresh = await findInstitutionById(user.institutionId);
    return ok(fresh);
  },
});

export const DELETE = handler;
