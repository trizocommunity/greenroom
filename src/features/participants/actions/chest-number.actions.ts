"use server";

import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  festival as festivalTable,
  participant as participantTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { generateProfileSlug } from "@/core/utils/slug";

export async function getChestNumberSettings(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { chestNumberSettings: true },
  });
  return festival?.chestNumberSettings as {
    prefix: string;
    nextSequence?: number;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
    numberingStyle?: "ALPHANUMERIC" | "NUMERIC";
  } | null;
}

export async function saveChestNumberSettings(
  festivalId: string,
  settings: {
    prefix: string;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
    numberingStyle?: "ALPHANUMERIC" | "NUMERIC";
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  await db
    .update(festivalTable)
    .set({
      chestNumberSettings: {
        prefix: settings.prefix,
        categories: settings.categories,
        categoryCodes: settings.categoryCodes,
        numberingStyle: settings.numberingStyle || "ALPHANUMERIC",
      },
      updatedAt: serverNowIso(),
    })
    .where(eq(festivalTable.id, festivalId));

  const updatedFestival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { slug: true },
  });

  if (updatedFestival) {
    revalidatePath(
      `/dashboard/${updatedFestival.slug}/pre-event-works/participants`,
    );
  }
}

export async function generateChestNumbers(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { chestNumberSettings: true, slug: true },
  });

  if (!festival) throw new Error("Festival not found");

  const settings = festival.chestNumberSettings as {
    prefix: string;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
    numberingStyle?: "ALPHANUMERIC" | "NUMERIC";
  } | null;

  if (!settings)
    throw new AppError(ERROR_MESSAGES.CHEST_SETTINGS_NOT_CONFIGURED);

  const style = settings.numberingStyle || "ALPHANUMERIC";

  if (
    style === "ALPHANUMERIC" &&
    (settings.prefix == null || String(settings.prefix).trim() === "")
  ) {
    throw new AppError(ERROR_MESSAGES.CHEST_SETTINGS_NOT_CONFIGURED);
  }

  let prefixStr = "";
  if (style === "ALPHANUMERIC" && settings.prefix != null) {
    const p = String(settings.prefix).trim();
    prefixStr = p.endsWith("-") ? p : `${p}-`;
  }

  const existingParticipants = await db.query.participant.findMany({
    where: and(
      eq(participantTable.festivalId, festivalId),
      isNotNull(participantTable.chestNumber),
    ),
    columns: { chestNumber: true },
  });

  const existingNumbers = new Set(
    existingParticipants
      .map((s) => s.chestNumber)
      .filter((n): n is string => n !== null),
  );

  const participantsWithoutNumber = await db.query.participant.findMany({
    where: and(
      eq(participantTable.festivalId, festivalId),
      isNull(participantTable.chestNumber),
    ),
    with: {
      category: true,
    },
    orderBy: [asc(participantTable.createdAt)],
  });

  // Filter for category.type === 'SINGLE' locally if needed, but better in query if possible.
  // Drizzle relational filter is a bit complex for this, let's filter in JS.
  const eligibleParticipants = participantsWithoutNumber.filter(
    (s) => s.category?.type === "SINGLE",
  );

  if (eligibleParticipants.length === 0) {
    return {
      count: 0,
      message: "All participants already have chest numbers.",
    };
  }

  const categorySequences: Record<string, number> = settings.categories
    ? { ...settings.categories }
    : {};
  const codes = settings.categoryCodes || {};

  await db.transaction(async (tx) => {
    const now = serverNowIso();
    for (const participant of eligibleParticipants) {
      const catId = participant.categoryId;
      let currentSeq = categorySequences[catId];

      if (currentSeq === undefined) {
        currentSeq = 1;
        categorySequences[catId] = 1;
      }

      let catInitial = "";
      if (style === "ALPHANUMERIC") {
        catInitial = codes[catId]
          ? codes[catId].toUpperCase()
          : (participant.category?.name?.charAt(0) ?? "X").toUpperCase();
      }

      const formattedSeq = String(currentSeq).padStart(2, "0");
      let chestNumber = `${prefixStr}${catInitial}${formattedSeq}`;

      while (existingNumbers.has(chestNumber)) {
        currentSeq++;
        const nextFormattedSeq = String(currentSeq).padStart(2, "0");
        chestNumber = `${prefixStr}${catInitial}${nextFormattedSeq}`;
      }

      await tx
        .update(participantTable)
        .set({
          chestNumber,
          profileSlug: generateProfileSlug(
            participant.name,
            participant.id,
            chestNumber,
          ),
          updatedAt: now,
        })
        .where(eq(participantTable.id, participant.id));

      existingNumbers.add(chestNumber);
      categorySequences[catId] = currentSeq + 1;
    }

    await tx
      .update(festivalTable)
      .set({
        chestNumberSettings: {
          prefix: settings.prefix,
          categories: categorySequences,
          categoryCodes: settings.categoryCodes,
          numberingStyle: style,
        },
        updatedAt: now,
      })
      .where(eq(festivalTable.id, festivalId));
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-event-works/participants`);
  return {
    count: eligibleParticipants.length,
    message: `Chest numbers generated for ${eligibleParticipants.length} participants.`,
  };
}

export async function resetChestNumbers(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { slug: true },
  });

  if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

  await db.transaction(async (tx) => {
    const now = serverNowIso();
    await tx
      .update(participantTable)
      .set({
        chestNumber: null,
        updatedAt: now,
      })
      .where(eq(participantTable.festivalId, festivalId));

    await tx
      .update(festivalTable)
      .set({
        chestNumberSettings: {},
        updatedAt: now,
      })
      .where(eq(festivalTable.id, festivalId));
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-event-works/participants`);
}

export async function assignChestNumberForNewParticipant(
  festivalId: string,
  participantId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  return assignChestNumberForParticipantInternal(festivalId, participantId);
}

export async function assignChestNumberForParticipantInternal(
  festivalId: string,
  participantId: string,
) {
  const participant = await db.query.participant.findFirst({
    where: and(
      eq(participantTable.id, participantId),
      eq(participantTable.festivalId, festivalId),
    ),
    with: { category: true },
  });
  if (!participant || participant.category?.type !== "SINGLE") return;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { chestNumberSettings: true },
  });
  if (!festival) return;

  const settings = festival.chestNumberSettings as {
    prefix?: string;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
    numberingStyle?: "ALPHANUMERIC" | "NUMERIC";
  } | null;

  if (!settings) return;
  const style = settings.numberingStyle || "ALPHANUMERIC";
  if (
    style === "ALPHANUMERIC" &&
    (settings.prefix == null || String(settings.prefix).trim() === "")
  ) {
    return;
  }

  let prefixStr = "";
  if (style === "ALPHANUMERIC" && settings.prefix != null) {
    const p = String(settings.prefix).trim();
    prefixStr = p.endsWith("-") ? p : `${p}-`;
  }

  const existingParticipants = await db.query.participant.findMany({
    where: and(
      eq(participantTable.festivalId, festivalId),
      isNotNull(participantTable.chestNumber),
    ),
    columns: { chestNumber: true },
  });
  const existingNumbers = new Set(
    existingParticipants
      .map((s) => s.chestNumber)
      .filter((n): n is string => n !== null),
  );

  const catId = participant.categoryId;
  const categorySequences = settings.categories
    ? { ...settings.categories }
    : {};
  let currentSeq = categorySequences[catId];
  if (currentSeq === undefined) {
    currentSeq = 1;
    categorySequences[catId] = 1;
  }

  const codes = settings.categoryCodes || {};
  let catInitial = "";
  if (style === "ALPHANUMERIC") {
    catInitial = codes[catId]
      ? codes[catId].toUpperCase()
      : (participant.category?.name?.charAt(0) ?? "X").toUpperCase();
  }

  let chestNumber = `${prefixStr}${catInitial}${String(currentSeq).padStart(2, "0")}`;
  while (existingNumbers.has(chestNumber)) {
    currentSeq++;
    chestNumber = `${prefixStr}${catInitial}${String(currentSeq).padStart(2, "0")}`;
  }
  categorySequences[catId] = currentSeq + 1;

  await db.transaction(async (tx) => {
    const now = serverNowIso();
    await tx
      .update(participantTable)
      .set({
        chestNumber,
        profileSlug: generateProfileSlug(
          participant.name,
          participantId,
          chestNumber,
        ),
        updatedAt: now,
      })
      .where(eq(participantTable.id, participantId));

    await tx
      .update(festivalTable)
      .set({
        chestNumberSettings: {
          prefix: style === "NUMERIC" ? "" : (settings.prefix ?? ""),
          categories: categorySequences,
          categoryCodes: settings.categoryCodes ?? {},
          numberingStyle: style,
        },
        updatedAt: now,
      })
      .where(eq(festivalTable.id, festivalId));
  });
}

export async function updateAllChestNumbers(
  festivalId: string,
  newPrefix: string,
  newCategoryCodes?: Record<string, string>,
  numberingStyle?: "ALPHANUMERIC" | "NUMERIC",
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { chestNumberSettings: true, slug: true },
  });
  if (!festival) throw new Error("Festival not found");

  const settings = festival.chestNumberSettings as {
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
    numberingStyle?: "ALPHANUMERIC" | "NUMERIC";
  } | null;

  const allParticipants = await db.query.participant.findMany({
    where: eq(participantTable.festivalId, festivalId),
    with: { category: true },
    orderBy: [asc(participantTable.createdAt)],
  });

  const eligibleParticipants = allParticipants.filter(
    (s) => s.category?.type === "SINGLE",
  );

  let style: "ALPHANUMERIC" | "NUMERIC" = "ALPHANUMERIC";

  if (numberingStyle) {
    style = numberingStyle;
  } else if (
    newPrefix === "" &&
    (!newCategoryCodes || Object.keys(newCategoryCodes).length === 0)
  ) {
    style = "NUMERIC";
  } else {
    style = settings?.numberingStyle || "ALPHANUMERIC";
  }

  let prefixStr = "";
  if (style === "ALPHANUMERIC") {
    prefixStr = newPrefix.endsWith("-") ? newPrefix : `${newPrefix}-`;
  }

  const categorySequences: Record<string, number> = {};
  const codes =
    style === "NUMERIC"
      ? {}
      : newCategoryCodes || settings?.categoryCodes || {};

  await db.transaction(async (tx) => {
    const now = serverNowIso();
    for (const participant of eligibleParticipants) {
      let catInitial = "";
      if (style === "ALPHANUMERIC") {
        catInitial = codes[participant.categoryId]
          ? codes[participant.categoryId].toUpperCase()
          : (participant.category?.name?.charAt(0) ?? "X").toUpperCase();
      }

      let seq = 1;

      if (participant.chestNumber) {
        const matches = participant.chestNumber.match(/(\d+)$/);
        if (matches) {
          const parsed = parseInt(matches[0], 10);
          if (!Number.isNaN(parsed)) seq = parsed;
        }
      }

      if (!categorySequences[participant.categoryId]) {
        categorySequences[participant.categoryId] = 1;
      }

      const formattedSeq = String(seq).padStart(2, "0");
      const chestNumber = `${prefixStr}${catInitial}${formattedSeq}`;

      await tx
        .update(participantTable)
        .set({
          chestNumber,
          profileSlug: generateProfileSlug(
            participant.name,
            participant.id,
            chestNumber,
          ),
          updatedAt: now,
        })
        .where(eq(participantTable.id, participant.id));

      if (seq >= (categorySequences[participant.categoryId] || 0)) {
        categorySequences[participant.categoryId] = seq + 1;
      }
    }

    await tx
      .update(festivalTable)
      .set({
        chestNumberSettings: {
          prefix: newPrefix,
          categories: categorySequences,
          categoryCodes: codes,
          numberingStyle: style,
        },
        updatedAt: now,
      })
      .where(eq(festivalTable.id, festivalId));
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-event-works/participants`);
}
