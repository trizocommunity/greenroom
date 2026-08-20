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
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { createInstitution } from "@/features/institutions/repositories/institution.repository";

type InstitutionType = (typeof institutionType.enumValues)[number];

const personalOnboardingSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  userRole: z.string().min(1, "Please select a role"),
});

const institutionalOnboardingSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  userRole: z.string().min(1, "Please select a role"),
  institutionName: z
    .string()
    .min(2, "Institution name must be at least 2 characters"),
  institutionType: z.string().min(1, "Please select institution type"),
  affiliation: z.string().optional(),
  city: z.string().optional(),
  sizeRange: z.string().optional(),
});

export async function completePersonalOnboardingAction(
  data: z.infer<typeof personalOnboardingSchema>,
): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const parsed = personalOnboardingSchema.parse(data);

    await db
      .update(userTable)
      .set({
        fullName: parsed.fullName,
        displayName: parsed.displayName,
        accountType: "PERSONAL",
      })
      .where(eq(userTable.id, session.userId));

    revalidatePath("/profile");
    revalidatePath("/onboarding");

    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function completeInstitutionalOnboardingAction(
  data: z.infer<typeof institutionalOnboardingSchema>,
): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const parsed = institutionalOnboardingSchema.parse(data);

    const institution = await createInstitution({
      name: parsed.institutionName,
      type: parsed.institutionType as InstitutionType,
      affiliation: parsed.affiliation ?? null,
      city: parsed.city ?? null,
      sizeRange: parsed.sizeRange ?? null,
      ownerId: session.userId,
    });

    await db
      .update(userTable)
      .set({
        fullName: parsed.fullName,
        displayName: parsed.displayName,
        accountType: "INSTITUTIONAL",
        institutionId: institution.id,
      })
      .where(eq(userTable.id, session.userId));

    revalidatePath("/profile");
    revalidatePath("/onboarding");

    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}
