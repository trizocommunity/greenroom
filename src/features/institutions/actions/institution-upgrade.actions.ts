"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  type institutionType,
  user as userTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import {
  createInstitution,
  findInstitutionByOwnerId,
} from "@/features/institutions/repositories/institution.repository";
import { linkOwnedFestivalsToInstitution } from "@/features/institutions/services/festival-institution-link.service";

type InstitutionType = (typeof institutionType.enumValues)[number];

/**
 * Same field set as `institutionalOnboardingSchema` minus the profile fields —
 * this converts an account that already has a name and display name.
 */
const upgradeToInstitutionalSchema = z.object({
  institutionName: z
    .string()
    .min(2, "Institution name must be at least 2 characters"),
  institutionType: z.string().min(1, "Please select institution type"),
  affiliation: z.string().optional(),
  city: z.string().optional(),
  sizeRange: z.string().optional(),
});

export type UpgradeToInstitutionalInput = z.infer<
  typeof upgradeToInstitutionalSchema
>;

export type UpgradeToInstitutionalResult = {
  institutionId: string;
  /** Festivals adopted by the new institution — surfaced in the success toast. */
  linkedFestivals: number;
};

/**
 * Convert a PERSONAL account to INSTITUTIONAL.
 *
 * Custom domains hang off `institution`, and the domain UI/API gate on
 * `festival.institutionId`. A personal account has neither, so this is the only
 * route to a branded host for someone who onboarded personally.
 *
 * All three writes are one transaction — a half-applied upgrade (institution
 * created but the user never pointed at it, or the user converted but their
 * festivals left unlinked) is exactly the split state that caused the original
 * custom-domain bug.
 */
export async function upgradeToInstitutionalAction(
  input: UpgradeToInstitutionalInput,
): Promise<ActionResponse<UpgradeToInstitutionalResult>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const parsed = upgradeToInstitutionalSchema.parse(input);

    const existing = await db.query.user.findFirst({
      where: eq(userTable.id, session.userId),
      columns: { accountType: true, institutionId: true },
    });

    if (!existing) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    }

    if (existing.accountType === "INSTITUTIONAL" && existing.institutionId) {
      throw new AppError(
        "This account is already institutional. Edit your institution from Settings instead.",
      );
    }

    const result = await db.transaction(async (tx) => {
      // `institution_ownerId_key` allows one institution per owner. A row can
      // already exist if a previous attempt failed after the insert, or if the
      // user row lost its pointer — adopt it rather than 500 on the unique index.
      const orphaned = await findInstitutionByOwnerId(session.userId, tx);

      const institution =
        orphaned ??
        (await createInstitution(
          {
            name: parsed.institutionName,
            type: parsed.institutionType as InstitutionType,
            affiliation: parsed.affiliation || null,
            city: parsed.city || null,
            sizeRange: parsed.sizeRange || null,
            ownerId: session.userId,
          },
          tx,
        ));

      await tx
        .update(userTable)
        .set({
          accountType: "INSTITUTIONAL",
          institutionId: institution.id,
          updatedAt: serverNowIso(),
        })
        .where(eq(userTable.id, session.userId));

      // Festivals created while the account was personal have a NULL
      // institutionId. Without this they stay non-institutional forever and the
      // custom-domain section never appears for them.
      const linkedFestivals = await linkOwnedFestivalsToInstitution(
        { ownerId: session.userId, institutionId: institution.id },
        tx,
      );

      return { institutionId: institution.id, linkedFestivals };
    });

    await createAuditLog({
      action: "UPGRADE_TO_INSTITUTIONAL",
      targetType: "USER",
      targetId: session.userId,
      metadata: {
        institutionId: result.institutionId,
        linkedFestivals: result.linkedFestivals,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return { success: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}
