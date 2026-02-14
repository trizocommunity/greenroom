import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TeamStatusClient } from "@/components/dashboard/team-status/TeamStatusClient";

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
          programme: true,
        },
      },
    },
  });

  if (!festival) {
    return notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <TeamStatusClient
        festival={festival}
        programmes={festival.programmes}
        results={festival.results}
        publishedStandings={festival.teamStandings as any[]}
      />
    </div>
  );
}
