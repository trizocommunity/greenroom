import type { ProgrammeStatus, Tier } from "@prisma/client";
import { Calendar, ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { ResultsManagementClient } from "@/components/dashboard/results/ResultsManagementClient";
import { prisma } from "@/lib/db";
import { filterProgrammesForEventWorks } from "@/server/services/programme-status.service";

export const metadata: Metadata = {
  title: "Judgment",
};

export default async function MarksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const festival = await prisma.festival.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { name: "asc" } },
      programmes: {
        include: {
          category: true,
          assignments: {
            include: {
              student: true,
              group: true,
              result: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!festival) {
    return notFound();
  }

  const tier = (festival.tier ?? "STANDARD") as Tier;

  // Judgment should show only programmes that have finished reporting
  // (or are in the end-of-reporting judging window), not scheduled/reporting ones.
  // We still allow JUDGED/PUBLISHED so editing/unpublishing can work.
  const judgmentAllowedStatuses: ProgrammeStatus[] =
    tier === "BASIC"
      ? // BASIC has no programme reporting; keep old gating behavior.
        []
      : ["STARTED", "ENDED", "JUDGED", "PUBLISHED"];

  const eventWorksProgrammes =
    tier === "BASIC"
      ? filterProgrammesForEventWorks(festival.programmes, tier)
      : festival.programmes.filter((p) =>
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

  const assignmentCount = await prisma.programmeAssignment.count({
    where: {
      programmeId: { in: eventWorksProgrammes.map((p) => p.id) },
    },
  });

  if (assignmentCount === 0) {
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
      <ResultsManagementClient
        festival={festival}
        programmes={eventWorksProgrammes}
        categories={festival.categories}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Judgment
        </h1>
      </ResultsManagementClient>
    </div>
  );
}
