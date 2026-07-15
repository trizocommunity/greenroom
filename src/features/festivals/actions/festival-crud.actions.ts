"use server";

import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { TIER_CONFIG } from "@/config/pricing";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  auditLog as auditLogTable,
  festival as festivalTable,
  festivalMember as memberTable,
  payment as paymentTable,
} from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import {
  type CreateFestivalInput,
  createFestivalSchema,
} from "@/features/festivals/schemas/festival.schema";
import { assertFestivalMutationAllowed } from "@/features/festivals/services/festival-lifecycle-policy.service";
import { validatePublicSiteRequirements } from "@/features/festivals/services/festival-public-validation.service";
import { StorageUsageService } from "@/features/festivals/services/storage-usage.service";
import { UsageCounterService } from "@/features/festivals/services/usage-counter.service";

export async function createFestival(input: CreateFestivalInput) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // 1. Validate Input
    const data = createFestivalSchema.parse(input);

    // 2. Validate Payment
    const payment = await db.query.payment.findFirst({
      where: and(
        eq(paymentTable.id, data.paymentId),
        eq(paymentTable.userId, session.userId),
      ),
    });

    if (!payment || payment.status !== "PAID" || payment.used) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_INVALID);
    }

    // Payment Purpose Check
    if (payment.purpose !== "FESTIVAL_CREATION") {
      throw new AppError(ERROR_MESSAGES.PAYMENT_PURPOSE_MISMATCH);
    }

    // Resolve Tier (Default to BASIC if missing)
    const tier = (payment.tier || "BASIC") as "BASIC" | "STANDARD" | "PRO";
    const tierConfig = TIER_CONFIG[tier];

    // Validate date range doesn't exceed plan duration
    if (data.startDate && data.endDate) {
      const diffDays = Math.ceil(
        (data.endDate.getTime() - data.startDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (diffDays > tierConfig.durationDays) {
        return {
          success: false,
          error: `Your ${tier} plan allows a maximum festival duration of ${tierConfig.durationDays} days. Please adjust your dates.`,
        } as any;
      }
    }

    // 3. Atomic Transaction
    const expiresAt =
      payment.validUntil ??
      (() => {
        const base = payment.createdAt
          ? new Date(payment.createdAt)
          : new Date();
        const days = tierConfig.durationDays || 40;
        const d = new Date(base);
        d.setDate(d.getDate() + days);
        return d.toISOString();
      })();

    const result = await db.transaction(async (tx) => {
      // Create Festival
      const finalSlug = (
        data.festivalSlug ||
        data.festivalName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      ).slice(0, 50);

      const festivalId = randomUUID();
      const now = new Date().toISOString();

      const [festival] = await tx
        .insert(festivalTable)
        .values({
          id: festivalId,
          name: data.festivalName,
          slug: finalSlug,
          institutionType: (data.institutionType as any) || "OTHER",
          institutionName: data.institutionName,
          location: data.location,
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          ownerId: session.userId,
          status: "ONGOING",
          expiresAt,
          isLocked: false,
          tier: tier,
          tierLabel: tierConfig?.label || "Standard",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Create Admin Member
      await tx.insert(memberTable).values({
        id: randomUUID(),
        festivalId: festival.id,
        userId: session.userId,
        role: "ADMIN",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Mark Payment Used
      await tx
        .update(paymentTable)
        .set({
          used: true,
          festivalId: festival.id,
          updatedAt: now,
        })
        .where(eq(paymentTable.id, payment.id));

      return festival;
    });

    await createAuditLog({
      action: "CREATE_FESTIVAL",
      targetType: "FESTIVAL",
      targetId: result.id,
      metadata: { name: result.name, tier: result.tier },
    });

    revalidatePath("/profile");
    revalidatePath("/festivals");

    return { success: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateFestivalSettingsAction(
  festivalId: string,
  data: {
    programmeAssignmentDeadline?: string | null;
    studentCreationDeadline?: string | null;
    teamLeaderLimit?: number;
    announcerResultsPerStandings?: number;
    startDate?: string | null;
    endDate?: string | null;
    scoringSystem?: "POSITION_BASED" | "SCORE_BASED" | null;
    publicDisplayMode?: "programme_results" | "team_standings" | null;
    chestNumberSettings?: {
      autoGenerate?: boolean;
      prefix?: string;
      padding?: number;
    } | null;
  },
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Check ADMIN
    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      with: {
        festivalMembers: {
          where: and(
            eq(memberTable.userId, session.userId),
            eq(memberTable.role, "ADMIN"),
          ),
        },
      },
    });

    const isAdmin =
      festival?.festivalMembers && festival.festivalMembers.length > 0;
    const isOwner = festival?.ownerId === session.userId;
    const isSuperAdmin = session.role === "SUPER_ADMIN";

    if (!festival || (!isAdmin && !isOwner && !isSuperAdmin)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    const hasDateField =
      data.startDate !== undefined || data.endDate !== undefined;
    const hasNonDateField =
      data.programmeAssignmentDeadline !== undefined ||
      data.teamLeaderLimit !== undefined ||
      data.announcerResultsPerStandings !== undefined;
    const isDateOnlyUpdate = hasDateField && !hasNonDateField;
    await assertFestivalMutationAllowed(festivalId, {
      allowPast: isDateOnlyUpdate,
    });

    const incomingStart = data.startDate ? new Date(data.startDate) : null;
    const incomingEnd = data.endDate ? new Date(data.endDate) : null;
    const planStart = new Date(festival.createdAt);
    const planEnd = festival.expiresAt ? new Date(festival.expiresAt) : null;

    if (incomingStart && Number.isNaN(incomingStart.getTime())) {
      throw new AppError("Invalid start date");
    }
    if (incomingEnd && Number.isNaN(incomingEnd.getTime())) {
      throw new AppError("Invalid end date");
    }
    if (incomingStart && incomingEnd && incomingStart > incomingEnd) {
      throw new AppError("Start date must be before end date");
    }
    if (incomingStart && incomingStart < planStart) {
      throw new AppError("Start date must be on/after plan created date");
    }
    if (incomingEnd && planEnd && incomingEnd > planEnd) {
      throw new AppError("End date must be on/before plan expiry date");
    }

    const [updated] = await db
      .update(festivalTable)
      .set({
        ...(data.programmeAssignmentDeadline !== undefined && {
          programmeAssignmentDeadline: data.programmeAssignmentDeadline
            ? new Date(data.programmeAssignmentDeadline).toISOString()
            : null,
        }),
        ...(data.studentCreationDeadline !== undefined && {
          studentCreationDeadline: data.studentCreationDeadline
            ? new Date(data.studentCreationDeadline).toISOString()
            : null,
        }),
        ...(data.teamLeaderLimit !== undefined && {
          teamLeaderLimit: Math.max(
            1,
            Math.min(10, Number(data.teamLeaderLimit) || 2),
          ),
        }),
        ...(data.announcerResultsPerStandings !== undefined && {
          announcerResultsPerStandings: Math.max(
            1,
            Math.min(
              100,
              Math.floor(Number(data.announcerResultsPerStandings) || 10),
            ),
          ),
        }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate
            ? new Date(data.startDate).toISOString()
            : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        }),
        ...(data.scoringSystem !== undefined && {
          scoringSystem: data.scoringSystem,
        }),
        ...(data.publicDisplayMode !== undefined && {
          publicDisplayMode: data.publicDisplayMode,
        }),
        ...(data.chestNumberSettings !== undefined && {
          chestNumberSettings: data.chestNumberSettings,
        }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(festivalTable.id, festivalId))
      .returning();

    revalidatePath(`/dashboard/${festival.slug}/settings`);
    return { success: true, data: updated };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function setPublicSiteEnabledAction(
  festivalId: string,
  enabled: boolean,
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      with: {
        festivalMembers: {
          where: and(
            eq(memberTable.userId, session.userId),
            eq(memberTable.isActive, true),
          ),
        },
        festivalNews: {
          columns: { title: true, content: true, imageUrl: true },
        },
        festivalGalleryImages: {
          columns: { id: true },
        },
      },
    });

    const isOwner = festival?.ownerId === session.userId;
    const isAdmin = festival?.festivalMembers.some((m) => m.role === "ADMIN");
    const isSuperAdmin = session.role === "SUPER_ADMIN";

    if (!festival || (!isOwner && !isAdmin && !isSuperAdmin)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    await assertFestivalMutationAllowed(festivalId);

    await db
      .update(festivalTable)
      .set({
        publicSiteEnabled: enabled,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(festivalTable.id, festivalId));

    revalidatePath(`/dashboard/${festival.slug}/festival-live`);
    revalidatePath(`/dashboard/${festival.slug}`);
    return { success: true };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateFestivalBrandingAction(data: {
  festivalId: string;
  logo?: string | null;
}) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, data.festivalId),
      with: {
        festivalMembers: {
          where: and(
            eq(memberTable.userId, session.userId),
            eq(memberTable.role, "ADMIN"),
          ),
        },
      },
    });

    const isAdmin =
      festival?.festivalMembers && festival.festivalMembers.length > 0;
    const isOwner = festival?.ownerId === session.userId;
    const isSuperAdmin = session.role === "SUPER_ADMIN";

    if (!festival || (!isAdmin && !isOwner && !isSuperAdmin)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    await assertFestivalMutationAllowed(festival.id);

    const current =
      festival.branding && typeof festival.branding === "object"
        ? (festival.branding as Record<string, unknown>)
        : {};

    const nextBranding = {
      ...current,
      logo: data.logo ?? current.logo ?? null,
    };

    const previousLogo = typeof current.logo === "string" ? current.logo : null;
    const nextLogo =
      typeof (data.logo ?? current.logo) === "string"
        ? String(data.logo ?? current.logo)
        : null;

    const urlsToAdd: string[] = [];
    const urlsToRemove: string[] = [];

    if (previousLogo && previousLogo !== nextLogo)
      urlsToRemove.push(previousLogo);
    if (nextLogo && nextLogo !== previousLogo) urlsToAdd.push(nextLogo);

    const [addMb, removeMb] = await Promise.all([
      StorageUsageService.getUrlsSizeMB(urlsToAdd),
      StorageUsageService.getUrlsSizeMB(urlsToRemove),
    ]);
    const deltaMb = addMb - removeMb;

    await db.transaction(async (tx) => {
      await tx
        .update(festivalTable)
        .set({
          branding: nextBranding,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(festivalTable.id, festival.id));

      if (deltaMb !== 0) {
        await UsageCounterService.incrementUsage(
          festival.id,
          "storage",
          deltaMb,
        );
      }
    });

    revalidatePath(`/dashboard/${festival.slug}/festival-live`);
    return { success: true };
  } catch (error) {
    return handleActionError(error);
  }
}
