"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { prisma } from "@/lib/db";

export async function getChestNumberSettings(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { chestNumberSettings: true },
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
  await assertFestivalAccess(session, festivalId);

  await prisma.festival.update({
    where: { id: festivalId },
    data: {
      chestNumberSettings: {
        prefix: settings.prefix,
        categories: settings.categories,
        categoryCodes: settings.categoryCodes,
        numberingStyle: settings.numberingStyle || "ALPHANUMERIC",
      },
    },
  });

  const updatedFestival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { slug: true },
  });

  if (updatedFestival) {
    revalidatePath(`/dashboard/${updatedFestival.slug}/pre-works/students`);
  }
}

export async function generateChestNumbers(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  // 1. Get Settings
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { chestNumberSettings: true, slug: true },
  });

  if (!festival) throw new Error("Festival not found");

  const settings = festival.chestNumberSettings as {
    prefix: string;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
    numberingStyle?: "ALPHANUMERIC" | "NUMERIC";
  } | null;

  if (!settings) throw new AppError(ERROR_MESSAGES.CHEST_SETTINGS_NOT_CONFIGURED);

  const style = settings.numberingStyle || "ALPHANUMERIC";

  // ALPHANUMERIC requires a non-empty prefix; NUMERIC uses no prefix
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

  // 2. Fetch existing chest numbers to avoid collision
  const existingStudents = await prisma.student.findMany({
    where: {
      festivalId,
      chestNumber: { not: null },
    },
    select: { chestNumber: true },
  });

  const existingNumbers = new Set(existingStudents.map((s) => s.chestNumber));

  // 3. Get students without chest number
  const studentsWithoutNumber = await prisma.student.findMany({
    where: {
      festivalId,
      chestNumber: null,
      category: {
        type: "SINGLE",
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (studentsWithoutNumber.length === 0) {
    return { count: 0, message: "All students already have chest numbers." };
  }

  // 4. Generate Numbers
  const updates = [];
  const categorySequences: Record<string, number> = settings.categories
    ? { ...settings.categories }
    : {};
  const codes = settings.categoryCodes || {};

  for (const student of studentsWithoutNumber) {
    const catId = student.categoryId;
    let currentSeq = categorySequences[catId];

    // Fallback if category not in config (e.g. newly added category) -> default 1
    if (currentSeq === undefined) {
      currentSeq = 1;
      categorySequences[catId] = 1;
    }

    // Code Logic
    let catInitial = "";
    if (style === "ALPHANUMERIC") {
      catInitial = codes[catId]
        ? codes[catId].toUpperCase()
        : student.category.name.charAt(0).toUpperCase();
    }

    const formattedSeq = String(currentSeq).padStart(2, "0");
    let chestNumber = `${prefixStr}${catInitial}${formattedSeq}`;

    // Find next available number
    while (existingNumbers.has(chestNumber)) {
      currentSeq++;
      const nextFormattedSeq = String(currentSeq).padStart(2, "0");
      chestNumber = `${prefixStr}${catInitial}${nextFormattedSeq}`;
    }

    updates.push(
      prisma.student.update({
        where: { id: student.id },
        data: { chestNumber },
      }),
    );

    existingNumbers.add(chestNumber);
    categorySequences[catId] = currentSeq + 1;
  }

  // 5. Run Transaction
  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  // 6. Update settings with new sequences
  await prisma.festival.update({
    where: { id: festivalId },
    data: {
      chestNumberSettings: {
        prefix: settings.prefix, // Keep original prefix string
        categories: categorySequences,
        categoryCodes: settings.categoryCodes, // Preserve codes
        numberingStyle: style,
      },
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-works/students`);
  return {
    count: updates.length,
    message: `Chest numbers generated for ${updates.length} students.`,
  };
}

export async function resetChestNumbers(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { slug: true },
  });

  if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

  // 1. Clear student chest numbers
  await prisma.student.updateMany({
    where: { festivalId },
    data: { chestNumber: null },
  });

  // 2. Reset sequences in settings — wipe to return to "Not Configured" state.
  await prisma.festival.update({
    where: { id: festivalId },
    data: {
      chestNumberSettings: {},
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-works/students`);
}

export async function assignChestNumberForNewStudent(
  festivalId: string,
  studentId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const student = await prisma.student.findUnique({
    where: { id: studentId, festivalId },
    include: { category: true },
  });
  if (!student || student.category?.type !== "SINGLE") return;

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { chestNumberSettings: true },
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
  // NUMERIC does not require prefix; ALPHANUMERIC does
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

  const existingNumbers = new Set(
    (
      await prisma.student.findMany({
        where: { festivalId, chestNumber: { not: null } },
        select: { chestNumber: true },
      })
    ).map((s) => s.chestNumber),
  );

  const catId = student.categoryId;
  const categorySequences = settings.categories ? { ...settings.categories } : {};
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
      : (student.category?.name?.charAt(0) ?? "X").toUpperCase();
  }

  let chestNumber = `${prefixStr}${catInitial}${String(currentSeq).padStart(2, "0")}`;
  while (existingNumbers.has(chestNumber)) {
    currentSeq++;
    chestNumber = `${prefixStr}${catInitial}${String(currentSeq).padStart(2, "0")}`;
  }
  categorySequences[catId] = currentSeq + 1;

  await prisma.student.update({
    where: { id: studentId },
    data: { chestNumber },
  });

  await prisma.festival.update({
    where: { id: festivalId },
    data: {
      chestNumberSettings: {
        prefix: style === "NUMERIC" ? "" : (settings.prefix ?? ""),
        categories: categorySequences,
        categoryCodes: settings.categoryCodes ?? {},
        numberingStyle: style,
      },
    },
  });
}

export async function updateAllChestNumbers(
  festivalId: string,
  newPrefix: string,
  newCategoryCodes?: Record<string, string>,
  numberingStyle?: "ALPHANUMERIC" | "NUMERIC",
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  // 1. Get current settings
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { chestNumberSettings: true, slug: true },
  });
  if (!festival) throw new Error("Festival not found");

  const settings = festival.chestNumberSettings as {
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
    numberingStyle?: "ALPHANUMERIC" | "NUMERIC";
  } | null;

  const allStudents = await prisma.student.findMany({
    where: {
      festivalId,
      category: { type: "SINGLE" },
    },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  // Determine final style:
  // 1. Use passed style if any
  // 2. Else infer from inputs (if prefix is empty & codes empty -> Numeric)
  // 3. Else fallback to existing settings style
  // 4. Default ALPHANUMERIC
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

  // Prefix Logic
  let prefixStr = "";
  if (style === "ALPHANUMERIC") {
    prefixStr = newPrefix.endsWith("-") ? newPrefix : `${newPrefix}-`;
  }

  const updates = [];
  const categorySequences: Record<string, number> = {};

  // Use new codes if provided, otherwise fallback to existing settings or defaults
  // For numeric, codes should be ignored/empty
  const codes =
    style === "NUMERIC"
      ? {}
      : newCategoryCodes || settings?.categoryCodes || {};

  for (const student of allStudents) {
    // Determine Code
    let catInitial = "";
    if (style === "ALPHANUMERIC") {
      catInitial = codes[student.categoryId]
        ? codes[student.categoryId].toUpperCase()
        : student.category.name.charAt(0).toUpperCase();
    }

    let seq = 1;

    // Try to preserve existing number if possible
    if (student.chestNumber) {
      // If switching styles, preserving number is tricky.
      // ALPH -> NUM: FEST-A-01 -> 1 ? or 01?
      // We parse number from end.
      const matches = student.chestNumber.match(/(\d+)$/);
      if (matches) {
        const parsed = parseInt(matches[0]);
        if (!Number.isNaN(parsed)) seq = parsed;
      }
    }

    // Ensure sequence tracking
    if (!categorySequences[student.categoryId]) {
      categorySequences[student.categoryId] = 1;
    }

    const formattedSeq = String(seq).padStart(2, "0");
    const chestNumber = `${prefixStr}${catInitial}${formattedSeq}`;

    updates.push(
      prisma.student.update({
        where: { id: student.id },
        data: { chestNumber },
      }),
    );

    // Update the "next sequence" tracker to be max(seq) + 1
    if (seq >= (categorySequences[student.categoryId] || 0)) {
      categorySequences[student.categoryId] = seq + 1;
    }
  }

  await prisma.$transaction(updates);

  // Update settings
  await prisma.festival.update({
    where: { id: festivalId },
    data: {
      chestNumberSettings: {
        prefix: newPrefix,
        categories: categorySequences,
        categoryCodes: codes,
        numberingStyle: style,
      },
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-works/students`);
}
