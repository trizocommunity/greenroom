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
        metadata: { reason, editionNumber: edition.number },
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
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
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
    name: formData.get("name"),
    slug: formData.get("slug"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    description: formData.get("description"),
    theme: formData.get("theme"),
    venue: formData.get("venue"),
    location: formData.get("location"),
  };

  const validated = updateEditionSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: "Validation failed" };
  }

  const {
    id,
    name,
    slug,
    startDate,
    endDate,
    description,
    theme,
    venue,
    location,
  } = validated.data;

  try {
    // If slug is provided, use it. Ideally we should check uniqueness but uniqueness is constrained by DB anyway.
    // If slug is somehow empty (prevented by schema), fallback to name.
    const finalSlug = slug ? slugify(slug) : slugify(name);

    await db.edition.update({
      where: { id },
      data: {
        name,
        slug: finalSlug,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || undefined,
        theme: theme || undefined,
        venue: venue || undefined,
        location: location || undefined,
      },
    });

    // Log Audit
    await db.auditLog.create({
      data: {
        actorId: admin.userId,
        actorRole: "SUPER_ADMIN",
        action: "UPDATE_EDITION",
        targetType: "EDITION",
        targetId: id,
        metadata: { changes: validated.data },
      },
    });

    // Revalidation
    revalidatePath("/super-admin/festivals");
    revalidatePath("/super-admin/editions");

    // Revalidate Public Site Paths
    const festival = await db.festival.findFirst({
      where: { editions: { some: { id } } },
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
