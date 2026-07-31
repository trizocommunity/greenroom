import { count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festivalCategoryPreference,
  payment,
  userLoginEvent as userLoginEvents,
  userPurchaseSummary,
  user as users,
} from "@/core/database/schema";
import { dateKeyUTC, parseInstant } from "@/core/datetime";
import { serverNow } from "@/core/datetime/server";

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
  const rows = await db.query.userPurchaseSummary.findMany({
    with: {
      user: {
        columns: { id: true, email: true, fullName: true, displayName: true },
      },
    },
    orderBy: [desc(userPurchaseSummary.totalSpend)],
  });

  return rows.map((row) => ({
    userId: row.userId,
    email: row.user.email,
    name: row.user.displayName || row.user.fullName || row.user.email,
    totalSpend: row.totalSpend,
    festivalsCount: row.festivalsCount,
    lastPurchaseAt: parseInstant(row.lastPurchaseAt),
    planCountsByTier:
      (row.planCountsByTier as Record<string, number> | null) ?? {},
  }));
}

export async function getTopCategories(
  limit = 8,
): Promise<CategoryAggregateDto[]> {
  const rows = await db
    .select()
    .from(festivalCategoryPreference)
    .orderBy(desc(festivalCategoryPreference.weight))
    .limit(limit * 4);

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
  // Group by userId, count logins
  const rows = await db
    .select({
      userId: userLoginEvents.userId,
      loginCount: count(userLoginEvents.id),
    })
    .from(userLoginEvents)
    .groupBy(userLoginEvents.userId);

  const userIds = rows.map((r) => r.userId);
  const userList =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            displayName: users.displayName,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const byId = new Map(userList.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const u = byId.get(row.userId);
      return {
        userId: row.userId,
        email: u?.email ?? "unknown",
        name: u?.displayName || u?.fullName || u?.email || "Unknown",
        loginCount: row.loginCount,
      };
    })
    .sort((a, b) => b.loginCount - a.loginCount);
}

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  count: number;
  amount?: number;
}

export async function getLoginsByDay(days = 14): Promise<TimeSeriesPoint[]> {
  const start = serverNow();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const events = await db
    .select({ loggedAt: userLoginEvents.loggedAt })
    .from(userLoginEvents)
    .where(gte(userLoginEvents.loggedAt, start.toISOString()));

  const byDay = new Map<string, number>();
  for (const e of events) {
    const key = dateKeyUTC(e.loggedAt);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const result: TimeSeriesPoint[] = [];
  for (let d = 0; d < days; d++) {
    const date = parseInstant(start);
    if (!date) continue;
    date.setDate(date.getDate() + d);
    const key = dateKeyUTC(date);
    result.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return result;
}

export async function getRevenueByDay(days = 14): Promise<TimeSeriesPoint[]> {
  const start = serverNow();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const payments = await db
    .select({ amount: payment.amount, createdAt: payment.createdAt })
    .from(payment)
    .where(gte(payment.createdAt, start.toISOString()));

  const byDay = new Map<string, { count: number; amount: number }>();
  for (const p of payments) {
    const key = dateKeyUTC(p.createdAt);
    const cur = byDay.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += p.amount;
    byDay.set(key, cur);
  }

  const result: TimeSeriesPoint[] = [];
  for (let d = 0; d < days; d++) {
    const date = parseInstant(start);
    if (!date) continue;
    date.setDate(date.getDate() + d);
    const key = dateKeyUTC(date);
    const cur = byDay.get(key);
    result.push({
      date: key,
      count: cur?.count ?? 0,
      amount: cur?.amount ?? 0,
    });
  }
  return result;
}
