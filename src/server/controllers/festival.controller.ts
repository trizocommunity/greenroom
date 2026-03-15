import type { FestivalStatus, Prisma } from "@prisma/client";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
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

export async function store(
  userId: string,
  role: string,
  data: Record<string, unknown>,
) {
  const { name } = data;

  if (!name || typeof name !== "string") {
    throw new AppError(ERROR_MESSAGES.VALIDATION);
  }

  // One-festival limit: BASIC plan allows only one festival per user. When STANDARD/PRO are
  // implemented, this will be driven by TIER_CONFIG[tier].features.multiFestivalManagement.
  if (role === "USER") {
    const userFestivals = await findAllFestivals({ ownerId: userId });
    if (userFestivals.length > 0) {
      throw new AppError(ERROR_MESSAGES.TIER_NOT_FOUND);
    }
  }

  // Generate slug from name
  const slug = name.toLowerCase().replace(/ /g, "-") + "-" + Date.now();

  const festival = await createFestival({
    name,
    slug,
    owner: { connect: { id: userId } },
    status: "READY",
    isLocked: true,
  });

  return festival;
}

export async function show(id: string, userId: string, role: string) {
  const festival = await findFestivalById(id);

  if (!festival) {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
  }

  if (festival.ownerId !== userId && role !== "SUPER_ADMIN") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  return festival;
}

export async function update(
  id: string,
  userId: string,
  role: string,
  data: Record<string, unknown>,
) {
  const existing = await findFestivalById(id);
  if (!existing) {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
  }

  if (existing.ownerId !== userId && role !== "SUPER_ADMIN") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
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
    name: (name as string) ?? existing.name,
    slug: (slug as string) ?? existing.slug,
    description: (description as string) ?? existing.description,
    orgName: (orgName as string) ?? existing.orgName,
    orgWebsite: (orgWebsite as string) ?? existing.orgWebsite,
    establishedYear: (establishedYear as number) ?? existing.establishedYear,
    founderName: (founderName as string) ?? existing.founderName,
    founderMessage: (founderMessage as string) ?? existing.founderMessage,
  } as Prisma.FestivalUpdateInput);

  // Revalidate old and new paths
  const revalidatePath = (await import("next/cache")).revalidatePath;
  revalidatePath(`/dashboard/${existing.slug}`);
  if (slug && slug !== existing.slug) {
    revalidatePath(`/dashboard/${slug as string}`);
  }
  revalidatePath(`/dashboard/${existing.slug}/settings`);

  // Public Paths
  revalidatePath(`/${existing.slug}`);
  if (slug && slug !== existing.slug) {
    revalidatePath(`/${slug as string}`);
  }

  // Revalidate Profile/Dashboard Lists
  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return festival;
}

export async function destroy(id: string, userId: string, role: string) {
  const existing = await findFestivalById(id);
  if (!existing) {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
  }

  if (existing.ownerId !== userId && role !== "SUPER_ADMIN") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  await deleteFestival(id);
}
