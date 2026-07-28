import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  festivalMember as festivalMemberTable,
  judge as judgeTable,
  judgeStageAssignment as assignmentTable,
  stage as stageTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { StageAssignmentService } from "./stage-assignment.service";

export interface AccessSession {
  userId?: string | null;
  role?: string | null;
}

export const JudgeStageAssignmentService = {
  async listForFestival(festivalId: string) {
    return db.query.judgeStageAssignment.findMany({
      where: eq(assignmentTable.festivalId, festivalId),
      with: {
        stage: { columns: { id: true, name: true } },
        judge: { columns: { id: true, name: true } },
      },
    });
  },

  /**
   * SUPER_ADMIN, the festival owner, or an ADMIN member may assign a judge
   * to any stage. A STAGE_MANAGER may only assign a judge to stage(s) they
   * themselves are assigned to.
   */
  async assertCanManageAssignment(
    festivalId: string,
    session: AccessSession | null,
    stageId: string,
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
    if (!member?.isActive) throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    if (member.role === "ADMIN") return;
    if (member.role !== "STAGE_MANAGER") {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    const assignedStageIds = await StageAssignmentService.getAssignedStageIds(
      festivalId,
      session.userId,
    );
    if (!assignedStageIds.includes(stageId)) {
      throw new AppError("You can only assign judges to your own stage(s).");
    }
  },

  async assign(festivalId: string, stageId: string, judgeId: string) {
    const [stage, judge] = await Promise.all([
      db.query.stage.findFirst({
        where: eq(stageTable.id, stageId),
        columns: { id: true, festivalId: true },
      }),
      db.query.judge.findFirst({
        where: eq(judgeTable.id, judgeId),
        columns: { id: true, festivalId: true },
      }),
    ]);
    if (!stage || stage.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    }
    if (!judge || judge.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    }

    const existing = await db.query.judgeStageAssignment.findFirst({
      where: and(
        eq(assignmentTable.stageId, stageId),
        eq(assignmentTable.judgeId, judgeId),
      ),
    });
    if (existing) return existing;

    const [row] = await db
      .insert(assignmentTable)
      .values({ id: randomUUID(), festivalId, stageId, judgeId })
      .returning();
    return row;
  },

  async getById(assignmentId: string) {
    return db.query.judgeStageAssignment.findFirst({
      where: eq(assignmentTable.id, assignmentId),
      columns: { id: true, festivalId: true, stageId: true, judgeId: true },
    });
  },

  async unassign(festivalId: string, assignmentId: string) {
    const existing = await this.getById(assignmentId);
    if (!existing || existing.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    }
    await db
      .delete(assignmentTable)
      .where(eq(assignmentTable.id, assignmentId));
  },
};
