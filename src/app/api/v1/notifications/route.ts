import "server-only";

import { desc, eq } from "drizzle-orm";
import { markAllReadInput } from "@/api/contracts/notifications";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { programmeNotification } from "@/core/database/schema";
import { assertParticipantNotificationAccess } from "@/features/programmes/actions/reporting-access";

const handler = createProtectedHandler({
  async GET({ request }) {
    const url = new URL(request.url);
    const participantId = url.searchParams.get("participantId");

    if (!participantId) {
      return badRequest(
        "MISSING_PARAM",
        "participantId query param is required",
      );
    }

    await assertParticipantNotificationAccess(participantId);

    const notifications = await db.query.programmeNotification.findMany({
      where: eq(programmeNotification.recipientParticipantId, participantId),
      orderBy: [desc(programmeNotification.createdAt)],
      limit: 50,
    });

    return ok(notifications, "private, max-age=10");
  },

  async POST({ request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = markAllReadInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const { participantId } = parsed.data;
    await assertParticipantNotificationAccess(participantId);

    await db
      .update(programmeNotification)
      .set({ isRead: true })
      .where(eq(programmeNotification.recipientParticipantId, participantId));

    return ok({ success: true });
  },
});

export const GET = handler;
export const POST = handler;
