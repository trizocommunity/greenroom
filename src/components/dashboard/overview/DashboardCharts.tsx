"use client";

import { LayoutList, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const categoryChartConfig = {
  count: {
    label: "Participants",
  },
} satisfies ChartConfig;

const teamChartConfig = {
  count: {
    label: "Participants",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

interface DashboardChartsProps {
  teamChartData: { name: string; count: number; fill: string }[];
  categoryChartData: {
    name: string;
    type?: string;
    count: number;
    fill: string;
  }[];
}

export function DashboardCharts({
  teamChartData,
  categoryChartData,
}: DashboardChartsProps) {
  const totalTeamParticipants = teamChartData.reduce(
    (acc, curr) => acc + curr.count,
    0,
  );

  return (
    <>
      {/* Donut Chart */}
      <Card className="flex flex-col shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" /> Participants by
            Team
          </CardTitle>
          <CardDescription>Event group overview</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 flex-1 flex items-center justify-center">
          {teamChartData.length > 0 ? (
            <ChartContainer
              config={teamChartConfig}
              className="mx-auto aspect-square max-h-[250px] w-full"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={teamChartData}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={60}
                />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm mt-auto">
          <div className="flex items-center gap-2 leading-none font-medium">
            Total of {totalTeamParticipants} participants grouped by team
          </div>
        </CardFooter>
      </Card>

      {/* Bar Chart */}
      <Card className="flex flex-col shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <LayoutList className="w-4 h-4 text-muted-foreground" />{" "}
            Participants by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex-1">
          {categoryChartData.length > 0 ? (
            <ChartContainer config={categoryChartConfig} className="w-full">
              <BarChart
                accessibilityLayer
                data={categoryChartData}
                layout="vertical"
                margin={{
                  left: 0,
                  right: 32,
                }}
              >
                <XAxis type="number" dataKey="count" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  hide
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={4}
                  maxBarSize={48}
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="name"
                    position="insideLeft"
                    offset={8}
                    className="fill-white font-medium text-xs shadow-sm"
                  />
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={8}
                    className="fill-foreground font-semibold text-xs"
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
