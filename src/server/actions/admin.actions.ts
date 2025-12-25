"use server";

import { prisma as db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Helper to enforce Super Admin role
async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return session;
}

// --- Festival Management ---

export async function deleteFestivalAdmin(festivalId: string, reason: string) {
  const admin = await requireSuperAdmin();

  const festival = await db.festival.findUnique({
    where: { id: festivalId },
    select: { name: true },
  });

  if (!festival) {
    throw new Error("Festival not found");
  }

  await db.$transaction(async (tx) => {
    // 1. Delete Editions
    await tx.edition.deleteMany({
      where: { festivalId: festivalId },
    });

    // 2. Delete Payments
    await tx.payment.deleteMany({
      where: { festivalId: festivalId },
    });

    // 3. Delete Festival
    await tx.festival.delete({
      where: { id: festivalId },
    });

    // 4. Log Audit
    await tx.auditLog.create({
      data: {
        actorId: admin.userId,
        actorRole: "SUPER_ADMIN",
        action: "DELETE_FESTIVAL",
        targetType: "FESTIVAL",
        targetId: festivalId,
        metadata: { reason, festivalName: festival.name },
      },
    });
  });

  revalidatePath("/super-admin/festivals");
  return { success: true };
}

export async function freezeFestivalAdmin(festivalId: string, reason: string) {
  const admin = await requireSuperAdmin();

  const festival = await db.festival.findUnique({
    where: { id: festivalId },
  });

  if (!festival) {
    throw new Error("Festival not found");
  }

  await db.$transaction(async (tx) => {
    await tx.festival.update({
      where: { id: festivalId },
      data: { isLocked: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.userId,
        actorRole: "SUPER_ADMIN",
        action: "FREEZE_FESTIVAL",
        targetType: "FESTIVAL",
        targetId: festivalId,
        metadata: { reason, festivalName: festival.name },
      },
    });
  });

  revalidatePath("/super-admin/festivals");
  return { success: true };
}

// --- Edition Management ---

export async function freezeEditionAdmin(editionId: string, reason: string) {
  const admin = await requireSuperAdmin();

  const edition = await db.edition.findUnique({
    where: { id: editionId },
  });

  if (!edition) {
    throw new Error("Edition not found");
  }

  await db.$transaction(async (tx) => {
    await tx.edition.update({
      where: { id: editionId },
      data: { status: "FREEZE" },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.userId,
        actorRole: "SUPER_ADMIN",
        action: "FREEZE_EDITION",
        targetType: "EDITION",
        targetId: editionId,
        metadata: { reason, editionSlug: edition.slug },
      },
    });
  });

  revalidatePath("/super-admin/editions");
  return { success: true };
}

// --- Fetch Actions ---

export async function getFestivalAdmin(festivalId: string) {
  await requireSuperAdmin();
  const festival = await db.festival.findUnique({
    where: { id: festivalId },
  });
  return festival;
}

export async function getEditionAdmin(editionId: string) {
  await requireSuperAdmin();
  const edition = await db.edition.findUnique({
    where: { id: editionId },
  });
  return edition;
}

// --- Update Actions ---

const updateEditionSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["ACTIVE", "FREEZE", "ARCHIVED"]).optional(),
  description: z.string().optional(),
  theme: z.string().optional(),
  venue: z.string().optional(),
  location: z.string().optional(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function updateEditionAdmin(formData: FormData) {
  const admin = await requireSuperAdmin();

  const rawData = {
    id: formData.get("id"),
    slug: formData.get("slug"),
    startDate: formData.get("startDate")?.toString() || "",
    endDate: formData.get("endDate")?.toString() || "",
    description: formData.get("description"),
    theme: formData.get("theme"),
    venue: formData.get("venue"),
    location: formData.get("location"),
  };

  const validated = updateEditionSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      error: `Validation failed: ${JSON.stringify(validated.error.flatten().fieldErrors)}`,
    };
  }

  const {
    id: editionId,
    slug,
    startDate,
    endDate,
    description,
    theme,
    venue,
    location,
    status,
  } = validated.data;

  try {
    const originalEdition = await db.edition.findUnique({
      where: { id: editionId },
      select: { slug: true, festivalId: true },
    });

    if (!originalEdition) {
      return { error: "Edition not found" };
    }

    const finalSlug = (slug || originalEdition.slug).toLowerCase();

    // Check slug uniqueness if changed
    if (finalSlug !== originalEdition.slug) {
      const existing = await db.edition.findFirst({
        where: {
          festivalId: originalEdition.festivalId,
          slug: finalSlug,
          NOT: { id: editionId },
        },
      });
      if (existing) {
        return { error: "Slug already exists for this festival." };
      }
    }

    await db.edition.update({
      where: { id: editionId },
      data: {
        slug: finalSlug,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status: status as any,
        description,
        theme,
        venue,
        location,
      },
    });

    // Log Audit
    await db.auditLog.create({
      data: {
        actorId: admin.userId,
        actorRole: "SUPER_ADMIN",
        action: "UPDATE_EDITION",
        targetType: "EDITION",
        targetId: editionId,
        metadata: { reason: "Admin Update" },
      },
    });

    // Revalidation
    revalidatePath("/super-admin/festivals");
    revalidatePath("/super-admin/editions");

    // Revalidate Public Site Paths
    const festival = await db.festival.findFirst({
      where: { editions: { some: { id: editionId } } },
      select: { slug: true },
    });

    if (festival) {
      // Revalidate the specific edition page
      revalidatePath(`/festival/${festival.slug}/${finalSlug}`);
      // Revalidate the festival landing page (listing editions)
      revalidatePath(`/festival/${festival.slug}`);
    }

    return { success: true, newSlug: finalSlug };
  } catch (error) {
    console.error(error);
    return { error: "Failed to update edition" };
  }
}
