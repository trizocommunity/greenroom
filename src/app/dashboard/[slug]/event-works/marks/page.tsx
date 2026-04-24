import { db } from "@/lib/db";
import { festival as festivalTable, programmeAssignment as assignmentTable, programme as programmeTable, programmeJudgeSession as pjsTable } from "@/server/db/schema";
import { eq, asc, desc, inArray, count, and } from "drizzle-orm";
import { Calendar, ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { BasicMarksClient } from "@/components/dashboard/marks/BasicMarksClient";
import { filterProgrammesForEventWorks, type ProgrammeStatus, type Tier } from "@/server/services/programme-status.service";

export const metadata: Metadata = {
  title: "Results",
};

export default async function MarksRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    with: {
      categories: { orderBy: [asc(festivalTable.name)] },
      programmes: {
        with: {
          category: true,
          assignments: {
            with: {
              student: true,
              group: true,
              result: true,
            },
          },
          programmeJudgeSessions: {
            where: (pjs, { isNull }) => isNull(pjs.usedAt),
            orderBy: [desc(pjsTable.startedAt)],
            limit: 1,
          },
        },
        orderBy: [desc(programmeTable.createdAt)],
      },
    },
  });

  if (!festival) {
    return notFound();
  }

  const tier = (festival.tier ?? "STANDARD") as Tier;

  // For Standard/Pro, redirect to the dedicated judgment route.
  if (tier !== "BASIC") {
    redirect(`/dashboard/${slug}/event-works/judgment`);
  }

  const judgmentAllowedStatuses: ProgrammeStatus[] =
    tier === "BASIC"
      ? []
      : ["STARTED", "ENDED", "JUDGED", "PUBLISHED"];

  const eventWorksProgrammes =
    tier === "BASIC"
      ? filterProgrammesForEventWorks(festival.programmes as any, tier)
      : (festival.programmes as any[]).filter((p) =>
          judgmentAllowedStatuses.includes(p.status),
        );

  if (eventWorksProgrammes.length === 0) {
    if (tier === "BASIC") {
      return (
        <EmptyState
          title="No Assignments Found"
          description="Judgment can only be recorded after students are assigned to programmes."
          actionLabel="Go to Assignments"
          actionLink={`/dashboard/${slug}/pre-works/assignments`}
          icon={ClipboardList}
        />
      );
    }
    return (
      <EmptyState
        title="No programmes in Event Works yet"
        description="On Standard and Pro plans, programmes appear here only after they are added to the schedule. Add your programmes to the schedule in Pre-Works to see them in Judgment, Results, and Leaderboard."
        actionLabel="Go to Schedule"
        actionLink={`/dashboard/${slug}/pre-works/schedule`}
        icon={Calendar}
      />
    );
  }

  const progIds = eventWorksProgrammes.map((p: any) => p.id);
  const [assignmentCountResult] = await db
    .select({ c: count() })
    .from(assignmentTable)
    .where(inArray(assignmentTable.programmeId, progIds));

  if (assignmentCountResult.c === 0) {
    return (
      <EmptyState
        title="No Assignments Found"
        description="Judgment can only be recorded after students are assigned to programmes."
        actionLabel="Go to Assignments"
        actionLink={`/dashboard/${slug}/pre-works/assignments`}
        icon={ClipboardList}
      />
    );
  }

  return (
    <div className="pt-4 sm:pt-6">
      <BasicMarksClient
        festival={festival as any}
        programmes={eventWorksProgrammes}
        categories={festival.categories}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Results
        </h1>
      </BasicMarksClient>
    </div>
  );
}
