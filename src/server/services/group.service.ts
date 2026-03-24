import { prisma as db } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { findFestivalById } from "@/server/models/festival.model";
import {
  createGroup,
  deleteGroup,
  findGroupById,
  findGroupsByFestival,
  updateGroup,
} from "@/server/models/group.model";

export const GroupService = {
  async getAll(festivalId: string) {
    return findGroupsByFestival(festivalId);
  },

  async create(
    festivalId: string,
    data: {
      name: string;
      seriesStart?: number;
      color?: string;
    },
  ) {
    const festival = await findFestivalById(festivalId);
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    if (festival.status === "EXPIRED") {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);
    }

    const defaultColors = [
      "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
      "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
    ];
    const randomColor =
      data.color ||
      defaultColors[Math.floor(Math.random() * defaultColors.length)];

    return createGroup({
      festival: { connect: { id: festivalId } },
      name: data.name,
      color: randomColor,
      seriesStart: data.seriesStart || 100,
    });
  },

  async update(
    id: string,
    festivalId: string,
    data: {
      name?: string;
      seriesStart?: number;
      color?: string;
      teamLeaderIds?: string[];
    },
  ) {
    const exists = await findGroupById(id);
    if (!exists || exists.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.GROUP_NOT_FOUND);

    if (data.teamLeaderIds !== undefined) {
      const festival = await findFestivalById(festivalId);
      if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

      const leaderLimit = Math.max(1, Number(festival.teamLeaderLimit ?? 2));
      if (data.teamLeaderIds.length > leaderLimit) {
        throw new AppError(
          `Team leader limit exceeded. Maximum allowed is ${leaderLimit}.`,
        );
      }

      if (data.teamLeaderIds.length > 0) {
        const selectedStudents = await db.student.findMany({
          where: {
            id: { in: data.teamLeaderIds },
            groupId: id,
            festivalId,
          },
          select: { id: true, phone: true },
        });

        if (selectedStudents.length !== data.teamLeaderIds.length) {
          throw new AppError(ERROR_MESSAGES.STUDENT_INVALID_GROUP);
        }

        const invalidPhoneLeader = selectedStudents.find(
          (s) => !s.phone || s.phone.trim().length < 6,
        );
        if (invalidPhoneLeader) {
          throw new AppError(
            "Selected leaders must have a valid phone number.",
          );
        }
      }

      await db.$transaction(async (tx) => {
        await tx.student.updateMany({
          where: { groupId: id },
          data: { isTeamLeader: false },
        });

        if (data.teamLeaderIds && data.teamLeaderIds.length > 0) {
          await tx.student.updateMany({
            where: {
              id: { in: data.teamLeaderIds },
              groupId: id,
            },
            data: { isTeamLeader: true },
          });
        }
      });
    }

    const { teamLeaderIds, ...groupData } = data;
    return updateGroup(id, groupData);
  },

  async delete(id: string, festivalId: string) {
    const exists = await findGroupById(id);
    if (!exists || exists.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.GROUP_NOT_FOUND);

    // QA-6 fix: explicit count query instead of (exists as any)._count
    const studentCount = await db.student.count({ where: { groupId: id } });
    if (studentCount > 0) {
      throw new AppError(ERROR_MESSAGES.GROUP_HAS_STUDENTS);
    }

    return deleteGroup(id);
  },
};
