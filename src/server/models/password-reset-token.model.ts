import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function findPasswordResetTokenByHash(token: string) {
  return prisma.passwordResetToken.findFirst({
    where: { token },
  });
}

export async function findValidPasswordResetToken(token: string) {
  return prisma.passwordResetToken.findFirst({
    where: {
      token,
      expires: { gt: new Date() },
      usedAt: null,
    },
  });
}

export async function createPasswordResetToken(
  data: Prisma.PasswordResetTokenCreateInput,
) {
  return prisma.passwordResetToken.create({
    data,
  });
}

export async function updatePasswordResetToken(
  id: string,
  data: Prisma.PasswordResetTokenUpdateInput,
) {
  return prisma.passwordResetToken.update({
    where: { id },
    data,
  });
}

export async function deletePasswordResetToken(id: string) {
  return prisma.passwordResetToken.delete({
    where: { id },
  });
}
