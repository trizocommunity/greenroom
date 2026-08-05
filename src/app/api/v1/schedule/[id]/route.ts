import "server-only";

import { eq } from "drizzle-orm";
import { updateScheduleEntryInput } from "@/api/contracts/schedule";
import { badRequest, notFound, ok, unauthorized } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { scheduleEntry } from "@/core/database/schema";
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

  const parsed = updateScheduleEntryInput.safeParse(data);
  if (!parsed.success) return badRequest("INVALID_INPUT", parsed.error.message);

  await assertFestivalAccess(session, festivalId);

  const existing = await db.query.scheduleEntry.findFirst({
    where: eq(scheduleEntry.id, id),
  });
  if (!existing || existing.festivalId !== festivalId) {
    return notFound("SCHEDULE_ENTRY_NOT_FOUND", "Schedule entry not found");
  }

  const [updated] = await db
    .update(scheduleEntry)
    .set({
      ...parsed.data,
      updatedBy: session.userId,
      updatedAt: serverNowIso(),
    })
    .where(eq(scheduleEntry.id, id))
    .returning();

  try { const { revalidatePath } = await import("next/cache"); revalidatePath("/", "layout"); } catch(e){}
    return ok(updated);
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id: entryId } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId) return badRequest("MISSING_PARAM", "festivalId is required");

  await assertFestivalAccess(session, festivalId);

  const existing = await db.query.scheduleEntry.findFirst({
    where: eq(scheduleEntry.id, entryId),
  });
  if (!existing || existing.festivalId !== festivalId) {
    return notFound("SCHEDULE_ENTRY_NOT_FOUND", "Schedule entry not found");
  }

  await db.delete(scheduleEntry).where(eq(scheduleEntry.id, entryId));
  try { const { revalidatePath } = await import("next/cache"); revalidatePath("/", "layout"); } catch(e){}
    return ok({ success: true });
};
