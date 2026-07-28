import "server-only";

import { updateFestivalInput } from "@/api/contracts/festivals";
import {
  badRequest,
  conflict,
  forbidden,
  internalError,
  notFound,
  ok,
  unauthorized,
} from "@/api/lib";
import { getSession } from "@/core/auth/session";
import {
  deleteFestival as deleteFestivalRecord,
  findFestivalById,
  findFestivalBySlug,
  updateFestival,
} from "@/features/festivals/repositories/festival.repository";

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id } = await params;

  const festival = await findFestivalById(id);
  if (!festival) {
    return notFound("FESTIVAL_NOT_FOUND", "Festival not found");
  }

  if (festival.ownerId !== session.userId && session.role !== "SUPER_ADMIN") {
    return forbidden();
  }

  return ok(festival);
};

export const PUT = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id } = await params;

  const body = await req.json();
  const payload = (body.data ?? body) as Record<string, unknown>;
  const { id: _ignored, ...rest } = payload;

  const parsed = updateFestivalInput.safeParse(rest);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", parsed.error.message);
  }

  const existing = await findFestivalById(id);
  if (!existing) {
    return notFound("FESTIVAL_NOT_FOUND", "Festival not found");
  }

  if (existing.ownerId !== session.userId && session.role !== "SUPER_ADMIN") {
    return forbidden();
  }

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const slugOwner = await findFestivalBySlug(parsed.data.slug);
    if (slugOwner && slugOwner.id !== id) {
      return conflict(
        "FESTIVAL_SLUG_TAKEN",
        "This subdomain is already taken. Please choose another.",
      );
    }
  }

  try {
    const updated = await updateFestival(id, {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    });

    return ok(updated);
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return conflict(
        "FESTIVAL_SLUG_TAKEN",
        "This subdomain is already taken. Please choose another.",
      );
    }
    console.error("[FestivalUpdateError]", error);
    return internalError();
  }
};

export const DELETE = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id } = await params;

  const existing = await findFestivalById(id);
  if (!existing) {
    return notFound("FESTIVAL_NOT_FOUND", "Festival not found");
  }

  if (existing.ownerId !== session.userId && session.role !== "SUPER_ADMIN") {
    return forbidden();
  }

  await deleteFestivalRecord(id);
  return ok({ id });
};
