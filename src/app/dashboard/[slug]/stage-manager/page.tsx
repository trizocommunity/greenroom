import { eq, inArray } from "drizzle-orm";
import { Calendar, CheckCircle2, Megaphone, Mic2, Radio } from "lucide-react";
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
import { festival as festivalTable, stage as stageTable } from "@/core/database/schema";
import type { Tier } from "@/core/types/app-enums";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";

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
    columns: { id: true, tier: true },
  });
  if (!festival) notFound();

  const assignedStageIds = session?.userId
    ? await StageAssignmentService.getAssignedStageIds(
        festival.id,
        session.userId,
      )
    : [];
  const assignedStages = assignedStageIds.length
    ? await db.query.stage.findMany({
        where: inArray(stageTable.id, assignedStageIds),
        columns: { id: true, name: true },
      })
    : [];

  const canSchedule = await getEffectiveFeatureEnabled(
    festival.tier as Tier,
    "schedule",
  );

  const basePath = `/dashboard/${slug}`;

  if (assignedStages.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Stage Manager Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View the schedule, sessions, and programme reporting for your assigned stages.
          </p>
        </div>
        <Card className="border-dashed">
          <CardHeader className="items-center text-center py-10">
            <div className="p-3 rounded-full bg-muted mb-2">
              <Radio className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">
              You haven&apos;t been assigned to a stage yet
            </CardTitle>
            <CardDescription className="max-w-sm">
              A festival admin needs to assign you to a stage before you can
              manage its schedule, sessions, or programme reporting.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-4">
          Stage Manager Overview
        </h1>
        <div className="flex flex-col gap-2 p-5 rounded-xl border border-border bg-card/50 shadow-sm">
          <p className="text-sm text-muted-foreground">
            You are assigned to manage the following {assignedStages.length === 1 ? "stage" : "stages"}:
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {assignedStages.map((s) => (
              <span key={s.id} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
                <Megaphone className="w-4 h-4 mr-2" />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!canSchedule ? (
          <Card className="md:col-span-2 lg:col-span-3 border-muted">
            <CardHeader>
              <CardTitle className="text-base">
                Standard plan required
              </CardTitle>
              <CardDescription>
                Schedule, sessions, and programme reporting
                are included on Standard and Pro. Upgrade this festival to
                access these tools.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {canSchedule ? (
          <Link href={`${basePath}/pre-event-works/schedule`}>
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
          <Link href={`${basePath}/pre-event-works/sessions`}>
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
