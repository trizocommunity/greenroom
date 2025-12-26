import {
  createGroup,
  deleteGroup,
  findGroupsByEdition,
  findGroupById,
  updateGroup,
} from "@/server/models/group.model";
import { findEditionById } from "@/server/models/edition.model";
import { Prisma } from "@prisma/client";

export const GroupService = {
  async getAll(editionId: string) {
    return findGroupsByEdition(editionId);
  },

  async create(
    editionId: string,
    data: { name: string; type: "SCHOOL" | "COLLEGE" | "MADRASA" | "OPEN" },
  ) {
    const edition = await findEditionById(editionId);
    if (
      !edition ||
      edition.status === "FREEZE" ||
      edition.status === "ARCHIVED"
    ) {
      throw new Error("Edition is frozen or invalid");
    }

    return createGroup({
      edition: { connect: { id: editionId } },
      name: data.name,
      type: data.type,
    });
  },

  async update(id: string, editionId: string, data: { name?: string }) {
    const exists = await findGroupById(id);
    if (!exists || exists.editionId !== editionId)
      throw new Error("Group not found");

    return updateGroup(id, data);
  },

  async delete(id: string, editionId: string) {
    const exists = await findGroupById(id);
    if (!exists || exists.editionId !== editionId)
      throw new Error("Group not found");

    const partCount = (exists as any)._count?.participants ?? 0;
    if (partCount > 0) {
      throw new Error("Cannot delete group with participants");
    }

    return deleteGroup(id);
  },
};
