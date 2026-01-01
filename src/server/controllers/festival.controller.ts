import type { FestivalStatus } from "@prisma/client";
import {
  createFestival,
  deleteFestival,
  findAllFestivals,
  findFestivalById,
  updateFestival,
} from "@/server/models/festival.model";

export async function index(userId: string, role: string) {
  const where = role === "SUPER_ADMIN" ? {} : { ownerId: userId };
  const festivals = await findAllFestivals(where);
  return festivals;
}

export async function store(userId: string, role: string, data: any) {
  // Phase 1 Schema: name, ownerId, status
  // Data might contain other fields from UI form, ignore them or map them if schema allows.
  // Ignoring slug, dates, validation for now to fix build.

  const { name } = data;

  if (!name) {
    throw new Error("Missing required fields");
  }

  // Check limit for USER
  if (role === "USER") {
    const userFestivals = await findAllFestivals({ ownerId: userId });
    if (userFestivals.length > 0) {
      throw new Error("Standard users can only manage one festival");
    }
  }

  // Generate slug from name
  const slug = name.toLowerCase().replace(/ /g, "-") + "-" + Date.now();

  const festival = await createFestival({
    name,
    slug,
    owner: { connect: { id: userId } },
    status: "DRAFT", // Default to DRAFT
    isLocked: true,
  });

  return festival;
}

export async function show(id: string, userId: string, role: string) {
  const festival = await findFestivalById(id);

  if (!festival) {
    throw new Error("Festival not found");
  }

  if (festival.ownerId !== userId && role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  return festival;
}

export async function update(
  id: string,
  userId: string,
  role: string,
  data: any,
) {
  const existing = await findFestivalById(id);
  if (!existing) {
    throw new Error("Festival not found");
  }

  if (existing.ownerId !== userId && role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  const {
    name,
    slug,
    description,
    orgName,
    orgWebsite,
    establishedYear,
    founderName,
    founderMessage,
  } = data;

  const festival = await updateFestival(id, {
    name: name ?? existing.name,
    slug: slug ?? existing.slug,
    description: description ?? existing.description,
    orgName: orgName ?? existing.orgName,
    orgWebsite: orgWebsite ?? existing.orgWebsite,
    establishedYear: establishedYear ?? existing.establishedYear,
    founderName: founderName ?? existing.founderName,
    founderMessage: founderMessage ?? existing.founderMessage,
  });

  // Revalidate old and new paths
  const revalidatePath = (await import("next/cache")).revalidatePath;
  revalidatePath(`/dashboard/${existing.slug}`);
  if (slug && slug !== existing.slug) {
    revalidatePath(`/dashboard/${slug}`);
  }
  revalidatePath(`/dashboard/${existing.slug}/settings`);

  // Public Paths
  revalidatePath(`/${existing.slug}`);
  revalidatePath(`/${existing.slug}`);
  if (slug && slug !== existing.slug) {
    revalidatePath(`/${slug}`);
  }

  // Revalidate Profile/Dashboard Lists
  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return festival;
}

export async function destroy(id: string, userId: string, role: string) {
  const existing = await findFestivalById(id);
  if (!existing) {
    throw new Error("Festival not found");
  }

  if (existing.ownerId !== userId && role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  await deleteFestival(id);
}
