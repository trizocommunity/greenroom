import { Prisma } from "@prisma/client";
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
    },
  ) {
    const exists = await findGroupById(id);
    if (!exists || exists.festivalId !== festivalId)
      throw new Error("Group not found");

    return updateGroup(id, data);
  },

  async delete(id: string, festivalId: string) {
    const exists = await findGroupById(id);
    if (!exists || exists.festivalId !== festivalId)
      throw new Error("Group not found");

    const partCount = (exists as any)._count?.participants ?? 0;
    if (partCount > 0) {
      throw new Error("Cannot delete group with participants");
    }

    return deleteGroup(id);
  },
};
