import { and, count, eq, ilike, ne } from "drizzle-orm";
import { TIER_CONFIG } from "@/config/pricing";
import { db } from "@/core/database/client";
import { participant as participants } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { generateProfileSlug } from "@/core/utils/slug";
import { findCategoryById } from "@/features/categories/repositories/category.repository";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { UsageCounterService } from "@/features/festivals/services/usage-counter.service";
import { findGroupById } from "@/features/groups/repositories/group.repository";
import {
  createParticipant,
  deleteParticipant,
  findParticipantById,
  findParticipantsByFestival,
  updateParticipant,
} from "@/features/participants/repositories/participant.repository";
import { getResolvedTier } from "@/features/plan-features/services/tier";

export const ParticipantService = {
  async getAll(festivalId: string, groupId?: string) {
    return findParticipantsByFestival(festivalId, groupId);
  },

  async create(
    festivalId: string,
    data: {
      name: string;
      email?: string;
      phone?: string;
      groupId: string;
      categoryId: string;
      gender?: "MALE" | "FEMALE" | "OTHER";
      dateOfBirth: string;
      standard?: string;
    },
  ) {
    const festival = await findFestivalById(festivalId);
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    if (festival.status === "EXPIRED")
      throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);

    // Global uniqueness check: Name must be unique within the festival (all groups/categories)
    const normalizedName = data.name.trim();
    const existingName = await db.query.participant.findFirst({
      where: and(
        eq(participants.festivalId, festivalId),
        ilike(participants.name, normalizedName),
      ),
      columns: { id: true },
    });

    if (existingName) {
      throw new AppError(
        "A participant with this name already exists in the festival.",
      );
    }

    // 1. Group Validation
    const group = await findGroupById(data.groupId);
    if (!group || group.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.PARTICIPANT_INVALID_GROUP);

    // 2. Category Validation
    const category = await findCategoryById(data.categoryId);
    if (!category || category.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.PARTICIPANT_INVALID_CATEGORY);

    // 3. Limit Check & Increment (Atomic)
    const [{ participantCount }] = await db
      .select({ participantCount: count() })
      .from(participants)
      .where(eq(participants.festivalId, festivalId));

    const tierLimit =
      TIER_CONFIG[getResolvedTier(festival.tier)].limits.participants;
    if (participantCount >= tierLimit) {
      throw new AppError(ERROR_MESSAGES.PARTICIPANT_LIMIT_REACHED);
    }

    await UsageCounterService.incrementUsage(festivalId, "participants", 1);

    // 4. Create (no profileSlug yet — set after we have id)
    const created = await createParticipant({
      festivalId,
      groupId: data.groupId,
      categoryId: data.categoryId,
      name: normalizedName,
      gender: data.gender ?? "MALE",
      email: data.email || undefined,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      standard: data.standard,
    });

    // 5. Set unique profileSlug for public URL /{festivalSlug}/{profileSlug}
    let profileSlug = generateProfileSlug(
      created.name,
      created.id,
      created.chestNumber,
    );
    let slugExists = await db.query.participant.findFirst({
      where: and(
        eq(participants.festivalId, festivalId),
        eq(participants.profileSlug, profileSlug),
      ),
      columns: { id: true },
    });
    let suffix = 2;
    while (slugExists) {
      profileSlug = `${generateProfileSlug(created.name, created.id, created.chestNumber)}-${suffix}`;
      slugExists = await db.query.participant.findFirst({
        where: and(
          eq(participants.festivalId, festivalId),
          eq(participants.profileSlug, profileSlug),
        ),
        columns: { id: true },
      });
      suffix++;
    }

    return updateParticipant(created.id, { profileSlug });
  },

  async update(
    id: string,
    festivalId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      groupId?: string;
      categoryId?: string;
      gender?: "MALE" | "FEMALE" | "OTHER";
      dateOfBirth?: string;
      standard?: string;
    },
  ) {
    const existing = await findParticipantById(id);
    if (!existing || existing.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);

    const normalizedName = (data.name || existing.name).trim();

    const existingName = await db.query.participant.findFirst({
      where: and(
        eq(participants.festivalId, festivalId),
        ilike(participants.name, normalizedName),
        ne(participants.id, id),
      ),
      columns: { id: true },
    });

    if (existingName) {
      throw new AppError(
        "A participant with this name already exists in the festival.",
      );
    }

    if (data.groupId) {
      const group = await findGroupById(data.groupId);
      if (!group || group.festivalId !== festivalId)
        throw new AppError(ERROR_MESSAGES.PARTICIPANT_INVALID_GROUP);
    }
    if (data.categoryId) {
      const category = await findCategoryById(data.categoryId);
      if (!category || category.festivalId !== festivalId)
        throw new AppError(ERROR_MESSAGES.PARTICIPANT_INVALID_CATEGORY);
    }

    // Update profileSlug if Name changes
    let profileSlug = existing.profileSlug;
    if (data.name && data.name.trim() !== existing.name) {
      const newName = data.name.trim();
      const baseSlug = generateProfileSlug(
        newName,
        existing.id,
        existing.chestNumber,
      );
      profileSlug = baseSlug;
      let slugExists = await db.query.participant.findFirst({
        where: and(
          eq(participants.festivalId, festivalId),
          eq(participants.profileSlug, profileSlug),
          ne(participants.id, id),
        ),
        columns: { id: true },
      });
      let suffix = 2;
      while (slugExists) {
        profileSlug = `${baseSlug}-${suffix}`;
        slugExists = await db.query.participant.findFirst({
          where: and(
            eq(participants.festivalId, festivalId),
            eq(participants.profileSlug, profileSlug),
            ne(participants.id, id),
          ),
          columns: { id: true },
        });
        suffix++;
      }
    }

    return updateParticipant(id, {
      name: data.name,
      groupId: data.groupId,
      categoryId: data.categoryId,
      email: data.email,
      phone: data.phone,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      standard: data.standard,
      profileSlug: profileSlug ?? undefined,
    });
  },

  async delete(id: string, festivalId: string) {
    const exists = await findParticipantById(id);
    if (!exists || exists.festivalId !== festivalId)
      throw new AppError(ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);

    await UsageCounterService.incrementUsage(festivalId, "participants", -1);

    return deleteParticipant(id);
  },
};
