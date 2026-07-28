import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { ProgrammeReportingClient } from "@/components/festival/event-works/programme-reporting/ProgrammeReportingClient";
import type { ReportingBoardItem } from "@/components/festival/event-works/programme-reporting/types";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  festival as festivalTable,
  stage as stageTable,
} from "@/core/database/schema";
import type { Tier } from "@/core/types/app-enums";
import { parseStoredInstant } from "@/core/utils/date-time";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";
import { getProgrammeReportingBoardAction } from "@/features/programmes/actions/programme-reporting.actions";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";

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
  const [board, assignmentRows, festivalStages] = await Promise.all([
    getProgrammeReportingBoardAction(festival.id),
    db.query.programmeAssignment.findMany({
      where: eq(assignmentTable.festivalId, festival.id),
      with: {
        student: { columns: { name: true, chestNumber: true } },
        group: { columns: { name: true, id: true } },
      },
      columns: {
        id: true,
        programmeId: true,
        teamNumber: true,
        studentId: true,
        groupId: true,
      },
    }),
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

  const normalizedBoard = (board as any[])
    .filter(
      (item: any) =>
        accessibleStageIds === "all" ||
        !item.stage ||
        accessibleStageIds.includes(item.stage.id),
    )
    .map((item: any) => ({
      ...item,
      startTime: item.startTime
        ? parseStoredInstant(item.startTime)
        : new Date(),
      reportingSession: item.reportingSession
        ? {
            ...item.reportingSession,
            windowEndsAt: item.reportingSession.windowEndsAt
              ? parseStoredInstant(item.reportingSession.windowEndsAt)
              : null,
          }
        : null,
    })) as ReportingBoardItem[];

  const assignments = assignmentRows.map((row) => ({
    id: row.id,
    programmeId: row.programmeId,
    studentId: row.studentId ?? null,
    studentName: (row as any).student?.name ?? null,
    chestNumber: (row as any).student?.chestNumber ?? null,
    groupId: row.groupId ?? (row as any).group?.id ?? null,
    groupName: (row as any).group?.name ?? null,
    teamNumber: row.teamNumber ?? null,
  }));

  return (
    <div className="space-y-4 pt-4 sm:pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Programme Reporting
        </h1>
        <HowItWorksButton title="How programme reporting works">
          <ul className="space-y-2 pl-5 text-muted-foreground leading-relaxed [&>li]:list-disc">
            <li>
              Under <strong>Up next</strong>, pick a slot that is not started or
              already live. Use <strong>Full list</strong> to include finished
              sessions and filter by status.
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
              codes (one per team for GROUP, one per student for INDIVIDUAL),
              and notifies students and team leaders.
            </li>
          </ul>
        </HowItWorksButton>
      </div>

      <ProgrammeReportingClient
        festivalId={festival.id}
        board={normalizedBoard as ReportingBoardItem[]}
        assignments={assignments}
        festivalStages={scopedStages}
      />
    </div>
  );
}
