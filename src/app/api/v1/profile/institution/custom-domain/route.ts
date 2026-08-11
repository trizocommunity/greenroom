import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { badRequest, createProtectedHandler, forbidden, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import {
  festival as festivals,
  user as usersTable,
} from "@/core/database/schema";
import {
  isValidCustomDomainShape,
  normalizeCustomDomain,
} from "@/features/institutions/lib/custom-domain";
import {
  findInstitutionById,
  updateInstitutionCustomDomain,
} from "@/features/institutions/repositories/institution.repository";
import { detachAllFestivalsForApex } from "@/features/institutions/services/custom-domain-provisioning.service";
import { isEnabled } from "@/features/plan-features/services/feature-gate";

const bodySchema = z.object({
  customDomain: z.string().nullable(),
  /** Festival context — used for customDomain feature gate when setting a domain. */
  festivalId: z.string().optional(),
});

const handler = createProtectedHandler({
  async PUT({ user: sessionUser, request }) {
    if (!sessionUser) {
      return badRequest("UNAUTHORIZED", "Not authenticated");
    }

    const raw = await request.json();
    const data = raw.data ?? raw;
    const parsed = bodySchema.safeParse(data);
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
        "Only the institution owner can change the custom domain",
      );
    }

    let nextDomain: string | null = parsed.data.customDomain;
    if (nextDomain !== null) {
      nextDomain = normalizeCustomDomain(nextDomain);
      if (!nextDomain || !isValidCustomDomainShape(nextDomain)) {
        return badRequest(
          "INVALID_DOMAIN",
          "Enter a valid apex domain (e.g. ahlussuffa.in)",
        );
      }

      // Plan feature gate: features.customDomain (PRO)
      let festivalOk = false;
      if (parsed.data.festivalId) {
        const fest = await db.query.festival.findFirst({
          where: eq(festivals.id, parsed.data.festivalId),
          columns: { id: true, tier: true, institutionId: true },
        });
        festivalOk =
          !!fest &&
          fest.institutionId === user.institutionId &&
          isEnabled(fest.tier, "customDomain");
      } else {
        const all = await db.query.festival.findMany({
          where: eq(festivals.institutionId, user.institutionId),
          columns: { tier: true },
        });
        festivalOk = all.some((f) => isEnabled(f.tier, "customDomain"));
      }

      if (!festivalOk) {
        return forbidden(
          "Custom domains require a plan with the Custom Domain feature",
        );
      }
    }

    try {
      const { institution: updated, previousDomain } =
        await updateInstitutionCustomDomain({
          institutionId: user.institutionId,
          customDomain: nextDomain,
        });

      // Release every branded host under the old apex so it can be claimed
      // elsewhere — each festival had its own domain on Vercel, so there is no
      // single wildcard to drop. Best-effort by design: the domain change has
      // already been persisted.
      if (previousDomain) {
        await detachAllFestivalsForApex(user.institutionId, previousDomain);
      }

      const fresh = await findInstitutionById(user.institutionId);
      return ok(fresh ?? updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      if (message.includes("unique") || message.includes("duplicate")) {
        return badRequest(
          "DOMAIN_TAKEN",
          "That domain is already linked to another institution",
        );
      }
      return badRequest("UPDATE_FAILED", message);
    }
  },
});

export const PUT = handler;
