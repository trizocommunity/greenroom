import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import {
  createFestival,
  deleteFestival,
  findAllFestivals,
  findFestivalById,
  updateFestival,
} from "@/server/models/festival.model";
import { festival as festivalTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";

export async function index(userId: string, role: string) {
  if (role === "SUPER_ADMIN") {
    return findAllFestivals();
  } else {
    return findAllFestivals(eq(festivalTable.ownerId, userId));
  }
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

  // One-festival limit: BASIC plan allows only one festival per user.
  if (role === "USER") {
    const userFestivals = await findAllFestivals(eq(festivalTable.ownerId, userId));
    if (userFestivals.length > 0) {
      throw new AppError(ERROR_MESSAGES.TIER_NOT_FOUND);
    }
  }

  const slug = name.toLowerCase().replace(/ /g, "-") + "-" + Date.now();
  const { randomUUID } = await import("crypto");

  const festival = await createFestival({
    id: randomUUID(),
    ownerId: userId,
    name,
    slug,
    status: "READY",
    isLocked: true,
    updatedAt: new Date().toISOString(),
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
  });

  const revalidatePath = (await import("next/cache")).revalidatePath;
  revalidatePath(`/dashboard/${existing.slug}`);
  if (slug && slug !== existing.slug) {
    revalidatePath(`/dashboard/${slug as string}`);
  }
  revalidatePath(`/dashboard/${existing.slug}/settings`);
  revalidatePath(`/${existing.slug}`);
  if (slug && slug !== existing.slug) {
    revalidatePath(`/${slug as string}`);
  }
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
