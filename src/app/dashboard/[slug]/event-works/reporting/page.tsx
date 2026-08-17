import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { ProgrammeReportingClient } from "@/components/festival/event-works/programme-reporting/ProgrammeReportingClient";
import type { ReportingBoardItem } from "@/components/festival/event-works/programme-reporting/types";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  stage as stageTable,
} from "@/core/database/schema";
import type { Tier } from "@/core/types/app-enums";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";
import { getProgrammeAssignmentsAction } from "@/features/programmes/actions/get-assignments.action";
import { getProgrammeReportingBoardAction } from "@/features/programmes/actions/programme-reporting.actions";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";
import { getStageFilterCookie } from "@/features/stages/stage-filter-cookie.server";

export default async function ProgrammeReportingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    columns: { id: true, name: true, tier: true },
  });
  if (!festival) notFound();

  const canUseReporting = await getEffectiveFeatureTagEnabled(
    festival.tier as Tier,
    "eventWorks.reporting",
  );
  if (!canUseReporting) notFound();

  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });
  if (!context) notFound();
  if (
    !["OWNER", "ADMIN", "STAGE_MANAGER", "SUPER_ADMIN"].includes(context.role)
  ) {
    notFound();
  }

  const [boardResult, assignments, festivalStages] = await Promise.all([
    getProgrammeReportingBoardAction(festival.id),
    getProgrammeAssignmentsAction(festival.id),
    db.query.stage.findMany({
      where: eq(stageTable.festivalId, festival.id),
      columns: { id: true, name: true },
      orderBy: [asc(stageTable.name)],
    }),
  ]);

  const accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(
    festival.id,
    session,
  );

  const scopedStages =
    accessibleStageIds === "all"
      ? festivalStages
      : festivalStages.filter((s) => accessibleStageIds.includes(s.id));

  const isStageManager = context.role === "STAGE_MANAGER";
  const initialStageId = isStageManager
    ? await getStageFilterCookie(
        festival.id,
        scopedStages.map((s) => s.id),
      )
    : null;

  const normalizedBoard = (boardResult as any[]).map((item: any) => ({
    ...item,
    startTime: item.startTime ?? null,
    reportingSession: item.reportingSession
      ? {
          ...item.reportingSession,
          startedAt:
            item.reportingSession.startedAt instanceof Date
              ? item.reportingSession.startedAt
              : item.reportingSession.startedAt
                ? new Date(item.reportingSession.startedAt)
                : null,
          windowEndsAt:
            item.reportingSession.windowEndsAt instanceof Date
              ? item.reportingSession.windowEndsAt
              : item.reportingSession.windowEndsAt
                ? new Date(item.reportingSession.windowEndsAt)
                : null,
        }
      : null,
  })) as ReportingBoardItem[];

  return (
    <div className="space-y-4 pt-4 sm:pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Programme Reporting
        </h1>
        <HowItWorksButton title="How programme reporting works">
          <ul className="space-y-2 pl-5 text-muted-foreground leading-relaxed [&>li]:list-disc">
            <li>
              Search or <strong>Filter</strong> the queue to find a slot, then
              pick it to open its reporting drawer. Ended sessions are hidden
              until you enable <strong>Show ended</strong> in the filter.
            </li>
            <li>
              <strong>Start reporting</strong> opens check-in. Mark who is
              present via QR or the roster. For each present row, use{" "}
              <strong>Spin</strong> to draw a code letter.
            </li>
            <li>
              <strong>Stop without codes</strong> ends the session without
              issuing letters (programme returns to a schedulable state).
            </li>
            <li>
              <strong>Submit &amp; notify</strong> finalizes reporting, issues
              codes (one per team for GROUP, one per participant for
              INDIVIDUAL), and notifies participants and team leaders.
            </li>
          </ul>
        </HowItWorksButton>
      </div>

      <ProgrammeReportingClient
        festivalId={festival.id}
        board={normalizedBoard as ReportingBoardItem[]}
        assignments={assignments}
        festivalStages={scopedStages}
        initialStageId={initialStageId}
        hideStageFilter={isStageManager}
      />
    </div>
  );
}
