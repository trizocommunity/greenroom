import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  stageManagerAssignment as assignmentTable,
  festivalMember as festivalMemberTable,
  festival as festivalTable,
  stage as stageTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";

export interface AccessSession {
  userId?: string | null;
  role?: string | null;
}

export const StageAssignmentService = {
  async listForFestival(festivalId: string) {
    return db.query.stageManagerAssignment.findMany({
      where: eq(assignmentTable.festivalId, festivalId),
      with: {
        stage: { columns: { id: true, name: true } },
        member: {
          columns: { id: true, role: true, isActive: true },
          with: {
            user: {
              columns: { displayName: true, fullName: true, email: true },
            },
          },
        },
      },
    });
  },

  /** Assigned stage ids for the festival_member matching (festivalId, userId). Empty = not yet assigned. */
  async getAssignedStageIds(
    festivalId: string,
    userId: string,
  ): Promise<string[]> {
    const member = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMemberTable.festivalId, festivalId),
        eq(festivalMemberTable.userId, userId),
      ),
      columns: { id: true },
    });
    if (!member) return [];

    const rows = await db.query.stageManagerAssignment.findMany({
      where: eq(assignmentTable.memberId, member.id),
      columns: { stageId: true },
    });
    return rows.map((row) => row.stageId);
  },

  /**
   * "all" for SUPER_ADMIN, the festival owner, or an ADMIN member.
   * Otherwise (STAGE_MANAGER) the specific stage ids they're assigned to — may be empty.
   */
  async getAccessibleStageIds(
    festivalId: string,
    session: AccessSession | null,
  ): Promise<string[] | "all"> {
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    if (session.role === "SUPER_ADMIN") return "all";

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: { ownerId: true },
    });
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    if (festival.ownerId === session.userId) return "all";

    const member = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMemberTable.festivalId, festivalId),
        eq(festivalMemberTable.userId, session.userId),
      ),
      columns: { id: true, role: true, isActive: true },
    });
    if (!member?.isActive) throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    if (member.role === "ADMIN") return "all";

    const rows = await db.query.stageManagerAssignment.findMany({
      where: eq(assignmentTable.memberId, member.id),
      columns: { stageId: true },
    });
    return rows.map((row) => row.stageId);
  },

  /** Only SUPER_ADMIN, the festival owner, or an ADMIN member may manage stage assignments. */
  async assertCanManageAssignments(
    festivalId: string,
    session: AccessSession | null,
  ): Promise<void> {
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    if (session.role === "SUPER_ADMIN") return;

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: { ownerId: true },
    });
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    if (festival.ownerId === session.userId) return;

    const member = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMemberTable.festivalId, festivalId),
        eq(festivalMemberTable.userId, session.userId),
      ),
      columns: { isActive: true, role: true },
    });
    if (!member?.isActive || member.role !== "ADMIN") {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
  },

  async assign(festivalId: string, stageId: string, memberId: string) {
    const [stage, member] = await Promise.all([
      db.query.stage.findFirst({
        where: eq(stageTable.id, stageId),
        columns: { id: true, festivalId: true },
      }),
      db.query.festivalMember.findFirst({
        where: eq(festivalMemberTable.id, memberId),
        columns: { id: true, festivalId: true, role: true },
      }),
    ]);
    if (!stage || stage.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    }
    if (!member || member.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }
    if (member.role !== "STAGE_MANAGER") {
      throw new AppError(
        "Only Stage Manager members can be assigned to a stage.",
      );
    }

    const existing = await db.query.stageManagerAssignment.findFirst({
      where: and(
        eq(assignmentTable.stageId, stageId),
        eq(assignmentTable.memberId, memberId),
      ),
    });
    if (existing) return existing;

    const [row] = await db
      .insert(assignmentTable)
      .values({ id: randomUUID(), festivalId, stageId, memberId })
      .returning();
    return row;
  },

  async unassign(festivalId: string, assignmentId: string) {
    const existing = await db.query.stageManagerAssignment.findFirst({
      where: eq(assignmentTable.id, assignmentId),
      columns: { id: true, festivalId: true },
    });
    if (!existing || existing.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    }
    await db
      .delete(assignmentTable)
      .where(eq(assignmentTable.id, assignmentId));
  },
};
