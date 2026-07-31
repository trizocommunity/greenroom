import { randomUUID } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  programmeNotification as notificationTable,
  participant as participantTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

type DeliveryChannel = "IN_APP" | "EMAIL";

type NotificationActor = {
  id?: string | null;
  name?: string | null;
};

type NotificationTargetsInput = {
  programmeId?: string;
  participantIds?: string[];
  includeTeamLeadersForProgramme?: boolean;
};

type NotificationInput = {
  eventType:
    | "REPORTING_STARTED"
    | "REPORTING_RESET"
    | "REPORTING_PARTICIPANT_MARKED"
    | "REPORTING_CLOSED"
    | "CODE_LETTER_ISSUED"
    | "PROGRAMME_STATUS_CHANGED";
  festivalId: string;
  actor?: NotificationActor;
  targets: NotificationTargetsInput;
  context: {
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  };
  channels: DeliveryChannel[];
};

type ResolvedRecipients = {
  participantRecipients: Array<{
    participantId: string;
    email: string | null;
    isTeamLeader: boolean;
  }>;
};

async function resolveRecipients(
  festivalId: string,
  targets: NotificationTargetsInput,
): Promise<ResolvedRecipients> {
  const participantIds = new Set<string>(targets.participantIds ?? []);

  if (targets.programmeId) {
    const assignments = await db.query.programmeAssignment.findMany({
      where: and(
        eq(assignmentTable.festivalId, festivalId),
        eq(assignmentTable.programmeId, targets.programmeId),
      ),
      with: {
        participant: { columns: { groupId: true } },
      },
    });

    const groupIds = new Set<string>();
    for (const row of assignments) {
      if (row.participantId) participantIds.add(row.participantId);
      if (row.participant?.groupId) groupIds.add(row.participant.groupId);
    }

    if (targets.includeTeamLeadersForProgramme && groupIds.size > 0) {
      const leaders = await db.query.participant.findMany({
        where: and(
          eq(participantTable.festivalId, festivalId),
          inArray(participantTable.groupId, Array.from(groupIds)),
          eq(participantTable.isTeamLeader, true),
        ),
        columns: { id: true },
      });
      for (const leader of leaders) participantIds.add(leader.id);
    }
  }

  if (participantIds.size === 0) return { participantRecipients: [] };

  const participants = await db.query.participant.findMany({
    where: and(
      inArray(participantTable.id, Array.from(participantIds)),
      eq(participantTable.festivalId, festivalId),
    ),
    columns: { id: true, email: true, isTeamLeader: true },
  });

  return {
    participantRecipients: participants.map((s) => ({
      participantId: s.id,
      email: s.email ?? null,
      isTeamLeader: s.isTeamLeader,
    })),
  };
}

export const NotificationService = {
  async dispatch(input: NotificationInput): Promise<{ created: number }> {
    const recipients = await resolveRecipients(input.festivalId, input.targets);
    if (!recipients.participantRecipients.length) return { created: 0 };

    const now = serverNowIso();
    const notificationRows = recipients.participantRecipients.map(
      (recipient) => ({
        id: randomUUID(),
        festivalId: input.festivalId,
        eventType: input.eventType,
        recipientParticipantId: recipient.participantId,
        title: input.context.title,
        body: input.context.body,
        payload: input.context.payload ?? {},
        channels: input.channels,
        isRead: false,
        updatedAt: now,
      }),
    );

    if (input.channels.includes("IN_APP")) {
      // Chunking if necessary, but for small batches it's fine
      await db.insert(notificationTable).values(notificationRows as any);
    }

    return { created: recipients.participantRecipients.length };
  },
};
