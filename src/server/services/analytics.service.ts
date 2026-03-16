import { prisma } from "@/lib/db";
import type {
  FestivalCategoryPreference,
  UserLoginEvent,
  UserPurchaseSummary,
} from "@prisma/client";

interface PurchaseSummaryDto {
  userId: string;
  email: string;
  name: string;
  totalSpend: number;
  festivalsCount: number;
  lastPurchaseAt: Date | null;
  planCountsByTier: Record<string, number>;
}

interface LoginCountDto {
  userId: string;
  email: string;
  name: string;
  loginCount: number;
}

interface CategoryAggregateDto {
  category: string;
  weight: number;
  users: number;
}

export async function getPurchaseSummaries(): Promise<PurchaseSummaryDto[]> {
  const rows = await prisma.userPurchaseSummary.findMany({
    include: {
      user: {
        select: { id: true, email: true, fullName: true, displayName: true },
      },
    },
    orderBy: { totalSpend: "desc" },
  });

  return rows.map((row: UserPurchaseSummary & { user: { email: string; fullName: string | null; displayName: string | null } }) => ({
    userId: row.userId,
    email: row.user.email,
    name: row.user.displayName || row.user.fullName || row.user.email,
    totalSpend: row.totalSpend,
    festivalsCount: row.festivalsCount,
    lastPurchaseAt: row.lastPurchaseAt ?? null,
    planCountsByTier:
      (row.planCountsByTier as Record<string, number> | null) ?? {},
  }));
}

export async function getTopCategories(limit = 8): Promise<CategoryAggregateDto[]> {
  const rows: FestivalCategoryPreference[] =
    await prisma.festivalCategoryPreference.findMany({
    orderBy: { weight: "desc" },
    take: limit * 4, // fetch extra for grouping
  });

  const byCategory = new Map<string, CategoryAggregateDto>();

  for (const r of rows) {
    const existing: CategoryAggregateDto = byCategory.get(r.category) ?? {
      category: r.category,
      weight: 0,
      users: 0,
    };
    existing.weight += r.weight;
    existing.users += 1;
    byCategory.set(r.category, existing);
  }

  return Array.from(byCategory.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

export async function getLoginCounts(): Promise<LoginCountDto[]> {
  const rows = await prisma.userLoginEvent.groupBy({
    by: ["userId"],
    _count: { _all: true },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, email: true, fullName: true, displayName: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const u = byId.get(row.userId);
      return {
        userId: row.userId,
        email: u?.email ?? "unknown",
        name: u?.displayName || u?.fullName || u?.email || "Unknown",
        loginCount: row._count._all,
      };
    })
    .sort((a, b) => b.loginCount - a.loginCount);
}

/** Data point for time-series charts (e.g. logins or revenue by day). */
export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  count: number;
  amount?: number; // revenue in smallest unit (paise)
}

/** Logins per day for the last N days (for charts). */
export async function getLoginsByDay(days = 14): Promise<TimeSeriesPoint[]> {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const events = await prisma.userLoginEvent.findMany({
    where: { loggedAt: { gte: start } },
    select: { loggedAt: true },
  });

  const byDay = new Map<string, number>();
  for (const e of events) {
    const key = e.loggedAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const result: TimeSeriesPoint[] = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const key = date.toISOString().slice(0, 10);
    result.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return result;
}

/** Revenue (PAID payments) per day for the last N days (for charts). */
export async function getRevenueByDay(days = 14): Promise<TimeSeriesPoint[]> {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const payments = await prisma.payment.findMany({
    where: { status: "PAID", createdAt: { gte: start } },
    select: { amount: true, createdAt: true },
  });

  const byDay = new Map<string, { count: number; amount: number }>();
  for (const p of payments) {
    const key = p.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += p.amount;
    byDay.set(key, cur);
  }

  const result: TimeSeriesPoint[] = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const key = date.toISOString().slice(0, 10);
    const cur = byDay.get(key);
    result.push({
      date: key,
      count: cur?.count ?? 0,
      amount: cur?.amount ?? 0,
    });
  }
  return result;
}

