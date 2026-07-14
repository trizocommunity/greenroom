"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
import { createInstitution } from "@/features/institution/repositories/institution.repository";

type InstitutionType = (typeof institutionType.enumValues)[number];

export async function completePersonalOnboardingAction(data: {
  fullName: string;
  displayName: string;
  userRole: string;
}): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    await db
      .update(userTable)
      .set({
        fullName: data.fullName,
        displayName: data.displayName,
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

export async function completeInstitutionalOnboardingAction(data: {
  fullName: string;
  displayName: string;
  userRole: string;
  institutionName: string;
  institutionType: InstitutionType;
  affiliation?: string | null;
  city?: string | null;
  sizeRange?: string | null;
}): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const institution = await createInstitution({
      name: data.institutionName,
      type: data.institutionType,
      affiliation: data.affiliation ?? null,
      city: data.city ?? null,
      sizeRange: data.sizeRange ?? null,
      ownerId: session.userId,
    });

    await db
      .update(userTable)
      .set({
        fullName: data.fullName,
        displayName: data.displayName,
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
