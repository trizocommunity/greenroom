import { prisma as db } from "@/lib/db";
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
    if (!festival) throw new Error("Festival not found");
    if (festival.status === "EXPIRED") {
      throw new Error("Festival is expired");
    }

    // Simple random color if not provided
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
      throw new Error("Group not found");

    // If teamLeaderIds provided, we update students
    if (data.teamLeaderIds) {
      await db.$transaction(async (tx) => {
        // 1. Reset all students in this group
        await tx.student.updateMany({
          where: { groupId: id },
          data: { isTeamLeader: false },
        });

        // 2. Set new team leaders
        if (data.teamLeaderIds && data.teamLeaderIds.length > 0) {
          await tx.student.updateMany({
            where: {
              id: { in: data.teamLeaderIds },
              groupId: id, // Ensure they belong to this group
            },
            data: { isTeamLeader: true },
          });
        }
      });
    }

    // Remove teamLeaderIds from data passed to updateGroup
    const { teamLeaderIds, ...groupData } = data;
    return updateGroup(id, groupData);
  },

  async delete(id: string, festivalId: string) {
    const exists = await findGroupById(id);
    if (!exists || exists.festivalId !== festivalId)
      throw new Error("Group not found");

    const studentCount = (exists as any)._count?.students ?? 0;
    if (studentCount > 0) {
      throw new Error("Cannot delete group with students");
    }

    return deleteGroup(id);
  },

  async bulkCreate(festivalId: string, groups: { name: string }[]) {
    const festival = await findFestivalById(festivalId);
    if (!festival) throw new Error("Festival not found");
    if (festival.status === "EXPIRED") throw new Error("Festival is expired");

    // Deduplicate against existing groups
    const existingGroups = await findGroupsByFestival(festivalId);
    const existingNames = new Set(
      existingGroups.map((g) => g.name.toLowerCase()),
    );

    const duplicates = groups.filter((g) =>
      existingNames.has(g.name.toLowerCase()),
    );
    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate groups found: ${duplicates.map((d) => d.name).join(", ")}`,
      );
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

    const data = groups.map((g) => ({
      festivalId,
      name: g.name,
      seriesStart: 100, // Default
      color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
    }));

    return db.group.createMany({
      data,
    });
  },
};
