import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsManagementClient } from "@/components/dashboard/results/ResultsManagementClient";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/common/EmptyState";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = {
  title: "Marks",
};

export default async function MarksPage({
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
        orderBy: { createdAt: "desc" },
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
        description="Marks can only be managed after students are assigned to programmes."
        actionLabel="Go to Assignments"
        actionLink={`/dashboard/${slug}/pre-works/assignments`}
        icon={ClipboardList}
      />
    );
  }

  return (
    <ResultsManagementClient
      festival={festival}
      programmes={festival.programmes}
      categories={festival.categories}
    />
  );
}

