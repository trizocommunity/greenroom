import { desc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivals,
  payment,
  user as users,
} from "@/core/database/schema";

export const adminService = {
  getFestivalsForAdmin: async () => {
    const rows = await db
      .select({
        festival: festivals,
        userEmail: users.email,
      })
      .from(festivals)
      .leftJoin(users, eq(festivals.ownerId, users.id))
      .orderBy(desc(festivals.createdAt))
      .limit(50);

    return rows.map((r) => ({
      ...r.festival,
      user: { email: r.userEmail ?? "No User" },
    }));
  },

  getUsersForAdmin: async () => {
    return db.query.user.findMany({
      with: {
        festivals: { columns: { name: true } },
      },
      orderBy: [desc(users.createdAt)],
      limit: 50,
    });
  },

  getPaymentsForAdmin: async () => {
    return db.query.payment.findMany({
      with: {
        user: { columns: { email: true, fullName: true } },
        festival: { columns: { name: true } },
      },
      orderBy: [desc(payment.createdAt)],
      limit: 50,
    });
  },
};

export type AdminFestival = Awaited<
  ReturnType<typeof adminService.getFestivalsForAdmin>
>[number];
export type AdminUser = Awaited<
  ReturnType<typeof adminService.getUsersForAdmin>
>[number];
export type AdminPayment = Awaited<
  ReturnType<typeof adminService.getPaymentsForAdmin>
>[number];
