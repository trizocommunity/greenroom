"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export type StageData = {
  name: string;
  description?: string;
};

export async function createStage(festivalId: string, data: StageData) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  // Determine user name or ID to store as createdBy
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { fullName: true, displayName: true, email: true },
  });

  const createdBy =
    user?.displayName || user?.fullName || user?.email || "Unknown";

  await prisma.stage.create({
    data: {
      festivalId,
      name: data.name,
      description: data.description,
      createdBy,
    },
  });

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { slug: true },
  });

  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/stage-management`);
  }
}

export async function updateStage(stageId: string, data: StageData) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const stage = await prisma.stage.update({
    where: { id: stageId },
    data: {
      name: data.name,
      description: data.description,
    },
    include: { festival: true },
  });

  if (stage.festival) {
    revalidatePath(
      `/dashboard/${stage.festival.slug}/event-works/stage-management`,
    );
  }
}

export async function deleteStage(stageId: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: { festival: true },
  });

  if (!stage) throw new Error("Stage not found");

  await prisma.stage.delete({
    where: { id: stageId },
  });

  revalidatePath(
    `/dashboard/${stage.festival.slug}/event-works/stage-management`,
  );
}

export async function getStages(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized"); // Basic check, middleware handles role access mostly

  return await prisma.stage.findMany({
    where: { festivalId },
    orderBy: { createdAt: "desc" },
  });
}
