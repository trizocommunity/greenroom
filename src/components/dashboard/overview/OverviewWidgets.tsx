import type { Festival } from "@prisma/client";
import { format } from "date-fns";
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  Building2,
  Calendar,
  ClipboardCheck,
  FileText,
  Gavel,
  LayoutDashboard,
  LayoutList,
  LifeBuoy,
  List,
  Mic,
  QrCode,
  Settings,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FeaturePath } from "@/lib/features";
import { getResolvedTier } from "@/lib/tier";
import { getDashboardOverviewData } from "@/server/models/festival.model";
import { getEffectivePlanFeatureMatrix } from "@/server/services/plan-features.service";

interface OverviewWidgetsProps {
  festival: Festival;
}

function planFeature(
  features: Partial<Record<FeaturePath, boolean>>,
  key: FeaturePath,
): boolean {
  return Boolean(features[key]);
}

export default async function OverviewWidgets({
  festival,
}: OverviewWidgetsProps) {
  const overviewData = await getDashboardOverviewData(festival.id);
  const tier = getResolvedTier(festival.tier);
  const slug = festival.slug;

  const matrix = await getEffectivePlanFeatureMatrix();
  const features = matrix[tier] ?? {};

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
      condition: planFeature(features, "festivalSettings"),
    },
    {
      label: "Groups",
      icon: Users,
      href: `/dashboard/${slug}/pre-works/groups`,
      condition: planFeature(features, "groups"),
    },
    {
      label: "Students",
      icon: UserPlus,
      href: `/dashboard/${slug}/pre-works/students`,
      condition: planFeature(features, "students"),
    },
    {
      label: "Categories",
      icon: List,
      href: `/dashboard/${slug}/pre-works/categories`,
      condition: planFeature(features, "categories"),
    },
    {
      label: "Programs",
      icon: FileText,
      href: `/dashboard/${slug}/pre-works/programmes`,
      condition: planFeature(features, "programmes"),
    },
    {
      label: "Assignment",
      icon: ClipboardCheck,
      href: `/dashboard/${slug}/pre-works/assignments`,
      condition: planFeature(features, "assignments"),
    },
    {
      label: "QR Codes",
      icon: QrCode,
      href: `/dashboard/${slug}/pre-works/qr-codes`,
      condition: planFeature(features, "qrCodes"),
    },
    {
      label: "Schedule",
      icon: Calendar,
      href: `/dashboard/${slug}/pre-works/schedule`,
      condition: planFeature(features, "schedule"),
    },
    {
      label: "Stages",
      icon: Mic,
      href: `/dashboard/${slug}/pre-works/stage-management`,
      condition: planFeature(features, "stageManagement"),
    },
    {
      label: tier === "BASIC" ? "Marks" : "Judgment",
      icon: Gavel,
      href:
        tier === "BASIC"
          ? `/dashboard/${slug}/event-works/marks`
          : `/dashboard/${slug}/event-works/judgment`,
      condition: planFeature(features, "results"),
    },
    {
      label: "Results",
      icon: BarChart2,
      href: `/dashboard/${slug}/event-works/results`,
      condition: planFeature(features, "results"),
    },
    {
      label: "Leaderboard",
      icon: Trophy,
      href: `/dashboard/${slug}/event-works/leaderboard`,
      condition: tier === "BASIC" || planFeature(features, "liveScoreboard"),
    },
    {
      label: "Documentation",
      icon: BookOpen,
      href: `/dashboard/${slug}/support/docs`,
      condition: true,
    },
    {
      label: "My Tickets",
      icon: LifeBuoy,
      href: `/dashboard/${slug}/support/tickets`,
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
              <div className="space-y-4">
                {overviewData.recentProgrammes.map((prog) => (
                  <div
                    key={prog.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 "
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
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                        {prog.category.name}
                      </p>
                    </div>
                    <div className="flex items-center flex-col">
                      {prog.status && (
                        <ProgrammeStatusBadge
                          status={prog.status}
                          className="text-[10px]"
                        />
                      )}
                      <p className="text-[12px] text-muted-foreground shrink-0">
                        {format(new Date(prog.createdAt), "dd/MM/yyyy")}
                      </p>
                    </div>
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
              <CardDescription>Programme, category and date</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="space-y-3 pr-2">
                {overviewData.recentResultsByProgramme.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No results found.
                  </p>
                ) : (
                  overviewData.recentResultsByProgramme.map(({ programme }) => (
                    <div
                      key={programme.id}
                      className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="font-medium truncate">
                              {programme.name}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{programme.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {programme.category.name}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <p className="text-xs text-muted-foreground truncate">
                          {programme.category.name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {programme.latestResultAt
                          ? format(
                              new Date(programme.latestResultAt),
                              "dd/MM/yyyy",
                            )
                          : "—"}
                      </span>
                    </div>
                  ))
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
