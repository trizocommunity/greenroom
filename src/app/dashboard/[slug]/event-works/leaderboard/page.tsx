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

  // Fetch festival with results (for team standings + top students), categories, and groups
  const festival = await prisma.festival.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { name: "asc" } },
      groups: { orderBy: { name: "asc" } },
      results: {
        include: {
          assignment: {
            include: {
              student: true,
              group: true,
            },
          },
          programme: {
            include: { category: true },
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
    <div className="pt-4 sm:pt-6">
      <LeaderboardClient
        festival={festival}
        results={festival.results}
        publishedStandings={festival.teamStandings as any[]}
        categories={festival.categories}
        groups={festival.groups}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Leaderboard</h1>
      </LeaderboardClient>
    </div>
  );
}
