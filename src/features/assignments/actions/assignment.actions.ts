"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getParticipantSessionFromCookie } from "@/core/auth/participant-session";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  category as categoryTable,
  group as groupTable,
  participant as participantTable,
  programme as programmeTable,
  user as userTable,
} from "@/core/database/schema";
import { isExpired } from "@/core/datetime";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import type { BulkAssignmentInput } from "@/features/assignments/services/assignment.service";
import { AssignmentService } from "@/features/assignments/services/assignment.service";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import {
  isTeamLeaderActionWindowOpen,
  resolveDeadlineWindow,
} from "@/features/festivals/services/deadline-window";
import { assertFestivalMutationAllowed } from "@/features/festivals/services/festival-lifecycle-policy.service";

function auditActorForContext(actorContext: AssignmentActorContext) {
  return actorContext.type === "user"
    ? undefined
    : { actorId: actorContext.participantId, actorRole: "TEAM_LEADER" };
}

export async function resolveAppointerContext(
  actorContext: AssignmentActorContext,
) {
  if (actorContext.type === "user") {
    const actor = await getActorForCreatedBy(actorContext.userId);
    return {
      appointedBy: actorContext.userId,
      appointedByRole: "ADMIN" as const,
      appointedByName: actor.createdByName,
      appointedByEmail: actor.createdByEmail,
    };
  }
  return {
    appointedBy: actorContext.participantId,
    appointedByRole: "TEAM_LEADER" as const,
    appointedByName: "Team Leader",
    appointedByEmail: undefined,
  };
}

export async function getActorForCreatedBy(userId: string) {
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

/**
 * The assignment window gates Team Leaders only — organisers keep full
 * control of assignments from the dashboard at any time.
 */
function assertAssignmentWindowOpen(
  festival:
    | {
        programmeAssignmentStartDate?: string | null;
        programmeAssignmentDeadline?: string | null;
      }
    | null
    | undefined,
  actorContext: AssignmentActorContext,
) {
  if (actorContext.type === "user") return;

  const { state } = resolveDeadlineWindow({
    start: festival?.programmeAssignmentStartDate,
    end: festival?.programmeAssignmentDeadline,
  });

  if (state === "CLOSED") {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DEADLINE_PASSED);
  }
  if (state === "UPCOMING") {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_WINDOW_NOT_OPEN);
  }
  if (state === "UNCONFIGURED") {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_WINDOW_NOT_CONFIGURED);
  }
  if (
    !isTeamLeaderActionWindowOpen({
      start: festival?.programmeAssignmentStartDate,
      end: festival?.programmeAssignmentDeadline,
    })
  ) {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_WINDOW_NOT_CONFIGURED);
  }
}

/**
 * Per-window permission gate for Team Leaders, applied *after* the window is
 * confirmed open. Organisers (`type === "user"`) are never gated. The
 * assignment window carries `add` (assign programmes) and `delete` (remove
 * assignments) — there is no edit.
 */
function assertAssignmentPermission(
  festival:
    | {
        programmeAssignmentCanAdd?: boolean | null;
        programmeAssignmentCanDelete?: boolean | null;
      }
    | null
    | undefined,
  actorContext: AssignmentActorContext,
  action: "add" | "delete",
) {
  if (actorContext.type === "user") return;

  if (action === "add" && festival?.programmeAssignmentCanAdd === false) {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_ADD_NOT_PERMITTED);
  }
  if (action === "delete" && festival?.programmeAssignmentCanDelete === false) {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DELETE_NOT_PERMITTED);
  }
}

export type AssignmentActorContext =
  | { type: "user"; userId: string }
  | { type: "teamLeader"; participantId: string; groupId: string };

export async function resolveAssignmentActorContext(
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

  const tlSession = await getParticipantSessionFromCookie();
  if (
    !tlSession ||
    tlSession.revokedAt ||
    isExpired(tlSession.expiresAt) ||
    !tlSession.participant?.isTeamLeader ||
    tlSession.festivalId !== festivalId ||
    !tlSession.participant.groupId
  ) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  return {
    type: "teamLeader",
    participantId: tlSession.participantId,
    groupId: tlSession.participant.groupId,
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
      a?.participant?.groupId ??
      a?.participant?.group?.id;
    return groupId === actor.groupId;
  });
}

export async function createAssignmentAction(
  festivalId: string,
  data: {
    programmeId: string;
    participantId?: string;
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
  assertAssignmentWindowOpen(festival, actorContext);
  assertAssignmentPermission(festival, actorContext, "add");

  // Validate Dependencies
  const [categoryCount, groupCount, programmeCount, participantCount] =
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
        .from(participantTable)
        .where(eq(participantTable.festivalId, festivalId)),
    ]);

  if (
    categoryCount[0].c === 0 ||
    groupCount[0].c === 0 ||
    programmeCount[0].c === 0 ||
    participantCount[0].c === 0
  ) {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_DEPENDENCIES_MISSING);
  }

  if (actorContext.type === "teamLeader" && data.participantId) {
    const participant = await db.query.participant.findFirst({
      where: eq(participantTable.id, data.participantId),
      columns: { id: true, festivalId: true, groupId: true },
    });
    if (
      !participant ||
      participant.festivalId !== festivalId ||
      participant.groupId !== actorContext.groupId
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
  }

  let created: Awaited<ReturnType<typeof AssignmentService.create>>;
  if (data.participantId) {
    created = await AssignmentService.create(
      festivalId,
      { programmeId: data.programmeId, participantId: data.participantId },
      actor,
    );
  } else if (data.groupId) {
    created = await AssignmentService.create(
      festivalId,
      {
        programmeId: data.programmeId,
        groupId: data.groupId,
        teamNumber: data.teamNumber,
      },
      actor,
    );
  } else {
    throw new AppError(ERROR_MESSAGES.ASSIGNMENT_REQUIRES_PARTICIPANT);
  }
  await createAuditLog({
    action: "ASSIGN_PARTICIPANTS",
    targetType: "PROGRAMME_ASSIGNMENT",
    targetId: created.id,
    metadata: {
      programmeId: data.programmeId,
      participantId: data.participantId,
      groupId: data.groupId,
      teamNumber: data.teamNumber,
    },
    actor: auditActorForContext(actorContext),
  }).catch((err) =>
    console.error("[AuditLog] ASSIGN_PARTICIPANTS failed", err),
  );
  revalidatePath("/", "layout");
  return created;
}

export async function bulkCreateAssignmentAction(
  festivalId: string,
  assignments: BulkAssignmentInput[],
  teamLeadsByTeam?: Record<string, string>,
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
  assertAssignmentWindowOpen(festival, actorContext);
  assertAssignmentPermission(festival, actorContext, "add");

  if (assignments.length === 0) return [];

  if (actorContext.type === "teamLeader") {
    const memberIds = new Set<string>();
    for (const a of assignments) {
      if ("participantId" in a && a.participantId) {
        memberIds.add(a.participantId);
      }
      if ("participantIds" in a && Array.isArray(a.participantIds)) {
        for (const pid of a.participantIds) memberIds.add(pid);
      }
    }
    const participantIds = Array.from(memberIds);
    if (participantIds.length > 0) {
      const participants = await db.query.participant.findMany({
        where: and(
          eq(participantTable.festivalId, festivalId),
          inArray(participantTable.id, participantIds),
        ),
        columns: { id: true, festivalId: true, groupId: true },
      });
      if (
        participants.length !== participantIds.length ||
        participants.some(
          (s) =>
            s.festivalId !== festivalId || s.groupId !== actorContext.groupId,
        )
      ) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN);
      }
    }
  }

  const appointer = await resolveAppointerContext(actorContext);

  const created = await AssignmentService.bulkCreate(
    festivalId,
    assignments,
    actor,
    { teamLeadsByTeam, appointer },
  );
  const countByProgramme = new Map<string, number>();
  for (const row of created) {
    countByProgramme.set(
      row.programmeId,
      (countByProgramme.get(row.programmeId) ?? 0) + 1,
    );
  }
  await Promise.all(
    Array.from(countByProgramme.entries()).map(([programmeId, count]) =>
      createAuditLog({
        action: "ASSIGN_PARTICIPANTS",
        targetType: "PROGRAMME_ASSIGNMENT",
        targetId: programmeId,
        metadata: { programmeId, count },
        actor: auditActorForContext(actorContext),
      }).catch((err) =>
        console.error("[AuditLog] ASSIGN_PARTICIPANTS failed", err),
      ),
    ),
  );
  revalidatePath("/", "layout");
  return created;
}

export async function deleteAssignmentAction(
  festivalId: string,
  id: string,
  replacementLeadParticipantId?: string,
) {
  const actorContext = await resolveAssignmentActorContext(festivalId, {
    requireWritable: true,
  });

  const festival = await findFestivalById(festivalId);
  await assertFestivalMutationAllowed(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival, actorContext);
  assertAssignmentPermission(festival, actorContext, "delete");

  if (actorContext.type === "teamLeader") {
    const assignment = await db.query.programmeAssignment.findFirst({
      where: eq(assignmentTable.id, id),
      with: { participant: true, group: true },
    });
    const assignmentGroupId =
      assignment?.groupId ??
      assignment?.participant?.groupId ??
      assignment?.group?.id;
    if (
      !assignment ||
      assignment.festivalId !== festivalId ||
      assignmentGroupId !== actorContext.groupId
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
  }

  const appointer = await resolveAppointerContext(actorContext);

  const deleted = await AssignmentService.delete(id, festivalId, {
    replacementLeadParticipantId,
    appointer,
  });
  await createAuditLog({
    action: "REMOVE_ASSIGNMENT",
    targetType: "PROGRAMME_ASSIGNMENT",
    targetId: id,
    metadata: {
      programmeId: deleted?.programmeId,
      participantId: deleted?.participantId,
    },
    actor: auditActorForContext(actorContext),
  }).catch((err) => console.error("[AuditLog] REMOVE_ASSIGNMENT failed", err));
  revalidatePath("/", "layout");
  return deleted;
}

export async function removeTeamMemberAction(
  festivalId: string,
  assignmentId: string,
  participantId: string,
  replacementLeadParticipantId?: string,
) {
  const actorContext = await resolveAssignmentActorContext(festivalId, {
    requireWritable: true,
  });

  const festival = await findFestivalById(festivalId);
  await assertFestivalMutationAllowed(festivalId);

  assertAssignmentWindowOpen(festival, actorContext);
  assertAssignmentPermission(festival, actorContext, "delete");

  if (actorContext.type === "teamLeader") {
    const assignment = await db.query.programmeAssignment.findFirst({
      where: eq(assignmentTable.id, assignmentId),
      with: { participant: true, group: true },
    });
    const assignmentGroupId =
      assignment?.groupId ??
      assignment?.participant?.groupId ??
      assignment?.group?.id;
    if (
      !assignment ||
      assignment.festivalId !== festivalId ||
      assignmentGroupId !== actorContext.groupId
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
  }

  const appointer = await resolveAppointerContext(actorContext);

  const deleted = await AssignmentService.removeTeamMember(
    festivalId,
    assignmentId,
    participantId,
    {
      replacementLeadParticipantId,
      appointer,
    },
  );
  await createAuditLog({
    action: "REMOVE_ASSIGNMENT",
    targetType: "PROGRAMME_ASSIGNMENT",
    targetId: assignmentId,
    metadata: {
      participantId,
    },
    actor: auditActorForContext(actorContext),
  }).catch((err) => console.error("[AuditLog] REMOVE_ASSIGNMENT failed", err));
  revalidatePath("/", "layout");
  return deleted;
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

  assertAssignmentWindowOpen(festival, actorContext);
  assertAssignmentPermission(festival, actorContext, "delete");

  if (actorContext.type === "teamLeader" && groupId !== actorContext.groupId) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  const result = await AssignmentService.deleteByTeam(
    festivalId,
    programmeId,
    groupId,
    teamNumber,
  );
  await createAuditLog({
    action: "REMOVE_ASSIGNMENT",
    targetType: "PROGRAMME_ASSIGNMENT",
    targetId: `${programmeId}:${groupId}:${teamNumber}`,
    metadata: { programmeId, groupId, teamNumber, count: result.count },
    actor: auditActorForContext(actorContext),
  }).catch((err) => console.error("[AuditLog] REMOVE_ASSIGNMENT failed", err));
  revalidatePath("/", "layout");
  return result;
}

export async function updateAssignmentAction(
  festivalId: string,
  id: string,
  data: {
    programmeId?: string;
    participantId?: string;
    groupId?: string;
  },
) {
  const actorContext = await resolveAssignmentActorContext(festivalId, {
    requireWritable: true,
  });

  if (actorContext.type === "teamLeader") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  const festival = await findFestivalById(festivalId);
  await assertFestivalMutationAllowed(festivalId);

  // Deadline Check
  assertAssignmentWindowOpen(festival, actorContext);

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

  const tlSession = await getParticipantSessionFromCookie();
  if (
    !tlSession ||
    tlSession.revokedAt ||
    isExpired(tlSession.expiresAt) ||
    !tlSession.participant?.isTeamLeader ||
    tlSession.festivalId !== festivalId ||
    tlSession.participant.groupId !== groupId
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
