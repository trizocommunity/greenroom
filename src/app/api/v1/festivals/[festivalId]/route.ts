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
import { serverNowIso } from "@/core/datetime/server";
import {
  deleteFestival as deleteFestivalRecord,
  findFestivalById,
  isSlugTaken,
  updateFestival,
} from "@/features/festivals/repositories/festival.repository";
import {
  handleFestivalSlugChange,
  reconcileFestivalDomain,
} from "@/features/institutions/services/custom-domain-provisioning.service";

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ festivalId: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { festivalId } = await params;

  const festival = await findFestivalById(festivalId);
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
  { params }: { params: Promise<{ festivalId: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { festivalId } = await params;

  const body = await req.json();
  const payload = (body.data ?? body) as Record<string, unknown>;
  const { id: _ignored, ...rest } = payload;

  const parsed = updateFestivalInput.safeParse(rest);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", parsed.error.message);
  }

  const existing = await findFestivalById(festivalId);
  if (!existing) {
    return notFound("FESTIVAL_NOT_FOUND", "Festival not found");
  }

  if (existing.ownerId !== session.userId && session.role !== "SUPER_ADMIN") {
    return forbidden();
  }

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const isTaken = await isSlugTaken(parsed.data.slug, festivalId);
    if (isTaken) {
      return conflict(
        "FESTIVAL_SLUG_TAKEN",
        "This subdomain is already taken. Please choose another.",
      );
    }
  }

  try {
    const updated = await updateFestival(festivalId, {
      ...parsed.data,
      updatedAt: serverNowIso(),
    });

    // The branded host is built from the slug, so a rename has to move it.
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      await handleFestivalSlugChange(festivalId, existing.slug);
    }

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
  { params }: { params: Promise<{ festivalId: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { festivalId } = await params;

  const existing = await findFestivalById(festivalId);
  if (!existing) {
    return notFound("FESTIVAL_NOT_FOUND", "Festival not found");
  }

  if (existing.ownerId !== session.userId && session.role !== "SUPER_ADMIN") {
    return forbidden();
  }

  // Detach first: reconcile reads the festival row to build its host, so it must
  // run while the row still exists. Best-effort — it never blocks the delete.
  await reconcileFestivalDomain(festivalId, false);

  await deleteFestivalRecord(festivalId);
  return ok({ id: festivalId });
};
