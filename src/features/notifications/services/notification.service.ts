import { randomUUID } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  programmeNotification as notificationTable,
  student as studentTable,
} from "@/core/database/schema";

type DeliveryChannel = "IN_APP" | "EMAIL";

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
  studentRecipients: Array<{
    studentId: string;
    email: string | null;
    isTeamLeader: boolean;
  }>;
};

async function resolveRecipients(
  festivalId: string,
  targets: NotificationTargetsInput,
): Promise<ResolvedRecipients> {
  const studentIds = new Set<string>(targets.studentIds ?? []);

  if (targets.programmeId) {
    const assignments = await db.query.programmeAssignment.findMany({
      where: and(
        eq(assignmentTable.festivalId, festivalId),
        eq(assignmentTable.programmeId, targets.programmeId),
      ),
      with: {
        student: { columns: { groupId: true } },
      },
    });

    const groupIds = new Set<string>();
    for (const row of assignments) {
      if (row.studentId) studentIds.add(row.studentId);
      if (row.student?.groupId) groupIds.add(row.student.groupId);
    }

    if (targets.includeTeamLeadersForProgramme && groupIds.size > 0) {
      const leaders = await db.query.student.findMany({
        where: and(
          eq(studentTable.festivalId, festivalId),
          inArray(studentTable.groupId, Array.from(groupIds)),
          eq(studentTable.isTeamLeader, true),
        ),
        columns: { id: true },
      });
      for (const leader of leaders) studentIds.add(leader.id);
    }
  }

  if (studentIds.size === 0) return { studentRecipients: [] };

  const students = await db.query.student.findMany({
    where: and(
      inArray(studentTable.id, Array.from(studentIds)),
      eq(studentTable.festivalId, festivalId),
    ),
    columns: { id: true, email: true, isTeamLeader: true },
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

    const now = new Date().toISOString();
    const notificationRows = recipients.studentRecipients.map((recipient) => ({
      id: randomUUID(),
      festivalId: input.festivalId,
      eventType: input.eventType,
      recipientStudentId: recipient.studentId,
      title: input.context.title,
      body: input.context.body,
      payload: input.context.payload ?? {},
      channels: input.channels,
      isRead: false,
      updatedAt: now,
    }));

    if (input.channels.includes("IN_APP")) {
      // Chunking if necessary, but for small batches it's fine
      await db.insert(notificationTable).values(notificationRows as any);
    }

    return { created: recipients.studentRecipients.length };
  },
};
