import "server-only";

import { eq } from "drizzle-orm";
import { markAllReadInput } from "@/api/contracts/notifications";
import { badRequest, createHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { programmeNotification } from "@/core/database/schema";
import { assertParticipantNotificationAccess } from "@/features/programmes/actions/reporting-access";

// Participant/team-leader portal callers carry only a `participant_session`
// cookie, so this uses `createHandler`; `assertParticipantNotificationAccess`
// does the real authz. See `notifications/route.ts` for the full rationale.
const handler = createHandler({
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

export const POST = handler;
