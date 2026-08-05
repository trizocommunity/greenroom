import "server-only";

import { updateProgrammeInput } from "@/api/contracts/programmes";
import { badRequest, notFound, ok, unauthorized } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { ProgrammeService } from "@/features/programmes/services/programme.service";

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId) return badRequest("MISSING_PARAM", "festivalId is required");

  await assertFestivalAccess(session, festivalId);

  const result = await ProgrammeService.getDetails(id, festivalId);
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (e) {}
  return ok(result);
};

export const PUT = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId) return badRequest("MISSING_PARAM", "festivalId is required");

  const body = await req.json();
  const data = body.data ?? body;

  const parsed = updateProgrammeInput.safeParse(data);
  if (!parsed.success) return badRequest("INVALID_INPUT", parsed.error.message);

  await assertFestivalAccess(session, festivalId);

  try {
    const result = await ProgrammeService.update(id, festivalId, parsed.data);
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
    return ok(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return notFound("PROGRAMME_NOT_FOUND", message);
    }
    throw error;
  }
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id: programmeId } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId) return badRequest("MISSING_PARAM", "festivalId is required");

  await assertFestivalAccess(session, festivalId);

  try {
    const result = await ProgrammeService.delete(programmeId, festivalId);
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
    return ok(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return notFound("PROGRAMME_NOT_FOUND", message);
    }
    if (message.includes("assignments")) {
      return badRequest("PROGRAMME_HAS_ASSIGNMENTS", message);
    }
    throw error;
  }
};
