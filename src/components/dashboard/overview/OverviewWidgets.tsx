import { format } from "date-fns";
import {
  Building2,
  LayoutList,
  Users,
  ArrowRight,
  LayoutDashboard,
  UserPlus,
  List,
  FileText,
  Settings,
  Settings2,
  Mic,
  Trophy,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDashboardOverviewData } from "@/server/models/festival.model";
import { FeatureService } from "@/lib/features";
import { getResolvedTier } from "@/lib/tier";
import type { Festival } from "@prisma/client";

interface OverviewWidgetsProps {
  festival: Festival;
}

export default async function OverviewWidgets({
  festival,
}: OverviewWidgetsProps) {
  const overviewData = await getDashboardOverviewData(festival.id);
  const tier = getResolvedTier(festival.tier);
  const slug = festival.slug;

  const canAccessSettings = FeatureService.isFeatureEnabled(
    tier,
    "festivalSettings",
  );
  const canManageStages = FeatureService.isFeatureEnabled(
    tier,
    "stageManagement",
  );

  const fmt = (n: number | undefined) => n?.toLocaleString() || "0";

  const quickActions = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      href: `/dashboard/${slug}`,
      condition: true,
    },
    {
      label: "Settings",
      icon: Settings,
      href: `/dashboard/${slug}/settings`,
      condition: canAccessSettings,
    },
    {
      label: "Groups",
      icon: Users,
      href: `/dashboard/${slug}/pre-works/groups`,
      condition: true,
    },
    {
      label: "Students",
      icon: UserPlus,
      href: `/dashboard/${slug}/pre-works/students`,
      condition: true,
    },
    {
      label: "Categories",
      icon: List,
      href: `/dashboard/${slug}/pre-works/categories`,
      condition: true,
    },
    {
      label: "Programs",
      icon: FileText,
      href: `/dashboard/${slug}/pre-works/programmes`,
      condition: true,
    },
    {
      label: "Program Control",
      icon: Settings2,
      href: `/dashboard/${slug}/event-works/results`,
      condition: true,
    },
    {
      label: "Stages",
      icon: Mic,
      href: `/dashboard/${slug}/pre-works/stage-management`,
      condition: canManageStages,
    },
    {
      label: "Marks",
      icon: ClipboardList,
      href: `/dashboard/${slug}/event-works/results`,
      condition: true,
    },
    {
      label: "Leaderboard",
      icon: Trophy,
      href: `/dashboard/${slug}/event-works/leaderboard`,
      condition: true,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {festival.expiresAt && (
        <div className="bg-muted/50 p-2 text-xs text-center text-muted-foreground border-b mb-4">
          Expires on {new Date(festival.expiresAt).toLocaleDateString()}
        </div>
      )}

      {/* Top: 3 Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Programmes
            </CardTitle>
            <LayoutList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmt(overviewData.totalProgrammes)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmt(overviewData.totalStudents)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmt(overviewData.totalGroups)}
            </div>
          </CardContent>
        </Card>
      </div>

      <TooltipProvider>
        {/* Middle section: Recent Programmes, Recent Students, Recent Results */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Recent Programmes</CardTitle>
              <CardDescription>Latest added programmes</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="space-y-4 pr-2">
                {overviewData.recentProgrammes.map((prog) => (
                  <div
                    key={prog.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm font-medium leading-none truncate max-w-[200px]">
                            {prog.name}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{prog.name}</p>
                        </TooltipContent>
                      </Tooltip>
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                        {prog.category.name}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0 ml-4">
                      {format(new Date(prog.createdAt), "dd/MM/yyyy")}
                    </p>
                  </div>
                ))}
                {overviewData.recentProgrammes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No programmes found.
                  </p>
                )}
              </div>
              <div className="pt-4 border-t mt-auto">
                <Link
                  href={`/dashboard/${slug}/pre-works/programmes`}
                  className="w-full flex items-center justify-center py-2 text-sm border rounded-md hover:bg-muted/50 transition-colors"
                >
                  View All Programmes <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Recent Students</CardTitle>
              <CardDescription>Latest added students</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="space-y-4 pr-2">
                {overviewData.recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 gap-4"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm font-medium leading-none uppercase truncate flex-1">
                          {student.name}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{student.name}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-muted-foreground shrink-0 truncate max-w-[120px]">
                          {student.group?.name || "No Group"}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{student.group?.name || "No Group"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
                {overviewData.recentStudents.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No students found.
                  </p>
                )}
              </div>
              <div className="pt-4 border-t mt-auto">
                <Link
                  href={`/dashboard/${slug}/pre-works/students`}
                  className="w-full flex items-center justify-center py-2 text-sm border rounded-md hover:bg-muted/50 transition-colors"
                >
                  View All Students <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Recent Results</CardTitle>
              <CardDescription>Latest published scores</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="space-y-4 pr-2">
                {overviewData.recentResults.map((result) => {
                  const assigneeName =
                    result.assignment.student?.name ||
                    result.assignment.group?.name ||
                    "Unknown";
                  return (
                    <div
                      key={result.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-medium leading-none truncate max-w-[150px]">
                              {assigneeName}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{assigneeName}</p>
                          </TooltipContent>
                        </Tooltip>
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[150px]">
                          {result.programme.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-medium">
                          {result.grade
                            ? result.grade
                            : result.position
                              ? `Rank: ${result.position}`
                              : `${result.score} pts`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(result.createdAt), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {overviewData.recentResults.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No results found.
                  </p>
                )}
              </div>
              <div className="pt-4 border-t mt-auto">
                <Link
                  href={`/dashboard/${slug}/event-works/results`}
                  className="w-full flex items-center justify-center py-2 text-sm border rounded-md hover:bg-muted/50 transition-colors"
                >
                  View All Results <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Bottom section: Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your festival components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              if (!action.condition) return null;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center px-4 py-3 bg-card border rounded-md hover:bg-muted/50 transition-colors text-sm font-medium"
                >
                  <action.icon className="mr-3 h-5 w-5 text-muted-foreground" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
