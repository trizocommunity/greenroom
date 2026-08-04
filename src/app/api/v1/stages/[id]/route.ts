import "server-only";

import { eq } from "drizzle-orm";
import { stageDataInput } from "@/api/contracts/stages";
import { badRequest, notFound, ok, unauthorized } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { stage } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

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

  const parsed = stageDataInput.safeParse(data);
  if (!parsed.success) return badRequest("INVALID_INPUT", parsed.error.message);

  await assertFestivalAccess(session, festivalId);

  const existing = await db.query.stage.findFirst({
    where: eq(stage.id, id),
  });
  if (!existing || existing.festivalId !== festivalId) {
    return notFound("STAGE_NOT_FOUND", "Stage not found");
  }

  const [updated] = await db
    .update(stage)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      updatedAt: serverNowIso(),
    })
    .where(eq(stage.id, id))
    .returning();

  return ok(updated);
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id: stageId } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId) return badRequest("MISSING_PARAM", "festivalId is required");

  await assertFestivalAccess(session, festivalId);

  const existing = await db.query.stage.findFirst({
    where: eq(stage.id, stageId),
  });
  if (!existing || existing.festivalId !== festivalId) {
    return notFound("STAGE_NOT_FOUND", "Stage not found");
  }

  if (existing.isOffStage) {
    return badRequest(
      "OFF_STAGE_NOT_DELETABLE",
      "The Off-Stage stage cannot be deleted. It is required for judging programmes without a scheduled time slot.",
    );
  }

  await db.delete(stage).where(eq(stage.id, stageId));
  return ok({ success: true });
};
