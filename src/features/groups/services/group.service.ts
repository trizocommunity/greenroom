import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import { participant as participants } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import {
  createGroup,
  deleteGroup,
  findGroupById,
  findGroupsByFestival,
  updateGroup,
} from "@/features/groups/repositories/group.repository";

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
      "#ef4444",
      "#f97316",
      "#f59e0b",
      "#84cc16",
      "#10b981",
      "#06b6d4",
      "#3b82f6",
      "#6366f1",
      "#8b5cf6",
      "#ec4899",
    ];
    const randomColor =
      data.color ||
      defaultColors[Math.floor(Math.random() * defaultColors.length)];

    return createGroup({
      festivalId,
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
        const selectedParticipants = await db
          .select({ id: participants.id, email: participants.email })
          .from(participants)
          .where(
            and(
              inArray(participants.id, data.teamLeaderIds),
              eq(participants.groupId, id),
              eq(participants.festivalId, festivalId),
            ),
          );

        if (selectedParticipants.length !== data.teamLeaderIds.length) {
          throw new AppError(ERROR_MESSAGES.PARTICIPANT_INVALID_GROUP);
        }

        const invalidEmailLeader = selectedParticipants.find(
          (s) => !s.email || !String(s.email).includes("@"),
        );
        if (invalidEmailLeader) {
          throw new AppError(
            "Selected leaders must have a valid email address.",
          );
        }
      }

      await db.transaction(async (tx) => {
        await tx
          .update(participants)
          .set({ isTeamLeader: false })
          .where(eq(participants.groupId, id));

        if (data.teamLeaderIds && data.teamLeaderIds.length > 0) {
          await tx
            .update(participants)
            .set({ isTeamLeader: true })
            .where(
              and(
                inArray(participants.id, data.teamLeaderIds),
                eq(participants.groupId, id),
              ),
            );
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

    const [{ participantCount }] = await db
      .select({ participantCount: count() })
      .from(participants)
      .where(eq(participants.groupId, id));

    if (participantCount > 0) {
      throw new AppError(ERROR_MESSAGES.GROUP_HAS_PARTICIPANTS);
    }

    return deleteGroup(id);
  },
};
