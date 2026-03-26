import { notFound } from "next/navigation";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import {
  ProgrammeReportingClient,
  type ReportingBoardItem,
} from "@/components/festival/event-works/programme-reporting/ProgrammeReportingClient";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getProgrammeReportingBoardAction } from "@/server/actions/programme-reporting.actions";
import { getFestivalContext } from "@/server/services/festival-context.service";
import { getEffectiveFeatureTagEnabled } from "@/server/services/plan-features-tags.service";

export default async function ProgrammeReportingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await prisma.festival.findUnique({
    where: { slug },
    select: { id: true, name: true, tier: true },
  });
  if (!festival) notFound();
  const canUseReporting = await getEffectiveFeatureTagEnabled(
    festival.tier,
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
    prisma.programmeAssignment.findMany({
      where: { festivalId: festival.id },
      select: {
        id: true,
        programmeId: true,
        teamNumber: true,
        studentId: true,
        groupId: true,
        student: { select: { name: true } },
        group: { select: { name: true, id: true } },
      },
    }),
    prisma.stage.findMany({
      where: { festivalId: festival.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const normalizedBoard = board.map((item) => ({
    ...item,
    startTime: item.startTime,
    reportingSession: item.reportingSession
      ? {
          ...item.reportingSession,
          windowEndsAt: item.reportingSession.windowEndsAt,
        }
      : null,
  }));

  const assignments = assignmentRows.map((row) => ({
    id: row.id,
    programmeId: row.programmeId,
    studentId: row.studentId ?? null,
    studentName: row.student?.name ?? null,
    groupId: row.groupId ?? row.group?.id ?? null,
    groupName: row.group?.name ?? null,
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
              Pick a <strong>scheduled programme</strong> from the left list.
              Use filters for stage, category, type, and status.
            </li>
            <li>
              Press <strong>Start</strong> to open the live window. Mark who
              has reported. Group programmes can mark a full team together.
            </li>
            <li>
              <strong>Stop / Reset</strong> closes reporting with no code
              letters and moves the programme back to scheduled.
            </li>
            <li>
              <strong>Submit &amp; Start</strong> locks reporting and issues
              code letters: one shared code per reported team (GROUP) or one
              code per reported student (INDIVIDUAL).
            </li>
          </ul>
        </HowItWorksButton>
      </div>

      <ProgrammeReportingClient
        festivalId={festival.id}
        board={normalizedBoard as ReportingBoardItem[]}
        assignments={assignments}
        festivalStages={festivalStages}
      />
    </div>
  );
}
