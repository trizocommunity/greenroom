import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const adminService = {
  getFestivalsForAdmin: async () => {
    return prisma.festival.findMany({
      include: {
        owner: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  getUsersForAdmin: async () => {
    return prisma.user.findMany({
      include: {
        festival: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  getPaymentsForAdmin: async () => {
    return prisma.payment.findMany({
      include: {
        user: { select: { email: true, fullName: true } },
        festival: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },
};

export type AdminFestival = Awaited<ReturnType<
  typeof adminService.getFestivalsForAdmin
>>[number];
export type AdminUser = Awaited<ReturnType<
  typeof adminService.getUsersForAdmin
>>[number];
export type AdminPayment = Awaited<ReturnType<
  typeof adminService.getPaymentsForAdmin
>>[number];
