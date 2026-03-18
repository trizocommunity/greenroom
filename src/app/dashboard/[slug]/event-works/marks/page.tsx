import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsManagementClient } from "@/components/dashboard/results/ResultsManagementClient";
import { EmptyState } from "@/components/common/EmptyState";
import { prisma } from "@/lib/db";
import { filterProgrammesForEventWorks } from "@/server/services/programme-status.service";
import type { Tier } from "@prisma/client";
import { Calendar, ClipboardList } from "lucide-react";

export const metadata: Metadata = {
  title: "Marks",
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
  const eventWorksProgrammes = filterProgrammesForEventWorks(
    festival.programmes,
    tier,
  );

  if (eventWorksProgrammes.length === 0) {
    if (tier === "BASIC") {
      return (
        <EmptyState
          title="No Assignments Found"
          description="Marks can only be managed after students are assigned to programmes."
          actionLabel="Go to Assignments"
          actionLink={`/dashboard/${slug}/pre-works/assignments`}
          icon={ClipboardList}
        />
      );
    }
    return (
      <EmptyState
        title="No programmes in Event Works yet"
        description="On Standard and Pro plans, programmes appear here only after they are added to the schedule. Add your programmes to the schedule in Pre-Works to see them in Marks, Results, and Leaderboard."
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
        description="Marks can only be managed after students are assigned to programmes."
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
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Marks</h1>
      </ResultsManagementClient>
    </div>
  );
}

