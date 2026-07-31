import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { stageDataInput } from "@/api/contracts/stages";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { stage } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { provisionStagePortalCredential } from "@/features/stage-portal/actions/stage-portal-credential.actions";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);

    const stages = await db.query.stage.findMany({
      where: eq(stage.festivalId, festivalId),
    });
    return ok(stages);
  },

  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    const body = await request.json();
    const data = body.data ?? body;
    const parsed = stageDataInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    const now = serverNowIso();
    const [newStage] = await db
      .insert(stage)
      .values({
        id: randomUUID(),
        festivalId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        createdBy: user!.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await provisionStagePortalCredential({
      festivalId,
      stageId: newStage.id,
    });

    return ok(newStage);
  },
});

export const GET = handler;
export const POST = handler;
