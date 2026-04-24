import { eq } from "drizzle-orm";
import { Calendar, CheckCircle2, Megaphone, Mic2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";

export default async function StageManagerOverviewPage({
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

  if (!context || context.role !== "STAGE_MANAGER") notFound();

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    columns: { tier: true },
  });

  const canStages = festival
    ? await getEffectiveFeatureEnabled(festival.tier as any, "stageManagement")
    : false;
  const canSchedule = festival
    ? await getEffectiveFeatureEnabled(festival.tier as any, "schedule")
    : false;

  const basePath = `/dashboard/${slug}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Stage Manager Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage stages and view the schedule for your festival (Standard plan
          and above).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {!canStages && !canSchedule ? (
          <Card className="md:col-span-2 lg:col-span-4 border-muted">
            <CardHeader>
              <CardTitle className="text-base">
                Standard plan required
              </CardTitle>
              <CardDescription>
                Stage management, schedule, sessions, and programme reporting
                are included on Standard and Pro. Upgrade this festival to
                access these tools.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        {canStages ? (
          <Link href={`${basePath}/pre-works/stage-management`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Megaphone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Stage Management</CardTitle>
                    <CardDescription>
                      Manage stages and programme flow for the event.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ) : null}

        {canSchedule ? (
          <Link href={`${basePath}/pre-works/schedule`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Schedule</CardTitle>
                    <CardDescription>
                      View programme slots and session times.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ) : null}

        {canSchedule ? (
          <Link href={`${basePath}/pre-works/sessions`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mic2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Sessions</CardTitle>
                    <CardDescription>
                      Create and manage talks, ceremonies, and sessions.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ) : null}

        {canSchedule ? (
          <Link href={`${basePath}/event-works/reporting`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Programme Reporting</CardTitle>
                    <CardDescription>
                      Start reporting, mark participants, and close sessions.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
