import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import { ListChecks, Mic2, Trophy } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  programme as programmeTable,
} from "@/core/database/schema";
import type { Tier } from "@/core/types/app-enums";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";

interface AnnouncerOverviewProps {
  festivalSlug: string;
}

export async function AnnouncerOverview({
  festivalSlug,
}: AnnouncerOverviewProps) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true, tier: true },
  });
  if (!festival) return null;

  const tier = (festival.tier ?? "STANDARD") as Tier;
  const canUseExternalJudging = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.externalJudging",
  );

  const basePath = `/dashboard/${festivalSlug}`;

  const [pendingAnnouncementCount, announcedCount] = await Promise.all([
    db
      .select({ value: count() })
      .from(programmeTable)
      .where(
        and(
          eq(programmeTable.festivalId, festival.id),
          inArray(programmeTable.status, ["JUDGED", "ENDED"]),
        ),
      )
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(programmeTable)
      .where(
        and(
          eq(programmeTable.festivalId, festival.id),
          inArray(programmeTable.status, ["ANNOUNCED", "PUBLISHED"]),
          isNotNull(programmeTable.resultNumber),
        ),
      )
      .then((rows) => rows[0]?.value ?? 0),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Announcer Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Announce results and manage the public leaderboard.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Pending Announcements
            </CardTitle>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md dark:bg-amber-950 dark:text-amber-400">
              <Mic2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingAnnouncementCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Results ready to announce
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Announced
            </CardTitle>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md dark:bg-emerald-950 dark:text-emerald-400">
              <Trophy className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{announcedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Results published
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {canUseExternalJudging ? (
          <Link href={`${basePath}/event-works/announcer`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mic2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Announcer Console</CardTitle>
                    <CardDescription>
                      Assign result numbers and announce to the public site.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ) : null}

        {canUseExternalJudging ? (
          <Link href={`${basePath}/event-works/results`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ListChecks className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Results</CardTitle>
                    <CardDescription>
                      View and manage published competition results.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ) : null}

        <Link href={`${basePath}/event-works/leaderboard`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Leaderboard</CardTitle>
                  <CardDescription>
                    Live team standings and points overview.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        {!canUseExternalJudging ? (
          <Card className="md:col-span-2 border-muted">
            <CardHeader>
              <CardTitle className="text-base">
                External judging not enabled
              </CardTitle>
              <CardDescription>
                The announcer console and results page require external judging
                to be enabled for this festival&apos;s plan.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
