import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsManagementClient } from "@/components/dashboard/results/ResultsManagementClient";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/common/EmptyState";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = {
  title: "Results Management",
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch festival with programmes, assignments, and categories
  const festival = await prisma.festival.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { name: "asc" },
      },
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
        title="No Assignments Found"
        description="Results can only be managed after students are assigned to programmes."
        actionLabel="Go to Assignments"
        actionLink={`/dashboard/${slug}/pre-works/assignments`}
        icon={ClipboardList}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Results Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Enter scores and auto-calculate grades, positions & points
          </p>
        </div>
      </div>

      <ResultsManagementClient
        festival={festival}
        programmes={festival.programmes}
        categories={festival.categories}
        existingResults={festival.results}
      />
    </div>
  );
}
