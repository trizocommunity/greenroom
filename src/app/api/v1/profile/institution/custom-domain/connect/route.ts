import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { badRequest, createProtectedHandler, forbidden, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { user as usersTable } from "@/core/database/schema";
import { setInstitutionCustomDomainConnected } from "@/features/institutions/repositories/institution.repository";

const bodySchema = z.object({});

const handler = createProtectedHandler({
  async POST({ user: sessionUser }) {
    if (!sessionUser) {
      return badRequest("UNAUTHORIZED", "Not authenticated");
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
        "Only the institution owner can connect the custom domain",
      );
    }

    if (!user.institution.customDomain) {
      return badRequest("NO_DOMAIN", "Save a domain before connecting it");
    }

    const updated = await setInstitutionCustomDomainConnected(
      user.institutionId,
      true,
    );

    if (!updated) {
      return badRequest("NOT_FOUND", "Institution or custom domain not found");
    }

    return ok(updated);
  },
});

export const POST = handler;
