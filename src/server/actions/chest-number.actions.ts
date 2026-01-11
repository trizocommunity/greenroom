"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function getChestNumberSettings(festivalId: string) {
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { chestNumberSettings: true },
  });
  return festival?.chestNumberSettings as {
    prefix: string;
    nextSequence?: number;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
  } | null;
}

export async function saveChestNumberSettings(
  festivalId: string,
  settings: {
    prefix: string;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
  },
) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const updatedFestival = await prisma.festival.update({
    where: { id: festivalId },
    data: {
      chestNumberSettings: {
        prefix: settings.prefix,
        categories: settings.categories,
        categoryCodes: settings.categoryCodes,
      },
    },
    select: { slug: true },
  });

  revalidatePath(
    `/dashboard/${updatedFestival.slug}/event-works/chest-numbers`,
  );
}

export async function generateChestNumbers(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

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
  } | null;

  if (!settings) throw new Error("Settings not configured");

  const prefix = settings.prefix.endsWith("-")
    ? settings.prefix
    : `${settings.prefix}-`;

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

    // Use custom code or fallback to first letter
    const catInitial = codes[catId]
      ? codes[catId].toUpperCase()
      : student.category.name.charAt(0).toUpperCase();

    const formattedSeq = String(currentSeq).padStart(2, "0");
    let chestNumber = `${prefix}${catInitial}${formattedSeq}`;

    // Find next available number
    while (existingNumbers.has(chestNumber)) {
      currentSeq++;
      const nextFormattedSeq = String(currentSeq).padStart(2, "0");
      chestNumber = `${prefix}${catInitial}${nextFormattedSeq}`;
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
      },
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/event-works/chest-numbers`);
  return {
    count: updates.length,
    message: `Chest numbers generated for ${updates.length} students.`,
  };
}

export async function resetChestNumbers(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  // 1. Clear student chest numbers
  await prisma.student.updateMany({
    where: { festivalId },
    data: { chestNumber: null },
  });

  // 2. Reset sequences in settings
  // We keep the prefix but clear the category sequences so they restart
  // Or do we keep them? If we want to "start from 01", we must reset them.
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { chestNumberSettings: true, slug: true },
  });

  if (festival?.chestNumberSettings) {
    const currentSettings = festival.chestNumberSettings as any;
    await prisma.festival.update({
      where: { id: festivalId },
      data: {
        chestNumberSettings: {
          ...currentSettings,
          categories: {}, // Reset sequences
        },
      },
    });
  }

  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/chest-numbers`);
  }
}

export async function updateAllChestNumbers(
  festivalId: string,
  newPrefix: string,
) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  // 1. Get current settings and categories
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { chestNumberSettings: true, slug: true },
  });
  if (!festival) throw new Error("Festival not found");

  const settings = festival.chestNumberSettings as {
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
  } | null;

  // Reset sequences to start (or keep existing logic? user said "Edit prefix... change all").
  // Safest strategy: Regenerate all based on existing start numbers or defaults.

  const allStudents = await prisma.student.findMany({
    where: {
      festivalId,
      category: { type: "SINGLE" },
    },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  const prefix = newPrefix.endsWith("-") ? newPrefix : `${newPrefix}-`;
  const updates = [];
  const categorySequences: Record<string, number> = {};
  const codes = settings?.categoryCodes || {};

  for (const student of allStudents) {
    // Use code or fallback
    const catInitial = codes[student.categoryId]
      ? codes[student.categoryId].toUpperCase()
      : student.category.name.charAt(0).toUpperCase();

    let seq = 1;

    // Try to preserve existing number if possible
    if (student.chestNumber) {
      const parts = student.chestNumber.split("-");
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1]; // e.g. K100
        // Remove first char if it is a letter
        const numPart = lastPart.replace(/^[A-Z]/, "");
        const parsed = parseInt(numPart);
        if (!Number.isNaN(parsed)) seq = parsed;
      }
    }

    // Ensure sequence tracking
    if (!categorySequences[student.categoryId]) {
      categorySequences[student.categoryId] = 1;
    }

    // We use the preserved 'seq' but we must ensure no collision if we are changing prefix.
    // Since we are updating ALL, we just need to avoid collision within the new set.
    // But if multiple students map to same seq (from different prefixes?), that's bad.
    // But assuming they were unique before, they should be unique now if category initial is same.
    // Let's assume seq is unique enough.

    // Wait, if we use the simple counter method, we guarantee uniqueness and order.
    // If we really want to just SWAP prefix, we should rely on the preserved number.

    // But if we are introducing the "Category Initial" now, we might be changing format from `OLD-100` to `NEW-K100`.
    // `OLD-100` has seq 100.
    // `NEW-K100` uses seq 100.
    // That seems fine.

    const formattedSeq = String(seq).padStart(2, "0");
    const chestNumber = `${prefix}${catInitial}${formattedSeq}`;

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
        categoryCodes: settings?.categoryCodes,
      },
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/event-works/chest-numbers`);
}
