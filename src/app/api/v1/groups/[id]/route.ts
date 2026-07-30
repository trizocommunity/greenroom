import "server-only";

import { updateGroupInput } from "@/api/contracts/groups";
import {
  badRequest,
  internalError,
  notFound,
  ok,
  unauthorized,
} from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { GroupService } from "@/features/groups/services/group.service";

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

  const parsed = updateGroupInput.safeParse(data);
  if (!parsed.success) return badRequest("INVALID_INPUT", parsed.error.message);

  try {
    await assertFestivalAccess(session, festivalId);
    const result = await GroupService.update(id, festivalId, parsed.data);
    return ok(result);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      if (error.message === ERROR_MESSAGES.GROUP_NOT_FOUND) {
        return notFound("GROUP_NOT_FOUND", error.message);
      }
      return badRequest(error.code, error.message);
    }
    console.error("[GroupUpdateError]", error);
    return internalError(ERROR_MESSAGES.DEFAULT);
  }
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id: groupId } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId) return badRequest("MISSING_PARAM", "festivalId is required");

  try {
    await assertFestivalAccess(session, festivalId);
    const result = await GroupService.delete(groupId, festivalId);
    return ok(result);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      if (error.message === ERROR_MESSAGES.GROUP_NOT_FOUND) {
        return notFound("GROUP_NOT_FOUND", error.message);
      }
      return badRequest(error.code, error.message);
    }
    console.error("[GroupDeleteError]", error);
    return internalError(ERROR_MESSAGES.DEFAULT);
  }
};
