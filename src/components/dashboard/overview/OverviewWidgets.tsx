import {
  BarChart2,
  BookOpen,
  Building2,
  Calendar,
  ClipboardCheck,
  FileText,
  Gavel,
  LayoutDashboard,
  LifeBuoy,
  List,
  Mic,
  Settings,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { LiveLinksCard } from "@/components/dashboard/overview/LiveLinksCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { festival as festivalSchema } from "@/core/database/schema";
import { getDashboardOverviewData } from "@/features/festivals/repositories/festival.repository";
import type { FeaturePath } from "@/features/plan-features/services/features";
import { isFeatureTagEnabled } from "@/features/plan-features/services/features-tags";
import { getEffectivePlanFeatureMatrix } from "@/features/plan-features/services/plan-features.service";
import { getResolvedTier } from "@/features/plan-features/services/tier";
import { DashboardCharts } from "./DashboardCharts";

interface OverviewWidgetsProps {
  festival: typeof festivalSchema.$inferSelect;
}

function planFeature(
  features: Partial<Record<FeaturePath, boolean>>,
  key: FeaturePath,
): boolean {
  return Boolean(features[key]);
}

const COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--info)",
  "var(--warning)",
  "var(--secondary)",
  "var(--purple)",
  "var(--pink)",
];

export default async function OverviewWidgets({
  festival,
}: OverviewWidgetsProps) {
  const overviewData = await getDashboardOverviewData(festival.id);
  const tier = getResolvedTier(festival.tier);
  const slug = festival.slug;
  const festivalTz = festival.timezone ?? "UTC";

  const matrix = await getEffectivePlanFeatureMatrix();
  const features = matrix[tier] ?? {};
  const canUseExternalJudging = isFeatureTagEnabled({
    tier,
    tag: "eventWorks.externalJudging",
    effectiveFeatureMatrix: features,
  });
  const canUseMarksUI = isFeatureTagEnabled({
    tier,
    tag: "eventWorks.marksUI",
    effectiveFeatureMatrix: features,
  });

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
      href: `/dashboard/${slug}/pre-event-works/groups`,
      condition: planFeature(features, "groups"),
    },
    {
      label: "Participants",
      icon: UserPlus,
      href: `/dashboard/${slug}/pre-event-works/participants`,
      condition: planFeature(features, "participants"),
    },
    {
      label: "Categories",
      icon: List,
      href: `/dashboard/${slug}/pre-event-works/categories`,
      condition: planFeature(features, "categories"),
    },
    {
      label: "Programs",
      icon: FileText,
      href: `/dashboard/${slug}/pre-event-works/programmes`,
      condition: planFeature(features, "programmes"),
    },
    {
      label: "Assignment",
      icon: ClipboardCheck,
      href: `/dashboard/${slug}/pre-event-works/assignments`,
      condition: planFeature(features, "assignments"),
    },
    {
      label: "Schedule",
      icon: Calendar,
      href: `/dashboard/${slug}/pre-event-works/schedule`,
      condition: planFeature(features, "schedule"),
    },
    {
      label: "Stages",
      icon: Mic,
      href: `/dashboard/${slug}/pre-event-works/stage-management`,
      condition: planFeature(features, "stageManagement"),
    },
    {
      label: canUseExternalJudging
        ? "Judgement"
        : canUseMarksUI
          ? tier === "BASIC"
            ? "Scoring"
            : "Marks"
          : "Judgement",
      icon: Gavel,
      href: canUseExternalJudging
        ? `/dashboard/${slug}/event-works/judgement`
        : `/dashboard/${slug}/event-works/marks`,
      condition:
        (canUseExternalJudging || canUseMarksUI) &&
        planFeature(features, "results"),
    },
    {
      label: "Results",
      icon: BarChart2,
      href: `/dashboard/${slug}/event-works/results`,
      condition: canUseExternalJudging && planFeature(features, "results"),
    },
    {
      label: "Top Scorers",
      icon: Trophy,
      href: `/dashboard/${slug}/event-works/top-scorers`,
      condition: planFeature(features, "liveScoreboard"),
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

  const categoryChartData = overviewData.participantsByCategory
    .filter((d) => d.type !== "GENERAL")
    .map((d, i) => ({
      name: d.name,
      count: d.count,
      fill: COLORS[i % COLORS.length],
    }));

  const teamChartData = overviewData.participantsByTeam.map((d, i) => ({
    name: d.name,
    count: d.count,
    fill: COLORS[i % COLORS.length],
  }));

  // Ensure items for leaderboard
  const teamStandingsList = Array.isArray(overviewData.teamStandings)
    ? (overviewData.teamStandings as any[]).map((t, idx) => ({
        rank: idx + 1,
        name: t.name || t.groupName || "Unknown",
        points: t.points || t.totalPoints || 0,
      }))
    : [];
  const topTeams = teamStandingsList.slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* Left Column (Main Content) */}
        <div className="flex flex-col gap-4">
          {/* Top: 6 Stat Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Participants
                </CardTitle>
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {fmt(overviewData.totalParticipants)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Registered</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Competitions
                </CardTitle>
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                  <Trophy className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {fmt(overviewData.totalProgrammes)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overviewData.programmesActiveCount} Active /{" "}
                  {overviewData.programmesFinalCount} Final
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Teams
                </CardTitle>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                  <Building2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {fmt(overviewData.totalGroups)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Participating
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Categories
                </CardTitle>
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-md">
                  <FileText className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {fmt(overviewData.totalCategories)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Event groups
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Stages
                </CardTitle>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                  <Mic className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {fmt(overviewData.totalStages)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active stages
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Judges
                </CardTitle>
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-md">
                  <Gavel className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {fmt(overviewData.totalJudges)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Registered</p>
              </CardContent>
            </Card>
          </div>

          {/* Main charts area */}
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardCharts
              teamChartData={teamChartData}
              categoryChartData={categoryChartData}
            />
          </div>
        </div>

        {/* Leaderboard sidebar */}
        <div className="flex flex-col">
          <Card className="shadow-sm flex flex-col flex-1 h-full min-h-[500px]">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-500" /> Team Leaderboard
              </CardTitle>
              <CardDescription className="text-xs ml-7">
                Points from published results
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              <div className="flex flex-col">
                {topTeams.length > 0 ? (
                  topTeams.map((team, idx) => (
                    <div
                      key={team.name}
                      className="flex items-center justify-between py-3 px-4 border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0
                              ? "bg-amber-100 text-amber-700"
                              : idx === 1
                                ? "bg-slate-100 text-slate-700"
                                : idx === 2
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {idx === 0
                            ? "1"
                            : idx === 1
                              ? "2"
                              : idx === 2
                                ? "3"
                                : team.rank}
                        </div>
                        <span
                          className={`text-sm ${idx < 3 ? "font-medium" : ""}`}
                        >
                          {team.name}
                        </span>
                      </div>
                      <div className="font-semibold text-sm flex items-baseline gap-1">
                        {team.points}{" "}
                        <span className="text-xs text-muted-foreground font-normal">
                          pts
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No points awarded yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live links */}
      <LiveLinksCard
        slug={slug}
        publicSiteEnabled={festival.publicSiteEnabled ?? false}
      />

      {/* Bottom section: Quick Actions */}
      <Card className="shadow-sm">
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
