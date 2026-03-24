"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { TIER_CONFIG } from "@/config/pricing";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import { validatePublicSiteRequirements } from "@/lib/festival-public-validation";

import {
  type CreateFestivalInput,
  createFestivalSchema,
} from "@/lib/validations/festival";
import { createAuditLog } from "@/server/services/audit-log.service";

export async function createFestival(input: CreateFestivalInput) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // 1. Validate Input
    const data = createFestivalSchema.parse(input);

    // 2. Validate Payment
    const payment = await prisma.payment.findUnique({
      where: { id: data.paymentId, userId: session.userId },
    });

    if (!payment || payment.status !== "PAID" || payment.used) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_INVALID);
    }

    // Payment Purpose Check
    if (payment.purpose !== "FESTIVAL_CREATION") {
      throw new AppError(ERROR_MESSAGES.PAYMENT_PURPOSE_MISMATCH);
    }

    // Resolve Tier (Default to BASIC if missing)
    const tier = payment.tier || "BASIC";
    const tierConfig = TIER_CONFIG[tier];

    // 3. Atomic Transaction
    const expiresAt =
      payment.validUntil ??
      (() => {
        const base = payment.createdAt ?? new Date();
        const days = tierConfig.durationDays || 40;
        const d = new Date(base);
        d.setDate(d.getDate() + days);
        return d;
      })();

    const result = await prisma.$transaction(async (tx) => {
      // Create Festival
      const finalSlug = (
        data.festivalSlug ||
        data.festivalName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      ).slice(0, 50);

      const festival = await tx.festival.create({
        data: {
          name: data.festivalName,
          slug: finalSlug,
          institutionType: data.institutionType || "OTHER",
          institutionName: data.institutionName,
          location: data.location,
          startDate: data.startDate,
          endDate: data.endDate,
          ownerId: session.userId,
          status: "ONGOING",
          expiresAt: expiresAt,
          isLocked: false,

          // Create Admin Member
          members: {
            create: {
              userId: session.userId,
              role: "ADMIN",
            },
          },

          // Tier Info
          tier: tier,
          tierLabel: tierConfig?.label || "Standard",
        },
      });

      // Mark Payment Used
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          used: true,
          festivalId: festival.id,
        },
      });

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
    teamLeaderLimit?: number;
    startDate?: string | null;
    endDate?: string | null;
  },
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Check ADMIN
    const festival = await prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        members: {
          where: {
            userId: session.userId,
            role: "ADMIN",
          },
        },
      },
    });

    const isAdmin = festival?.members.length && festival.members.length > 0;
    const isOwner = festival?.ownerId === session.userId;
    const isSuperAdmin = session.role === "SUPER_ADMIN";

    if (!festival || (!isAdmin && !isOwner && !isSuperAdmin)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    const updated = await prisma.festival.update({
      where: { id: festivalId },
      data: {
        // CLN-1 FIX: Removed duplicate first assignment — spread below is the active one.
        ...(data.programmeAssignmentDeadline !== undefined && {
          programmeAssignmentDeadline: data.programmeAssignmentDeadline
            ? new Date(data.programmeAssignmentDeadline)
            : null,
        }),
        ...(data.teamLeaderLimit !== undefined && {
          teamLeaderLimit: Math.max(1, Math.min(10, Number(data.teamLeaderLimit) || 2)),
        }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
      },
    });

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

    const festival = await prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        members: {
          where: { userId: session.userId, isActive: true },
        },
        _count: { select: { galleryImages: true } },
        newsPosts: {
          select: { title: true, content: true, imageUrl: true },
        },
      },
    });

    const isOwner = festival?.ownerId === session.userId;
    const isAdmin = festival?.members.some((m) => m.role === "ADMIN");
    const isSuperAdmin = session.role === "SUPER_ADMIN";

    if (!festival || (!isOwner && !isAdmin && !isSuperAdmin)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    if (enabled) {
      const validation = validatePublicSiteRequirements({
        name: festival.name,
        description: festival.description,
        orgName: festival.orgName,
        orgDescription: festival.orgDescription,
        orgWebsite: festival.orgWebsite,
        orgLocation: festival.orgLocation,
        tier: festival.tier,
        galleryImageCount: festival._count?.galleryImages ?? 0,
        newsPosts: (festival.newsPosts ?? []).map((p) => ({
          title: p.title,
          content: p.content,
          imageUrl: p.imageUrl,
        })),
      });
      if (!validation.canEnable) {
        throw new AppError(
          validation.errors.join(" ") || "Complete required content before enabling the public site.",
        );
      }
    }

    await prisma.festival.update({
      where: { id: festivalId },
      data: { publicSiteEnabled: enabled },
    });

    revalidatePath(`/dashboard/${festival.slug}/festival-live`);
    revalidatePath(`/dashboard/${festival.slug}`);
    return { success: true };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateFestivalBrandingAction(
  data: {
    logo?: string | null;
    heroImage?: string | null;
    accentColor?: string | null;
  },
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const festival = await prisma.festival.findUnique({
      where: { ownerId: session.userId },
      select: { id: true, slug: true, branding: true },
    });

    if (!festival) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    const current =
      festival.branding && typeof festival.branding === "object"
        ? (festival.branding as Record<string, unknown>)
        : {};
    const currentColors =
      current.colors && typeof current.colors === "object"
        ? (current.colors as Record<string, unknown>)
        : {};

    const nextBranding = {
      ...current,
      logo: data.logo ?? current.logo ?? null,
      heroImage: data.heroImage ?? current.heroImage ?? null,
      colors:
        data.accentColor !== undefined
          ? { ...currentColors, primary: data.accentColor || null }
          : current.colors,
    } as Prisma.InputJsonValue;

    await prisma.festival.update({
      where: { id: festival.id },
      data: { branding: nextBranding },
    });

    revalidatePath(`/dashboard/${festival.slug}/festival-live`);
    return { success: true };
  } catch (error) {
    return handleActionError(error);
  }
}
