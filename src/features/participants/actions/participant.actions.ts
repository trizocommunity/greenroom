"use server";

import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { TIER_CONFIG } from "@/config/pricing";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  group as groupTable,
  participant as participantTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { assignChestNumberForNewParticipant } from "@/features/participants/actions/chest-number.actions";
import { ParticipantService } from "@/features/participants/services/participant.service";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { getResolvedTier } from "@/features/plan-features/services/tier";

export async function getParticipantsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return ParticipantService.getAll(festivalId);
}

export async function createParticipantWithServiceAction(
  festivalId: string,
  data: {
    name: string;
    groupId: string;
    categoryId: string;
    email?: string;
    phone?: string;
    gender?: string;
    dateOfBirth: string;
    standard?: string;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  const [groupCountResult] = await db
    .select({ c: count() })
    .from(groupTable)
    .where(eq(groupTable.festivalId, festivalId));

  const [categoryCountResult] = await db
    .select({ c: count() })
    .from(categoryTable)
    .where(eq(categoryTable.festivalId, festivalId));

  if (groupCountResult.c === 0 || categoryCountResult.c === 0) {
    throw new AppError(
      "Create groups and categories before adding participants.",
      "GROUPS_OR_CATEGORIES_MISSING",
    );
  }

  const newParticipant = await ParticipantService.create(festivalId, {
    name: data.name,
    groupId: data.groupId,
    categoryId: data.categoryId,
    email: data.email,
    phone: data.phone,
    gender: (data.gender as "MALE" | "FEMALE" | "OTHER") || "MALE",
    dateOfBirth: data.dateOfBirth,
    standard: data.standard,
  });
  await assignChestNumberForNewParticipant(festivalId, newParticipant.id);
  try {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/participants`);
  } catch (error) {
    console.error("[revalidatePath] participants page", error);
  }
  return newParticipant;
}

export async function validateParticipantsAction(
  festivalId: string,
  candidates: {
    name: string;
    email?: string;
    categoryId: string;
    groupId: string;
  }[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  if (candidates.length === 0) return {};

  const emails = candidates
    .map((c) => c.email?.trim().toLowerCase())
    .filter((e): e is string => !!e);

  // Build conditions for name checks (global across groups/categories)
  const nameConditions = candidates
    .filter((c) => c.name)
    .map((c) =>
      eq(sql`LOWER(${participantTable.name})`, c.name.trim().toLowerCase()),
    );

  const conditions = [];
  if (emails.length > 0)
    conditions.push(inArray(participantTable.email, emails));
  if (nameConditions.length > 0) conditions.push(or(...nameConditions));

  const existingParticipants = await db.query.participant.findMany({
    where: and(eq(participantTable.festivalId, festivalId), or(...conditions)),
    columns: { name: true, email: true },
  });

  const conflicts: Record<string, string> = {};
  existingParticipants.forEach((s) => {
    if (s.email) {
      const emailMatch = emails.find((e) => e === s.email?.toLowerCase());
      if (emailMatch) {
        conflicts[`email:${s.email.toLowerCase()}`] = "Email already exists";
      }
    }

    const nameMatch = candidates.find(
      (c) => c.name.trim().toLowerCase() === s.name.toLowerCase(),
    );
    if (nameMatch) {
      conflicts[`name:${s.name.toLowerCase()}`] =
        "A participant with this name already exists in the festival";
    }
  });

  return conflicts;
}

export async function bulkCreateParticipantsAction(
  festivalId: string,
  participants: {
    name: string;
    groupId: string;
    categoryId: string;
    gender?: string;
    email?: string;
    phone?: string;
    dateOfBirth: string;
    standard?: string;
  }[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  const tierLimit =
    TIER_CONFIG[getResolvedTier(festival.tier as any)].limits.participants;
  const [currentCountResult] = await db
    .select({ c: count() })
    .from(participantTable)
    .where(eq(participantTable.festivalId, festivalId));

  if (currentCountResult.c + participants.length > tierLimit) {
    return {
      success: false,
      successCount: 0,
      errors: [
        {
          name: "ALL",
          error: `Batch exceeds limit. You can add ${tierLimit - currentCountResult.c} more.`,
        },
      ],
    };
  }

  let successCount = 0;
  const errors: { name: string; error: string }[] = [];

  for (const participant of participants) {
    try {
      const newParticipant = await ParticipantService.create(festivalId, {
        name: participant.name,
        groupId: participant.groupId,
        categoryId: participant.categoryId,
        email: participant.email,
        phone: participant.phone,
        gender: (participant.gender as "MALE" | "FEMALE" | "OTHER") || "MALE",
        dateOfBirth: participant.dateOfBirth,
        standard: participant.standard,
      });
      await assignChestNumberForNewParticipant(festivalId, newParticipant.id);
      successCount++;
    } catch (error: unknown) {
      errors.push({
        name: participant.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  try {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/participants`);
  } catch (error) {
    console.error("[revalidatePath] participants page", error);
  }

  return { success: true, successCount, errors };
}

export async function deleteParticipantWithServiceAction(
  festivalId: string,
  id: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const result = await ParticipantService.delete(id, festivalId);
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/participants`);
  }
  return result;
}

export async function updateParticipantAction(
  festivalId: string,
  id: string,
  data: {
    name?: string;
    groupId?: string;
    categoryId?: string;
    email?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    standard?: string;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const result = await ParticipantService.update(id, festivalId, {
    name: data.name,
    groupId: data.groupId,
    categoryId: data.categoryId,
    email: data.email,
    phone: data.phone,
    gender: data.gender as any,
    dateOfBirth: data.dateOfBirth,
    standard: data.standard,
  });
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/participants`);
  }
  return result;
}

export async function exportParticipantsToExcelAction(
  festivalId: string,
): Promise<
  | { success: true; data: string; filename: string }
  | { success: false; error: string }
> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival)
    return { success: false, error: ERROR_MESSAGES.FESTIVAL_NOT_FOUND };

  if (
    !FeatureService.isFeatureEnabled(
      getTierForFeatureCheck(festival.tier as any),
      "excelExport",
    )
  ) {
    return {
      success: false,
      error: "Excel export is not available on your plan. Upgrade to export.",
    };
  }

  const participants = await db.query.participant.findMany({
    where: eq(participantTable.festivalId, festivalId),
    with: { group: true, category: true },
    orderBy: [asc(sql`group.name`), asc(participantTable.name)], // This might need careful check on group.name sort
  });

  const XLSX = await import("xlsx");
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Group",
    "Category",
    "Chest Number",
    "Gender",
    "Date of Birth",
    "Standard",
  ];
  const rows = participants.map((s) => [
    s.name ?? "",
    s.email ?? "",
    s.phone ?? "",
    s.group?.name ?? "",
    s.category?.name ?? "",
    s.chestNumber ?? "",
    s.gender ?? "",
    s.dateOfBirth ?? "",
    s.standard ?? "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const base64 = buf.toString("base64");
  const filename = `participants_${festival.slug}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { success: true, data: base64, filename };
}
