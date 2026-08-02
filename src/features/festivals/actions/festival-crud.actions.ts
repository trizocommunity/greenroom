"use server";

import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getFestivalDurationDays, TIER_CONFIG } from "@/config/pricing";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  auditLog as auditLogTable,
  festival as festivalTable,
  festivalMember as memberTable,
  payment as paymentTable,
} from "@/core/database/schema";
import { isAfter, isBefore, parseInstant } from "@/core/datetime";
import { fromNow, MS, serverNowIso } from "@/core/datetime/server";
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
        (data.endDate.getTime() - data.startDate.getTime()) / MS.day,
      );
      if (diffDays > tierConfig.festivalDurationDays) {
        return {
          success: false,
          error: `Your ${tier} plan allows a maximum festival duration of ${tierConfig.festivalDurationDays} days. Please adjust your dates.`,
        } as any;
      }
    }

    // 3. Atomic Transaction
    const expiresAt = fromNow(tierConfig.festivalDurationDays * MS.day);

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
      const now = serverNowIso();

      const [festival] = await tx
        .insert(festivalTable)
        .values({
          id: festivalId,
          name: data.festivalName,
          slug: finalSlug,
          institutionType: (data.institutionType as any) || "OTHER",
          institutionName: data.institutionName,
          location: data.location,
          startDate: parseInstant(data.startDate)?.toISOString(),
          endDate: parseInstant(data.endDate)?.toISOString(),
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

/**
 * A deadline window is only meaningful when it opens before it closes.
 * Either bound may be absent (unbounded on that side).
 */
function assertWindowOrder(
  label: string,
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
) {
  const startDate = parseInstant(start ?? null);
  const endDate = parseInstant(end ?? null);
  if (!startDate || !endDate) return;
  if (startDate.getTime() >= endDate.getTime()) {
    throw new AppError(`${label} must open before it closes`);
  }
}

export async function updateFestivalSettingsAction(
  festivalId: string,
  data: {
    programmeAssignmentStartDate?: string | null;
    programmeAssignmentDeadline?: string | null;
    participantCreationStartDate?: string | null;
    participantCreationDeadline?: string | null;
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
      data.programmeAssignmentStartDate !== undefined ||
      data.programmeAssignmentDeadline !== undefined ||
      data.participantCreationStartDate !== undefined ||
      data.participantCreationDeadline !== undefined ||
      data.teamLeaderLimit !== undefined ||
      data.announcerResultsPerStandings !== undefined;
    const isDateOnlyUpdate = hasDateField && !hasNonDateField;
    await assertFestivalMutationAllowed(festivalId, {
      allowPast: isDateOnlyUpdate,
    });

    const incomingStart = parseInstant(data.startDate);
    const incomingEnd = parseInstant(data.endDate);
    const planStart = parseInstant(festival.createdAt);
    const tierConfig = TIER_CONFIG[festival.tier as keyof typeof TIER_CONFIG];
    const planEndMs = planStart
      ? planStart.getTime() + (tierConfig?.festivalDurationDays ?? 90) * MS.day
      : null;

    if (data.startDate && !incomingStart) {
      throw new AppError("Invalid start date");
    }
    if (data.endDate && !incomingEnd) {
      throw new AppError("Invalid end date");
    }
    if (incomingStart && incomingEnd && isAfter(incomingStart, incomingEnd)) {
      throw new AppError("Start date must be before end date");
    }
    if (incomingStart && planStart && isBefore(incomingStart, planStart)) {
      throw new AppError("Start date must be on/after plan created date");
    }
    if (
      incomingEnd &&
      planEndMs !== null &&
      incomingEnd.getTime() > planEndMs
    ) {
      throw new AppError("End date must be on/before plan expiry date");
    }

    assertWindowOrder(
      "Programme assignment",
      data.programmeAssignmentStartDate !== undefined
        ? data.programmeAssignmentStartDate
        : festival.programmeAssignmentStartDate,
      data.programmeAssignmentDeadline !== undefined
        ? data.programmeAssignmentDeadline
        : festival.programmeAssignmentDeadline,
    );
    assertWindowOrder(
      "Participant registration",
      data.participantCreationStartDate !== undefined
        ? data.participantCreationStartDate
        : festival.participantCreationStartDate,
      data.participantCreationDeadline !== undefined
        ? data.participantCreationDeadline
        : festival.participantCreationDeadline,
    );

    const [updated] = await db
      .update(festivalTable)
      .set({
        ...(data.programmeAssignmentStartDate !== undefined && {
          programmeAssignmentStartDate: data.programmeAssignmentStartDate
            ? parseInstant(data.programmeAssignmentStartDate)?.toISOString()
            : null,
        }),
        ...(data.participantCreationStartDate !== undefined && {
          participantCreationStartDate: data.participantCreationStartDate
            ? parseInstant(data.participantCreationStartDate)?.toISOString()
            : null,
        }),
        ...(data.programmeAssignmentDeadline !== undefined && {
          programmeAssignmentDeadline: data.programmeAssignmentDeadline
            ? parseInstant(data.programmeAssignmentDeadline)?.toISOString()
            : null,
        }),
        ...(data.participantCreationDeadline !== undefined && {
          participantCreationDeadline: data.participantCreationDeadline
            ? parseInstant(data.participantCreationDeadline)?.toISOString()
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
          startDate: incomingStart?.toISOString() ?? null,
        }),
        ...(data.endDate !== undefined && {
          endDate: incomingEnd?.toISOString() ?? null,
        }),
        ...(data.scoringSystem !== undefined && {
          scoringSystem:
            data.scoringSystem === null ? undefined : data.scoringSystem,
        }),
        ...(data.publicDisplayMode !== undefined && {
          publicDisplayMode:
            data.publicDisplayMode === null
              ? undefined
              : data.publicDisplayMode,
        }),
        ...(data.chestNumberSettings !== undefined && {
          chestNumberSettings: data.chestNumberSettings,
        }),
        updatedAt: serverNowIso(),
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
        festivalMediaImages: {
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
        updatedAt: serverNowIso(),
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
          updatedAt: serverNowIso(),
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

/**
 * Relaunch a new festival for an owner whose previous festival has EXPIRED.
 *
 * Flow:
 *   1. Validate session + payment (must be PAID, unused, FESTIVAL_CREATION).
 *   2. Confirm the owner does NOT currently have a non-EXPIRED festival
 *      (the partial unique index on `festival_ownerId_active_key` enforces
 *      this at the DB level — we surface a friendly message here).
 *   3. Insert a fresh festival row with `status="READY"`,
 *      `isLocked=false`, new `id`, `expiresAt = now + duration`.
 *   4. Add the owner as an ADMIN member.
 *   5. Mark the payment used and audit-log REPLACE_FESTIVAL_LIFECYCLE.
 *
 * The expired `festival` row is intentionally NOT touched — it stays as
 * history so the owner can still download the Manual Book.
 */
export async function relaunchFestival(input: {
  paymentId: string;
  festivalName: string;
}) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    if (!input.festivalName?.trim()) {
      throw new AppError("Festival name is required");
    }

    const payment = await db.query.payment.findFirst({
      where: and(
        eq(paymentTable.id, input.paymentId),
        eq(paymentTable.userId, session.userId),
      ),
    });
    if (!payment || payment.status !== "PAID" || payment.used) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_INVALID);
    }
    if (payment.purpose !== "FESTIVAL_CREATION") {
      throw new AppError(ERROR_MESSAGES.PAYMENT_PURPOSE_MISMATCH);
    }

    const tier = (payment.tier || "BASIC") as "BASIC" | "STANDARD" | "PRO";
    const tierConfig = TIER_CONFIG[tier];

    // Confirm no active festival exists (the partial unique index will
    // reject the insert if this slips through).
    const activeFestival = await db.query.festival.findFirst({
      where: and(
        eq(festivalTable.ownerId, session.userId),
        sql`${festivalTable.status} <> 'EXPIRED'`,
      ),
    });
    if (activeFestival) {
      return {
        success: false,
        error:
          "You already have an active festival. Relaunch is only available once your current festival has expired.",
      } as const;
    }

    const expiresAt = fromNow(getFestivalDurationDays() * MS.day);
    const finalSlug = input.festivalName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);

    const result = await db.transaction(async (tx) => {
      const festivalId = randomUUID();
      const now = serverNowIso();

      const [festival] = await tx
        .insert(festivalTable)
        .values({
          id: festivalId,
          name: input.festivalName.trim(),
          slug: finalSlug,
          ownerId: session.userId,
          status: "READY",
          tier,
          tierLabel: tierConfig?.label || "Standard",
          isLocked: false,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await tx.insert(memberTable).values({
        id: randomUUID(),
        festivalId: festival.id,
        userId: session.userId,
        role: "ADMIN",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

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
      action: "REPLACE_FESTIVAL_LIFECYCLE",
      targetType: "FESTIVAL",
      targetId: result.id,
      metadata: { name: result.name, tier: result.tier, source: "relaunch" },
    });

    revalidatePath("/profile");
    revalidatePath("/festivals");

    return { success: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}
