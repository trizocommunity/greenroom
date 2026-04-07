import type { Prisma, ProgrammeNotificationEventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendPlainFestivalEmail } from "@/lib/email";
import { realtimeConfig } from "@/lib/realtime-config";
import { dispatchRealtimeOutboxBatch } from "@/server/realtime/dispatcher.worker";
import {
  createEventId,
  createIdempotencyKey,
  type RealtimeEventName,
} from "@/server/realtime/events";
import { enqueueRealtimeOutboxEvent } from "@/server/realtime/outbox.service";
import { RealtimeRoom } from "@/server/realtime/rooms";
import { RealtimeNotificationBus } from "@/server/services/realtime-notification-bus.service";

type DeliveryChannel = "IN_APP" | "REALTIME" | "EMAIL";

type NotificationActor = {
  id?: string | null;
  name?: string | null;
};

type NotificationTargetsInput = {
  programmeId?: string;
  studentIds?: string[];
  includeTeamLeadersForProgramme?: boolean;
};

type NotificationInput = {
  eventType: ProgrammeNotificationEventType;
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
  studentRecipients: Array<{
    studentId: string;
    email: string | null;
    isTeamLeader: boolean;
  }>;
};

export function notificationEventSequenceFromId(eventId: string): number {
  const compact = eventId.replace(/-/g, "");
  const suffix = compact.slice(-8);
  const parsed = Number.parseInt(suffix, 16);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function mapNotificationEventToRealtimeEventName(
  eventType: ProgrammeNotificationEventType,
): RealtimeEventName {
  switch (eventType) {
    case "PROGRAMME_STATUS_CHANGED":
      return "programme.status_changed";
    case "REPORTING_PARTICIPANT_MARKED":
      return "reporting.participant_marked";
    case "REPORTING_CLOSED":
    case "REPORTING_RESET":
    case "REPORTING_STARTED":
      return "reporting.updated";
    case "CODE_LETTER_ISSUED":
      return "notification.created";
    default:
      return "notification.created";
  }
}

async function resolveRecipients(
  festivalId: string,
  targets: NotificationTargetsInput,
): Promise<ResolvedRecipients> {
  const studentIds = new Set<string>(targets.studentIds ?? []);

  if (targets.programmeId) {
    const assignments = await prisma.programmeAssignment.findMany({
      where: { festivalId, programmeId: targets.programmeId },
      select: { studentId: true, student: { select: { groupId: true } } },
    });
    const groupIds = new Set<string>();
    for (const row of assignments) {
      if (row.studentId) studentIds.add(row.studentId);
      if (row.student?.groupId) groupIds.add(row.student.groupId);
    }

    if (targets.includeTeamLeadersForProgramme && groupIds.size > 0) {
      const leaders = await prisma.student.findMany({
        where: {
          festivalId,
          groupId: { in: Array.from(groupIds) },
          isTeamLeader: true,
        },
        select: { id: true },
      });
      for (const leader of leaders) studentIds.add(leader.id);
    }
  }

  if (studentIds.size === 0) return { studentRecipients: [] };

  const students = await prisma.student.findMany({
    where: { id: { in: Array.from(studentIds) }, festivalId },
    select: { id: true, email: true, isTeamLeader: true },
  });

  return {
    studentRecipients: students.map((s) => ({
      studentId: s.id,
      email: s.email ?? null,
      isTeamLeader: s.isTeamLeader,
    })),
  };
}

export const NotificationService = {
  async dispatch(input: NotificationInput): Promise<{ created: number }> {
    const recipients = await resolveRecipients(input.festivalId, input.targets);
    if (!recipients.studentRecipients.length) return { created: 0 };

    const notificationRows: Prisma.ProgrammeNotificationCreateManyInput[] =
      recipients.studentRecipients.map((recipient) => ({
        festivalId: input.festivalId,
        eventType: input.eventType,
        recipientStudentId: recipient.studentId,
        title: input.context.title,
        body: input.context.body,
        payload: (input.context.payload ?? {}) as Prisma.InputJsonValue,
        channels: input.channels as unknown as Prisma.InputJsonValue,
        isRead: false,
      }));

    if (input.channels.includes("IN_APP")) {
      await prisma.programmeNotification.createMany({
        data: notificationRows,
      });
    }

    if (input.channels.includes("REALTIME")) {
      const createdAt = new Date().toISOString();
      for (const recipient of recipients.studentRecipients) {
        const eventName = mapNotificationEventToRealtimeEventName(
          input.eventType,
        );
        const eventId = createEventId();
        const roomKeys = [
          RealtimeRoom.festivalStudent(input.festivalId, recipient.studentId),
        ];
        if (realtimeConfig.enableDualPublish) {
          await enqueueRealtimeOutboxEvent({
            envelope: {
              eventId,
              eventName,
              eventVersion: 1,
              occurredAt: createdAt,
              festivalId: input.festivalId,
              entityType: "programmeNotification",
              entityId: recipient.studentId,
              idempotencyKey: createIdempotencyKey({
                eventName,
                entityId: recipient.studentId,
                sequence: notificationEventSequenceFromId(eventId),
              }),
              payload: {
                ...input.context.payload,
                title: input.context.title,
                body: input.context.body,
                notificationType: input.eventType,
              },
            },
            roomKeys,
          });
        }
        RealtimeNotificationBus.publish({
          eventId,
          festivalId: input.festivalId,
          recipientStudentId: recipient.studentId,
          type: input.eventType,
          payload: input.context.payload ?? {},
          createdAt,
          rooms: roomKeys,
        });
      }
      if (
        realtimeConfig.enableDualPublish &&
        realtimeConfig.outboxDispatcherEnabled
      ) {
        void dispatchRealtimeOutboxBatch();
      }
    }

    if (input.channels.includes("EMAIL")) {
      const festival = await prisma.festival.findUnique({
        where: { id: input.festivalId },
        select: { name: true },
      });
      for (const recipient of recipients.studentRecipients) {
        if (!recipient.isTeamLeader || !recipient.email) continue;
        try {
          await sendPlainFestivalEmail(
            recipient.email,
            `${festival?.name ?? "Festival"}: ${input.context.title}`,
            input.context.body,
          );
        } catch {
          // Keep dispatch resilient; failures are captured in DB channels metadata in future iterations.
        }
      }
    }

    return { created: recipients.studentRecipients.length };
  },
};
