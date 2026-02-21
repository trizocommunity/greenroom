import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createCategory(data: Prisma.CategoryCreateInput) {
  return prisma.category.create({
    data,
  });
}

export async function updateCategory(
  id: string,
  data: Prisma.CategoryUpdateInput,
) {
  return prisma.category.update({
    where: { id },
    data,
  });
}

export async function deleteCategory(id: string) {
  return prisma.category.delete({
    where: { id },
  });
}

export async function findCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { programmes: true, students: true } } },
  });
}

export async function findCategoriesByFestival(festivalId: string) {
  return prisma.category.findMany({
    where: { festivalId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { programmes: true, students: true } } },
  });
}

export async function countCategories(festivalId: string) {
  return prisma.category.count({
    where: { festivalId },
  });
}
