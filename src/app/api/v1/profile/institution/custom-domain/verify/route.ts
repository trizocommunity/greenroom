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
  findInstitutionById,
  markInstitutionDomainVerified,
} from "@/features/institutions/repositories/institution.repository";
import {
  attachPublishedFestivalsForInstitution,
  syncFestivalDomainStatus,
} from "@/features/institutions/services/custom-domain-provisioning.service";
import { verifyCustomDomainDns } from "@/features/institutions/services/custom-domain-verify.service";
import { isEnabled } from "@/features/plan-features/services/feature-gate";

const bodySchema = z.object({
  festivalId: z.string().optional(),
});

const handler = createProtectedHandler({
  async POST({ user: sessionUser, request }) {
    if (!sessionUser) {
      return badRequest("UNAUTHORIZED", "Not authenticated");
    }

    const raw = await request.json().catch(() => ({}));
    const data = (raw as { data?: unknown }).data ?? raw;
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
        "Only the institution owner can verify the custom domain",
      );
    }

    if (!user.institution.customDomain) {
      return badRequest("NO_DOMAIN", "Save a custom domain before verifying");
    }

    // Plan feature gate: features.customDomain (PRO)
    let festivalOk = false;
    if (parsed.data.festivalId) {
      const fest = await db.query.festival.findFirst({
        where: eq(festivals.id, parsed.data.festivalId),
        columns: { institutionId: true, tier: true },
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

    const dns = await verifyCustomDomainDns({
      customDomain: user.institution.customDomain,
      institutionId: user.institutionId,
    });

    if (!dns.ok) {
      return Response.json(
        {
          success: false,
          error: {
            code: "DNS_VERIFY_FAILED",
            message: dns.details.join("; "),
            missing: dns.missing,
            details: dns.details,
          },
        },
        { status: 400 },
      );
    }

    const updated = await markInstitutionDomainVerified(user.institutionId);

    // DNS proves ownership of the apex, but certificates are issued per host,
    // so verification alone attaches nothing. Start every published festival's
    // host now. Attach failures surface through the status payload rather than
    // throwing — verification itself succeeded and must not be rolled back.
    await attachPublishedFestivalsForInstitution(user.institutionId);

    const status = parsed.data.festivalId
      ? await syncFestivalDomainStatus(parsed.data.festivalId)
      : null;
    const fresh = await findInstitutionById(user.institutionId);

    return ok({ ...(fresh ?? updated), status });
  },
});

export const POST = handler;
