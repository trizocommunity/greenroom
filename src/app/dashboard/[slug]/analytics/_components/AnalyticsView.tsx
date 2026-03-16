"use client";

import {
  Award,
  BarChart3,
  ClipboardList,
  FileCheck,
  FolderOpen,
  Layers,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type FestivalAnalyticsData = {
  studentsCount: number;
  programmesCount: number;
  groupsCount: number;
  stagesCount: number;
  resultsCount: number;
  publishedResultsCount: number;
  categoriesCount: number;
  judgesCount: number;
};

interface AnalyticsViewProps {
  festivalName: string;
  data: FestivalAnalyticsData;
  tierLabel: string;
}

const fmt = (n: number) => n.toLocaleString();

export function AnalyticsView({
  festivalName,
  data,
  tierLabel,
}: AnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.studentsCount)}</div>
            <p className="text-xs text-muted-foreground">Students registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programmes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.programmesCount)}</div>
            <p className="text-xs text-muted-foreground">Competition items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groups / Teams</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.groupsCount)}</div>
            <p className="text-xs text-muted-foreground">Teams or groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stages</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.stagesCount)}</div>
            <p className="text-xs text-muted-foreground">Venues / stages</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Results</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.resultsCount)}</div>
            <p className="text-xs text-muted-foreground">Total result entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmt(data.publishedResultsCount)}
            </div>
            <p className="text-xs text-muted-foreground">Results live to public</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.categoriesCount)}</div>
            <p className="text-xs text-muted-foreground">Competition categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Judges</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.judgesCount)}</div>
            <p className="text-xs text-muted-foreground">Judge slots / count</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reports & charts
          </CardTitle>
          <CardDescription>
            Custom reports and trend charts for {festivalName} (Plan:{" "}
            {tierLabel})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video min-h-[280px] rounded-lg border border-dashed bg-muted/30 flex items-center justify-center text-muted-foreground">
            Charts and custom reports coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
