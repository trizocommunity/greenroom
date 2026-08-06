import { and, count, eq, inArray } from "drizzle-orm";
import { Calendar, CheckCircle2, Gavel, Radio } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  judgementConfig as judgementConfigTable,
  programmeReportingSession as prsTable,
  stage as stageTable,
} from "@/core/database/schema";
import type { Tier } from "@/core/types/app-enums";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import {
  loadFeatureOverrides,
} from "@/features/plan-features/services/plan-features.service";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";
import { StageManagerLiveMetrics } from "./StageManagerLiveMetrics";

interface StageManagerOverviewProps {
  festivalSlug: string;
  userId: string;
}

export async function StageManagerOverview({
  festivalSlug,
  userId,
}: StageManagerOverviewProps) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true, tier: true },
  });
  if (!festival) return null;

  const assignedStageIds = await StageAssignmentService.getAssignedStageIds(
    festival.id,
    userId,
  );
  const assignedStages = assignedStageIds.length
    ? await db.query.stage.findMany({
        where: inArray(stageTable.id, assignedStageIds),
        columns: { id: true, name: true },
      })
    : [];

  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canSchedule = isEnabled(
    festival.tier,
    "schedule",
    effectiveFeatures,
  );

  const basePath = `/dashboard/${festivalSlug}`;

  const [reportingStartedCount, judgementStartedCount] = assignedStageIds.length
    ? await Promise.all([
        db
          .select({ value: count() })
          .from(prsTable)
          .where(
            and(
              eq(prsTable.festivalId, festival.id),
              inArray(prsTable.stageId, assignedStageIds),
              eq(prsTable.status, "IN_PROGRESS"),
            ),
          )
          .then((rows) => rows[0]?.value ?? 0),
        db
          .select({ value: count() })
          .from(judgementConfigTable)
          .innerJoin(
            prsTable,
            eq(judgementConfigTable.reportingSessionId, prsTable.id),
          )
          .where(
            and(
              eq(judgementConfigTable.festivalId, festival.id),
              eq(judgementConfigTable.status, "ACTIVE"),
              inArray(prsTable.stageId, assignedStageIds),
            ),
          )
          .then((rows) => rows[0]?.value ?? 0),
      ])
    : [0, 0];

  if (assignedStages.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Stage Manager Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View the schedule, sessions, and programme reporting for your
            assigned stages.
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Stage Manager Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {assignedStages.length} assigned stage
          {assignedStages.length !== 1 ? "s" : ""}:{" "}
          {assignedStages.map((s) => s.name).join(", ")}
        </p>
      </div>

      {canSchedule ? (
        <StageManagerLiveMetrics
          reportingHref={`${basePath}/event-works/reporting`}
          judgementHref={`${basePath}/event-works/judgement`}
          reportingStartedCount={reportingStartedCount}
          judgementStartedCount={judgementStartedCount}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!canSchedule ? (
          <Card className="md:col-span-2 lg:col-span-3 border-muted">
            <CardHeader>
              <CardTitle className="text-base">
                Standard plan required
              </CardTitle>
              <CardDescription>
                Schedule, sessions, and programme reporting are included on
                Standard and Pro. Upgrade this festival to access these tools.
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

        {canSchedule ? (
          <Link href={`${basePath}/event-works/judgement`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Gavel className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Judgement</CardTitle>
                    <CardDescription>
                      Manage scores, judge evaluations, and final results.
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
