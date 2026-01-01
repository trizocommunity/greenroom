import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Phase 1 User Model
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { festival: true }, // Max 1 festival
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findAllUsers(
  where: Prisma.UserWhereInput = {},
  orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: "desc" },
) {
  return prisma.user.findMany({
    where,
    orderBy,
  });
}

export async function countUsers(where: Prisma.UserWhereInput = {}) {
  return prisma.user.count({
    where,
  });
}

export async function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({
    data,
  });
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id },
  });
}
