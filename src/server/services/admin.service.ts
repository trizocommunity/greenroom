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

export type AdminFestival = Prisma.PromiseReturnType<
  typeof adminService.getFestivalsForAdmin
>[number];
export type AdminUser = Prisma.PromiseReturnType<
  typeof adminService.getUsersForAdmin
>[number];
export type AdminPayment = Prisma.PromiseReturnType<
  typeof adminService.getPaymentsForAdmin
>[number];
