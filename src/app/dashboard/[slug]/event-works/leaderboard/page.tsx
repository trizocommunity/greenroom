import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LeaderboardClient } from "@/components/dashboard/leaderboard/LeaderboardClient";
import { EmptyState } from "@/components/common/EmptyState";
import { Trophy } from "lucide-react";

export default async function TeamStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch festival and related data
  const festival = await prisma.festival.findUnique({
    where: { slug },
    include: {
      programmes: {
        include: {
          category: true,
          assignments: {
            include: {
              result: true,
              group: true,
              student: true,
            },
          },
        },
        orderBy: { name: "asc" },
      },
      results: {
        include: {
          assignment: {
            include: {
              student: true,
              group: true,
            },
          },
        },
      },
    },
  });

  if (!festival) {
    return notFound();
  }

  // Check for assignments
  const assignmentCount = await prisma.programmeAssignment.count({
    where: {
      programme: {
        festivalId: festival.id,
      },
    },
  });

  if (assignmentCount === 0) {
    return (
      <EmptyState
        title="No Data Available"
        description="Leaderboard will be populated once assignments and results are available."
        actionLabel="Go to Assignments"
        actionLink={`/dashboard/${slug}/pre-works/assignments`}
        icon={Trophy}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <LeaderboardClient
        festival={festival}
        programmes={festival.programmes}
        results={festival.results}
        publishedStandings={festival.teamStandings as any[]}
      />
    </div>
  );
}
