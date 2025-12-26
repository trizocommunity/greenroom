import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function createCategory(data: Prisma.EditionCategoryCreateInput) {
  return prisma.editionCategory.create({
    data,
  });
}

export async function updateCategory(
  id: string,
  data: Prisma.EditionCategoryUpdateInput,
) {
  return prisma.editionCategory.update({
    where: { id },
    data,
  });
}

export async function deleteCategory(id: string) {
  return prisma.editionCategory.delete({
    where: { id },
  });
}

export async function findCategoryById(id: string) {
  return prisma.editionCategory.findUnique({
    where: { id },
    include: { _count: { select: { programmes: true, participants: true } } },
  });
}

export async function findCategoriesByEdition(editionId: string) {
  return prisma.editionCategory.findMany({
    where: { editionId },
    orderBy: { createdAt: "asc" }, // Usually categories have an order, for now creation time
    include: { _count: { select: { programmes: true, participants: true } } },
  });
}

export async function countCategories(editionId: string) {
  return prisma.editionCategory.count({
    where: { editionId },
  });
}
