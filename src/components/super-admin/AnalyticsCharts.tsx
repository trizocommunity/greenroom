"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSuperAdminAnalytics } from "@/api/client/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface PurchaseSummaryDto {
  userId: string;
  email: string;
  name: string;
  totalSpend: number;
  festivalsCount: number;
  lastPurchaseAt: string | null;
  planCountsByTier: Record<string, number>;
}

export interface LoginCountDto {
  userId: string;
  email: string;
  name: string;
  loginCount: number;
}

export interface CategoryAggregateDto {
  category: string;
  weight: number;
  users: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
  amount?: number;
}

export interface AnalyticsData {
  purchases: PurchaseSummaryDto[];
  logins: LoginCountDto[];
  topCategories: CategoryAggregateDto[];
  loginsByDay: TimeSeriesPoint[];
  revenueByDay: TimeSeriesPoint[];
}

// Chart series colors: brand primary/secondary plus the info/success
// design tokens (see globals.css --info / --success) for the remaining
// series so the palette stays consistent with the rest of the product.
const CHART_COLORS = {
  primary: "#d72626",
  primaryLight: "#f25c05",
  accent: "#3b82f6",
  accent2: "#10b981",
  muted: "#64748b",
};

const POLL_INTERVAL_MS = 60_000; // 1 minute

function formatRupee(paise: number) {
  return `₹${(paise / 100).toFixed(0)}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

interface AnalyticsChartsProps {
  initialData: AnalyticsData;
}

export function AnalyticsCharts({ initialData }: AnalyticsChartsProps) {
  const {
    data: fetchedData,
    dataUpdatedAt,
    refetch,
  } = useSuperAdminAnalytics(initialData);
  const data = fetchedData ?? initialData;
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialData ? new Date() : null,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  const topSpendersChart = data.purchases.slice(0, 8).map((p) => ({
    name: p.name.split(" ")[0] || p.email.slice(0, 8),
    fullName: p.name,
    spend: p.totalSpend / 100,
    count: p.festivalsCount,
  }));

  const topLoginsChart = data.logins.slice(0, 8).map((u) => ({
    name: u.name.split(" ")[0] || u.email.slice(0, 8),
    fullName: u.name,
    logins: u.loginCount,
  }));

  const categoriesChart = data.topCategories.slice(0, 8).map((c) => ({
    name: c.category.length > 12 ? c.category.slice(0, 12) + "…" : c.category,
    fullName: c.category,
    users: c.users,
    weight: c.weight,
  }));

  const loginsByDayChart = data.loginsByDay.map((p) => ({
    ...p,
    label: formatShortDate(p.date),
  }));

  const revenueByDayChart = data.revenueByDay.map((p) => ({
    ...p,
    label: formatShortDate(p.date),
    revenue: (p.amount ?? 0) / 100,
  }));

  return (
    <div className="space-y-6">
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Data refreshes every minute. Last updated:{" "}
          {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top spenders</CardTitle>
          </CardHeader>
          <CardContent>
            {topSpendersChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No purchase data yet.
              </p>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topSpendersChart}
                    layout="vertical"
                    margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `₹${v}`}
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={56}
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-premium">
                            <p className="font-medium">{d.fullName}</p>
                            <p className="text-muted-foreground">
                              {formatRupee(d.spend * 100)} · {d.count} festivals
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="spend"
                      fill={CHART_COLORS.primary}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Most active (logins)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topLoginsChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No login events yet.
              </p>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topLoginsChart}
                    layout="vertical"
                    margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={56}
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-premium">
                            <p className="font-medium">{d.fullName}</p>
                            <p className="text-muted-foreground">
                              {d.logins} logins
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="logins"
                      fill={CHART_COLORS.primaryLight}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Top festival categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoriesChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No category preferences yet.
              </p>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoriesChart}
                    margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-premium">
                            <p className="font-medium">{d.fullName}</p>
                            <p className="text-muted-foreground">
                              {d.users} users · score {d.weight}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="users"
                      fill={CHART_COLORS.accent}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Logins over time (last 14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={loginsByDayChart}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="loginsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={CHART_COLORS.primary}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={CHART_COLORS.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-premium">
                          <p className="text-muted-foreground">
                            {formatShortDate(p.date)}
                          </p>
                          <p className="font-medium">{p.count} logins</p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    fill="url(#loginsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Revenue over time (last 14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueByDayChart}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-premium">
                          <p className="text-muted-foreground">
                            {formatShortDate(p.date)}
                          </p>
                          <p className="font-medium">
                            {formatRupee(p.amount ?? 0)} · {p.count} payments
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS.accent2}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.accent2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
