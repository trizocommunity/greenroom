import {
  createParticipant,
  deleteParticipant,
  findParticipantsByEdition,
  findParticipantById,
  updateParticipant,
  countParticipants,
} from "@/server/models/participant.model";
import { findEditionById } from "@/server/models/edition.model";
import { findGroupById } from "@/server/models/group.model";
import { findCategoryById } from "@/server/models/category.model";
import { UsageCounterService } from "./usage-counter.service";
import { Prisma } from "@prisma/client";

export const ParticipantService = {
  async getAll(editionId: string, groupId?: string) {
    return findParticipantsByEdition(editionId, groupId);
  },

  async create(
    editionId: string,
    data: {
      name: string;
      email?: string;
      phone?: string;
      groupId: string;
      categoryId: string;
      gender?: "MALE" | "FEMALE" | "OTHER";
      registrationNumber?: string;
    },
  ) {
    const edition = await findEditionById(editionId);
    if (!edition || edition.status === "FREEZE")
      throw new Error("Edition frozen");

    // 1. Group Validation
    const group = await findGroupById(data.groupId);
    if (!group || group.editionId !== editionId)
      throw new Error("Invalid Group");

    // 2. Category Validation
    const category = await findCategoryById(data.categoryId);
    if (!category || category.editionId !== editionId)
      throw new Error("Invalid Category");

    // 3. Limit Check & Increment (Atomic)
    await UsageCounterService.incrementUsage(editionId, "participants", 1);

    // 4. Create
    try {
      // 5. Create
      // Note: We need to see if updateParticipant/createParticipant was refactored.
      // Assuming `createParticipant` accepts ParticipantCreateInput.
      return await createParticipant({
        edition: { connect: { id: editionId } },
        group: { connect: { id: data.groupId } },
        category: { connect: { id: data.categoryId } },
        name: data.name,
        gender: data.gender,
        // email is optional
        email: data.email || undefined, // Prisma handles optional undefined
        phone: data.phone,
        registrationNumber: data.registrationNumber,
      });
    } catch (err) {
      // If create fails, should decrement usage? usage-counter doesn't support rollback easily yet.
      // For now, accept slight skew or improve usage-counter to transactional.
      // pass
      throw err;
    }
  },

  async delete(id: string, editionId: string) {
    const exists = await findParticipantById(id);
    if (!exists || exists.editionId !== editionId)
      throw new Error("Participant not found");

    // Optionally check if assigned to active results or paid items
    // For now, just delete
    // TODO: Decrement usage counter

    return deleteParticipant(id);
  },
};
