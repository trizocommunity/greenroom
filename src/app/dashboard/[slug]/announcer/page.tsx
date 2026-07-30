import { Mic2, Radio, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/core/auth/session";
import { getAnnouncerOverviewStats } from "@/features/announcement/services/announcement-desk.service";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";

export default async function AnnouncerOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });

  if (
    !context ||
    !["ANNOUNCER", "ADMIN", "OWNER", "SUPER_ADMIN"].includes(context.role)
  ) {
    notFound();
  }

  const festival = await findFestivalBySlugOrId(slug);
  if (!festival) notFound();

  const stats = await getAnnouncerOverviewStats(festival.id);
  const basePath = `/dashboard/${slug}`;
  const publicModeLabel =
    stats.publicDisplayMode === "team_standings"
      ? "Team standings only"
      : "Programme results";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Announcer Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Publish results to the desk, announce on mic, then publish group
          standings when due.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Public: {publicModeLabel}</Badge>
        {stats.standingsDue ? (
          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-200">
            Group standings due
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Waiting to announce</CardDescription>
            <CardTitle className="text-3xl">{stats.pendingOnDesk}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Announced programmes</CardDescription>
            <CardTitle className="text-3xl">
              {stats.announcedProgrammes}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Results until standings</CardDescription>
            <CardTitle className="text-3xl">
              {stats.resultsUntilStandings}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Number of results per block: {stats.resultsPerBlock}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Announced this block</CardDescription>
            <CardTitle className="text-3xl">
              {stats.announcedResultsSinceStandings}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`${basePath}/event-works/announcement-desk`}>
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardHeader>
              <Mic2 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Announcement</CardTitle>
              <CardDescription>
                Mark programmes as announced on-air so they appear on the public
                site.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`${basePath}/event-works/group-standings`}>
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardHeader>
              <UsersRound className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Group Standings</CardTitle>
              <CardDescription>
                Publish team standings to the public page and leaderboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`${basePath}/event-works/results`}>
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardHeader>
              <Radio className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Publish programme results to the desk.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`${basePath}/event-works/leaderboard`}>
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardHeader>
              <Trophy className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                Preview what the public sees (announced results or standings).
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
