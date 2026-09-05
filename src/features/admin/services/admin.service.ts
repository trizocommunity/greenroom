import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivals,
  payment,
  user as users,
} from "@/core/database/schema";
import type {
  PaymentStatus,
  Tier,
} from "@/features/payments/repositories/payment.repository";

export interface GetPaymentsFilterOptions {
  q?: string;
  status?: string;
  tier?: string;
  page?: number;
  pageSize?: number;
}

export interface PaymentMetrics {
  totalRevenue: number;
  paidCount: number;
  pendingCount: number;
  pendingAmount: number;
  failedCount: number;
  tierCounts: {
    BASIC: number;
    STANDARD: number;
    PRO: number;
  };
}

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
        user: { columns: { email: true, fullName: true, image: true } },
        festival: { columns: { id: true, name: true, slug: true } },
      },
      orderBy: [desc(payment.createdAt)],
      limit: 50,
    });
  },

  getPaymentsWithMetricsForAdmin: async (
    options?: GetPaymentsFilterOptions,
  ) => {
    const { q, status, tier, page = 1, pageSize = 20 } = options || {};

    const whereConditions = [];

    if (q && q.trim().length > 0) {
      const searchTerm = `%${q.trim()}%`;
      whereConditions.push(
        or(
          ilike(users.email, searchTerm),
          ilike(users.fullName, searchTerm),
          ilike(payment.providerId, searchTerm),
          ilike(payment.referenceId, searchTerm),
          ilike(festivals.name, searchTerm),
        ),
      );
    }

    if (status && status !== "ALL") {
      whereConditions.push(
        eq(payment.status, status.toUpperCase() as PaymentStatus),
      );
    }

    if (tier && tier !== "ALL") {
      whereConditions.push(eq(payment.tier, tier.toUpperCase() as Tier));
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // 1. Fetch Paginated Rows
    const offset = Math.max(0, (page - 1) * pageSize);
    const rows = await db
      .select({
        payment: payment,
        user: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          image: users.image,
        },
        festival: {
          id: festivals.id,
          name: festivals.name,
          slug: festivals.slug,
        },
      })
      .from(payment)
      .leftJoin(users, eq(payment.userId, users.id))
      .leftJoin(festivals, eq(payment.festivalId, festivals.id))
      .where(whereClause)
      .orderBy(desc(payment.createdAt))
      .limit(pageSize)
      .offset(offset);

    // 2. Fetch Total Count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payment)
      .leftJoin(users, eq(payment.userId, users.id))
      .leftJoin(festivals, eq(payment.festivalId, festivals.id))
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    // 3. Global Financial Metrics (unfiltered platform metrics)
    const metricsResult = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payment.status} = 'PAID' THEN ${payment.amount} ELSE 0 END), 0)::int`,
        paidCount: sql<number>`COALESCE(COUNT(CASE WHEN ${payment.status} = 'PAID' THEN 1 END), 0)::int`,
        pendingCount: sql<number>`COALESCE(COUNT(CASE WHEN ${payment.status} = 'PENDING' THEN 1 END), 0)::int`,
        pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payment.status} = 'PENDING' THEN ${payment.amount} ELSE 0 END), 0)::int`,
        failedCount: sql<number>`COALESCE(COUNT(CASE WHEN ${payment.status} = 'FAILED' THEN 1 END), 0)::int`,
        basicCount: sql<number>`COALESCE(COUNT(CASE WHEN ${payment.tier} = 'BASIC' AND ${payment.status} = 'PAID' THEN 1 END), 0)::int`,
        standardCount: sql<number>`COALESCE(COUNT(CASE WHEN ${payment.tier} = 'STANDARD' AND ${payment.status} = 'PAID' THEN 1 END), 0)::int`,
        proCount: sql<number>`COALESCE(COUNT(CASE WHEN ${payment.tier} = 'PRO' AND ${payment.status} = 'PAID' THEN 1 END), 0)::int`,
      })
      .from(payment);

    const rawMetrics = metricsResult[0];
    const metrics: PaymentMetrics = {
      totalRevenue: rawMetrics?.totalRevenue ?? 0,
      paidCount: rawMetrics?.paidCount ?? 0,
      pendingCount: rawMetrics?.pendingCount ?? 0,
      pendingAmount: rawMetrics?.pendingAmount ?? 0,
      failedCount: rawMetrics?.failedCount ?? 0,
      tierCounts: {
        BASIC: rawMetrics?.basicCount ?? 0,
        STANDARD: rawMetrics?.standardCount ?? 0,
        PRO: rawMetrics?.proCount ?? 0,
      },
    };

    const items = rows.map((r) => ({
      ...r.payment,
      user: {
        id: r.user?.id ?? r.payment.userId,
        email: r.user?.email ?? "Unknown",
        fullName: r.user?.fullName ?? null,
        image: r.user?.image ?? null,
      },
      festival: r.festival?.name
        ? {
            id: r.festival.id,
            name: r.festival.name,
            slug: r.festival.slug,
          }
        : null,
    }));

    return {
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
      },
      metrics,
    };
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
export type AdminPaymentItem = Awaited<
  ReturnType<typeof adminService.getPaymentsWithMetricsForAdmin>
>["items"][number];
