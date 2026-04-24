"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { 
  festival as festivalTable, 
  student as studentTable,
  category as categoryTable
} from "@/server/db/schema";
import { eq, and, isNull, isNotNull, asc } from "drizzle-orm";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { generateProfileSlug } from "@/lib/slug";

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

  await db.update(festivalTable).set({
    chestNumberSettings: {
      prefix: settings.prefix,
      categories: settings.categories,
      categoryCodes: settings.categoryCodes,
      numberingStyle: settings.numberingStyle || "ALPHANUMERIC",
    },
    updatedAt: new Date().toISOString(),
  }).where(eq(festivalTable.id, festivalId));

  const updatedFestival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { slug: true },
  });

  if (updatedFestival) {
    revalidatePath(`/dashboard/${updatedFestival.slug}/pre-works/students`);
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

  const existingStudents = await db.query.student.findMany({
    where: and(eq(studentTable.festivalId, festivalId), isNotNull(studentTable.chestNumber)),
    columns: { chestNumber: true },
  });

  const existingNumbers = new Set(existingStudents.map((s) => s.chestNumber).filter((n): n is string => n !== null));

  const studentsWithoutNumber = await db.query.student.findMany({
    where: and(eq(studentTable.festivalId, festivalId), isNull(studentTable.chestNumber)),
    with: {
      category: true,
    },
    orderBy: [asc(studentTable.createdAt)],
  });
  
  // Filter for category.type === 'SINGLE' locally if needed, but better in query if possible.
  // Drizzle relational filter is a bit complex for this, let's filter in JS.
  const eligibleStudents = studentsWithoutNumber.filter(s => s.category?.type === 'SINGLE');

  if (eligibleStudents.length === 0) {
    return { count: 0, message: "All students already have chest numbers." };
  }

  const categorySequences: Record<string, number> = settings.categories
    ? { ...settings.categories }
    : {};
  const codes = settings.categoryCodes || {};

  await db.transaction(async (tx) => {
    const now = new Date().toISOString();
    for (const student of eligibleStudents) {
      const catId = student.categoryId;
      let currentSeq = categorySequences[catId];

      if (currentSeq === undefined) {
        currentSeq = 1;
        categorySequences[catId] = 1;
      }

      let catInitial = "";
      if (style === "ALPHANUMERIC") {
        catInitial = codes[catId]
          ? codes[catId].toUpperCase()
          : (student.category?.name?.charAt(0) ?? "X").toUpperCase();
      }

      const formattedSeq = String(currentSeq).padStart(2, "0");
      let chestNumber = `${prefixStr}${catInitial}${formattedSeq}`;

      while (existingNumbers.has(chestNumber)) {
        currentSeq++;
        const nextFormattedSeq = String(currentSeq).padStart(2, "0");
        chestNumber = `${prefixStr}${catInitial}${nextFormattedSeq}`;
      }

      await tx.update(studentTable).set({
        chestNumber,
        profileSlug: generateProfileSlug(student.name, student.id, chestNumber),
        updatedAt: now,
      }).where(eq(studentTable.id, student.id));

      existingNumbers.add(chestNumber);
      categorySequences[catId] = currentSeq + 1;
    }

    await tx.update(festivalTable).set({
      chestNumberSettings: {
        prefix: settings.prefix,
        categories: categorySequences,
        categoryCodes: settings.categoryCodes,
        numberingStyle: style,
      },
      updatedAt: now,
    }).where(eq(festivalTable.id, festivalId));
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-works/students`);
  return {
    count: eligibleStudents.length,
    message: `Chest numbers generated for ${eligibleStudents.length} students.`,
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
    const now = new Date().toISOString();
    await tx.update(studentTable).set({ 
      chestNumber: null,
      updatedAt: now,
    }).where(eq(studentTable.festivalId, festivalId));

    await tx.update(festivalTable).set({
      chestNumberSettings: {},
      updatedAt: now,
    }).where(eq(festivalTable.id, festivalId));
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-works/students`);
}

export async function assignChestNumberForNewStudent(
  festivalId: string,
  studentId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const student = await db.query.student.findFirst({
    where: and(eq(studentTable.id, studentId), eq(studentTable.festivalId, festivalId)),
    with: { category: true },
  });
  if (!student || student.category?.type !== "SINGLE") return;

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

  const existingStudents = await db.query.student.findMany({
    where: and(eq(studentTable.festivalId, festivalId), isNotNull(studentTable.chestNumber)),
    columns: { chestNumber: true },
  });
  const existingNumbers = new Set(existingStudents.map(s => s.chestNumber).filter((n): n is string => n !== null));

  const catId = student.categoryId;
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
      : (student.category?.name?.charAt(0) ?? "X").toUpperCase();
  }

  let chestNumber = `${prefixStr}${catInitial}${String(currentSeq).padStart(2, "0")}`;
  while (existingNumbers.has(chestNumber)) {
    currentSeq++;
    chestNumber = `${prefixStr}${catInitial}${String(currentSeq).padStart(2, "0")}`;
  }
  categorySequences[catId] = currentSeq + 1;

  await db.transaction(async (tx) => {
    const now = new Date().toISOString();
    await tx.update(studentTable).set({
      chestNumber,
      profileSlug: generateProfileSlug(student.name, studentId, chestNumber),
      updatedAt: now,
    }).where(eq(studentTable.id, studentId));

    await tx.update(festivalTable).set({
      chestNumberSettings: {
        prefix: style === "NUMERIC" ? "" : (settings.prefix ?? ""),
        categories: categorySequences,
        categoryCodes: settings.categoryCodes ?? {},
        numberingStyle: style,
      },
      updatedAt: now,
    }).where(eq(festivalTable.id, festivalId));
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

  const allStudents = await db.query.student.findMany({
    where: eq(studentTable.festivalId, festivalId),
    with: { category: true },
    orderBy: [asc(studentTable.createdAt)],
  });
  
  const eligibleStudents = allStudents.filter(s => s.category?.type === 'SINGLE');

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
    const now = new Date().toISOString();
    for (const student of eligibleStudents) {
      let catInitial = "";
      if (style === "ALPHANUMERIC") {
        catInitial = codes[student.categoryId]
          ? codes[student.categoryId].toUpperCase()
          : (student.category?.name?.charAt(0) ?? "X").toUpperCase();
      }

      let seq = 1;

      if (student.chestNumber) {
        const matches = student.chestNumber.match(/(\d+)$/);
        if (matches) {
          const parsed = parseInt(matches[0], 10);
          if (!Number.isNaN(parsed)) seq = parsed;
        }
      }

      if (!categorySequences[student.categoryId]) {
        categorySequences[student.categoryId] = 1;
      }

      const formattedSeq = String(seq).padStart(2, "0");
      const chestNumber = `${prefixStr}${catInitial}${formattedSeq}`;

      await tx.update(studentTable).set({
        chestNumber,
        profileSlug: generateProfileSlug(student.name, student.id, chestNumber),
        updatedAt: now,
      }).where(eq(studentTable.id, student.id));

      if (seq >= (categorySequences[student.categoryId] || 0)) {
        categorySequences[student.categoryId] = seq + 1;
      }
    }

    await tx.update(festivalTable).set({
      chestNumberSettings: {
        prefix: newPrefix,
        categories: categorySequences,
        categoryCodes: codes,
        numberingStyle: style,
      },
      updatedAt: now,
    }).where(eq(festivalTable.id, festivalId));
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-works/students`);
}
