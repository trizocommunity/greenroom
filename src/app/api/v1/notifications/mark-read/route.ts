import "server-only";

import { and, eq } from "drizzle-orm";
import { markReadInput } from "@/api/contracts/notifications";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { programmeNotification } from "@/core/database/schema";
import { assertParticipantNotificationAccess } from "@/features/programmes/actions/reporting-access";

const handler = createProtectedHandler({
  async POST({ request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = markReadInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const { participantId, notificationId } = parsed.data;
    await assertParticipantNotificationAccess(participantId);

    await db
      .update(programmeNotification)
      .set({ isRead: true })
      .where(
        and(
          eq(programmeNotification.recipientParticipantId, participantId),
          eq(programmeNotification.id, notificationId),
        ),
      );

    return ok({ success: true });
  },
});

export const POST = handler;
