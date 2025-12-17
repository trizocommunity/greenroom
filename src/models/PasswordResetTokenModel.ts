import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function findPasswordResetTokenByHash(tokenHash: string) {
  return prisma.passwordResetToken.findFirst({
    where: { tokenHash },
  });
}

export async function findValidPasswordResetToken(tokenHash: string) {
  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });
}

export async function createPasswordResetToken(data: Prisma.PasswordResetTokenCreateInput) {
  return prisma.passwordResetToken.create({
    data,
  });
}

export async function updatePasswordResetToken(id: string, data: Prisma.PasswordResetTokenUpdateInput) {
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
