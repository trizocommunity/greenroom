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
    data: { name: string; type: "SCHOOL" | "COLLEGE" | "MADRASA" | "OPEN" },
  ) {
    const festival = await findFestivalById(festivalId);
    if (!festival) throw new Error("Festival not found");
    if (festival.status === "EXPIRED") {
      throw new Error("Festival is expired");
    }

    return createGroup({
      festival: { connect: { id: festivalId } },
      name: data.name,
      type: data.type,
    });
  },

  async update(id: string, festivalId: string, data: { name?: string }) {
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
