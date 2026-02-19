import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LeaderboardClient } from "@/components/dashboard/leaderboard/LeaderboardClient";

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
