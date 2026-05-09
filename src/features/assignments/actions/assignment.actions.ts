"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { getTeamLeaderSessionFromCookie } from "@/core/auth/team-leader-session";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  category as categoryTable,
  group as groupTable,
  programme as programmeTable,
  student as studentTable,
  user as userTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { parseStoredInstant } from "@/core/utils/date-time";
import { AssignmentService } from "@/features/assignments/services/assignment.service";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { assertFestivalMutationAllowed } from "@/features/festivals/services/festival-lifecycle-policy.service";

async function getActorForCreatedBy(userId: string) {
  const user = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
    columns: { email: true, fullName: true, displayName: true },
  });

  if (!user) return {};

  return {
    createdByEmail: user.email,
    createdByName: user.displayName || user.fullName || user.email,
  };
}

function assertAssignmentWindowOpen(
  festival: { programmeAssignmentDeadline?: string | null } | null | undefined,
) {
  if (
    festival?.programmeAssignmentDeadline &&
    new Date() > parseStoredInstant(festival.programmeAssignmentDeadline)
  ) {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DEADLINE_PASSED);
  }
}

type AssignmentActorContext =
  | { type: "user"; userId: string }
  | { type: "teamLeader"; studentId: string; groupId: string };

async function resolveAssignmentActorContext(
  festivalId: string,
  options?: { requireWritable?: boolean },
): Promise<AssignmentActorContext> {
  const session = await getSession();
  if (session?.userId) {
    await assertFestivalAccess(session, festivalId, {
      requireWritable: options?.requireWritable,
    });
    return { type: "user", userId: session.userId };
  }

  const tlSession = await getTeamLeaderSessionFromCookie();
  if (
    !tlSession ||
    tlSession.revokedAt ||
    parseStoredInstant(tlSession.expiresAt) <= new Date() ||
    !tlSession.student?.isTeamLeader ||
    tlSession.festivalId !== festivalId ||
    !tlSession.student.groupId
  ) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  return {
    type: "teamLeader",
    studentId: tlSession.studentId,
    groupId: tlSession.student.groupId,
  };
}

export async function getAssignmentsAction(festivalId: string) {
  const actor = await resolveAssignmentActorContext(festivalId);
  const all = await AssignmentService.getAll(festivalId);
  if (actor.type === "user") return all;
  return all.filter((a: any) => {
    const groupId =
      a?.groupId ??
      a?.group?.id ??
      a?.student?.groupId ??
      a?.student?.group?.id;
    return groupId === actor.groupId;
  });
}

export async function createAssignmentAction(
  festivalId: string,
  data: {
    programmeId: string;
    studentId?: string;
    groupId?: string;
    teamNumber?: number;
  },
) {
  const actorContext = await resolveAssignmentActorContext(festivalId, {
    requireWritable: true,
  });
  const actor =
    actorContext.type === "user"
      ? await getActorForCreatedBy(actorContext.userId)
      : {
          createdByEmail: undefined,
          createdByName: "Team Leader",
        };

  const festival = await findFestivalById(festivalId);
  await assertFestivalMutationAllowed(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

  // Validate Dependencies
  const [categoryCount, groupCount, programmeCount, studentCount] =
    await Promise.all([
      db
        .select({ c: count() })
        .from(categoryTable)
        .where(eq(categoryTable.festivalId, festivalId)),
      db
        .select({ c: count() })
        .from(groupTable)
        .where(eq(groupTable.festivalId, festivalId)),
      db
        .select({ c: count() })
        .from(programmeTable)
        .where(eq(programmeTable.festivalId, festivalId)),
      db
        .select({ c: count() })
        .from(studentTable)
        .where(eq(studentTable.festivalId, festivalId)),
    ]);

  if (
    categoryCount[0].c === 0 ||
    groupCount[0].c === 0 ||
    programmeCount[0].c === 0 ||
    studentCount[0].c === 0
  ) {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DEPENDENCIES_MISSING);
  }

  if (actorContext.type === "teamLeader" && data.studentId) {
    const student = await db.query.student.findFirst({
      where: eq(studentTable.id, data.studentId),
      columns: { id: true, festivalId: true, groupId: true },
    });
    if (
      !student ||
      student.festivalId !== festivalId ||
      student.groupId !== actorContext.groupId
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
  }

  return AssignmentService.create(festivalId, data, actor);
}

export async function bulkCreateAssignmentAction(
  festivalId: string,
  assignments: {
    programmeId: string;
    studentId: string;
    teamNumber?: number;
  }[],
) {
  const actorContext = await resolveAssignmentActorContext(festivalId, {
    requireWritable: true,
  });
  const actor =
    actorContext.type === "user"
      ? await getActorForCreatedBy(actorContext.userId)
      : {
          createdByEmail: undefined,
          createdByName: "Team Leader",
        };

  const festival = await findFestivalById(festivalId);
  await assertFestivalMutationAllowed(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

  if (assignments.length === 0) return [];

  if (actorContext.type === "teamLeader") {
    const studentIds = Array.from(new Set(assignments.map((a) => a.studentId)));
    const students = await db.query.student.findMany({
      where: and(
        eq(studentTable.festivalId, festivalId),
        inArray(studentTable.id, studentIds),
      ),
      columns: { id: true, festivalId: true, groupId: true },
    });
    if (
      students.length !== studentIds.length ||
      students.some(
        (s) =>
          s.festivalId !== festivalId || s.groupId !== actorContext.groupId,
      )
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
  }

  return AssignmentService.bulkCreate(festivalId, assignments, actor);
}

export async function deleteAssignmentAction(festivalId: string, id: string) {
  const actorContext = await resolveAssignmentActorContext(festivalId, {
    requireWritable: true,
  });

  const festival = await findFestivalById(festivalId);
  await assertFestivalMutationAllowed(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

  if (actorContext.type === "teamLeader") {
    const assignment = await db.query.programmeAssignment.findFirst({
      where: eq(assignmentTable.id, id),
      with: { student: true, group: true },
    });
    const assignmentGroupId =
      assignment?.groupId ??
      assignment?.student?.groupId ??
      assignment?.group?.id;
    if (
      !assignment ||
      assignment.festivalId !== festivalId ||
      assignmentGroupId !== actorContext.groupId
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
  }

  return AssignmentService.delete(id, festivalId);
}

export async function deleteTeamAssignmentAction(
  festivalId: string,
  programmeId: string,
  groupId: string,
  teamNumber: number,
) {
  const actorContext = await resolveAssignmentActorContext(festivalId, {
    requireWritable: true,
  });

  const festival = await findFestivalById(festivalId);
  await assertFestivalMutationAllowed(festivalId);

  assertAssignmentWindowOpen(festival);

  if (actorContext.type === "teamLeader" && groupId !== actorContext.groupId) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  return AssignmentService.deleteByTeam(
    festivalId,
    programmeId,
    groupId,
    teamNumber,
  );
}

export async function updateAssignmentAction(
  festivalId: string,
  id: string,
  data: {
    programmeId?: string;
    studentId?: string;
    groupId?: string;
  },
) {
  const actorContext = await resolveAssignmentActorContext(festivalId, {
    requireWritable: true,
  });

  const festival = await findFestivalById(festivalId);
  await assertFestivalMutationAllowed(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival);

  if (actorContext.type === "teamLeader") {
    const existing = await db.query.programmeAssignment.findFirst({
      where: eq(assignmentTable.id, id),
      with: { student: true, group: true },
    });
    const existingGroupId =
      existing?.groupId ?? existing?.student?.groupId ?? existing?.group?.id;
    if (
      !existing ||
      existing.festivalId !== festivalId ||
      existingGroupId !== actorContext.groupId
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    if (data.studentId) {
      const student = await db.query.student.findFirst({
        where: eq(studentTable.id, data.studentId),
        columns: { festivalId: true, groupId: true },
      });
      if (
        !student ||
        student.festivalId !== festivalId ||
        student.groupId !== actorContext.groupId
      ) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN);
      }
    }
  }

  return AssignmentService.update(id, festivalId, data);
}

export type ProgrammeTeamMember = {
  id: string;
  name: string;
  chestNumber?: string | null;
  categoryName?: string;
};

export async function getProgrammeTeamMembersAction(
  festivalId: string,
  programmeId: string,
  groupId: string,
  teamNumber: number,
): Promise<ProgrammeTeamMember[]> {
  const session = await getSession();
  if (session?.userId) {
    await assertFestivalAccess(session, festivalId);
    return AssignmentService.getTeamMembers(
      festivalId,
      programmeId,
      groupId,
      teamNumber,
    );
  }

  const tlSession = await getTeamLeaderSessionFromCookie();
  if (
    !tlSession ||
    tlSession.revokedAt ||
    parseStoredInstant(tlSession.expiresAt) <= new Date() ||
    !tlSession.student?.isTeamLeader ||
    tlSession.festivalId !== festivalId ||
    tlSession.student.groupId !== groupId
  ) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  return AssignmentService.getTeamMembers(
    festivalId,
    programmeId,
    groupId,
    teamNumber,
  );
}
