import "server-only";

import { desc, eq } from "drizzle-orm";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { markAllReadInput } from "@/api/contracts/notifications";
import { db } from "@/core/database/client";
import { programmeNotification } from "@/core/database/schema";
import { assertStudentNotificationAccess } from "@/features/programmes/actions/reporting-access";

const handler = createProtectedHandler({
  async GET({ request }) {
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId");

    if (!studentId) {
      return badRequest("MISSING_PARAM", "studentId query param is required");
    }

    await assertStudentNotificationAccess(studentId);

    const notifications = await db.query.programmeNotification.findMany({
      where: eq(programmeNotification.recipientStudentId, studentId),
      orderBy: [desc(programmeNotification.createdAt)],
      limit: 50,
    });

    return ok(notifications);
  },

  async POST({ request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = markAllReadInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const { studentId } = parsed.data;
    await assertStudentNotificationAccess(studentId);

    await db
      .update(programmeNotification)
      .set({ isRead: true })
      .where(eq(programmeNotification.recipientStudentId, studentId));

    return ok({ success: true });
  },
});

export const GET = handler;
export const POST = handler;
