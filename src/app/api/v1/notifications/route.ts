import "server-only";

import { desc, eq } from "drizzle-orm";
import { badRequest, createHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { programmeNotification } from "@/core/database/schema";
import { assertParticipantNotificationAccess } from "@/features/programmes/actions/reporting-access";

// Participants (and team leaders) reach this from the portal with only a
// `participant_session` cookie — no Better Auth admin session — so this uses
// `createHandler`, not `createProtectedHandler`. Authorization is resolved
// per-request by `assertParticipantNotificationAccess`, which understands both
// the admin session AND the participant cookie, and throws FORBIDDEN for
// anyone with neither. (Same dual-auth pattern as `assignments/route.ts`.)
const handler = createHandler({
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
});

export const GET = handler;
