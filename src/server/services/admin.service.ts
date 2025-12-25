import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const adminService = {
  getFestivalsForAdmin: async () => {
    return prisma.festival.findMany({
      include: {
        owner: { select: { email: true } },
        editions: {
          select: {
            id: true,
            slug: true,
            status: true,
            tier: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  getEditionsForAdmin: async () => {
    return prisma.edition.findMany({
      include: {
        festival: {
          select: {
            name: true,
            owner: { select: { email: true } },
          },
        },
        payments: {
          select: { id: true },
        },
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
        user: { select: { email: true } },
        festival: { select: { name: true } },
        edition: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },
};

export type AdminFestival = Prisma.PromiseReturnType<
  typeof adminService.getFestivalsForAdmin
>[number];
export type AdminEdition = Prisma.PromiseReturnType<
  typeof adminService.getEditionsForAdmin
>[number];
export type AdminUser = Prisma.PromiseReturnType<
  typeof adminService.getUsersForAdmin
>[number];
export type AdminPayment = Prisma.PromiseReturnType<
  typeof adminService.getPaymentsForAdmin
>[number];
