import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsExploreClient } from "@/components/dashboard/event-works/ResultsExploreClient";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/common/EmptyState";
import { ListChecks } from "lucide-react";

export const metadata: Metadata = {
  title: "Results",
  description: "Explore results of all programmes",
};

export default async function ResultsPage({
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
        orderBy: { name: "asc" },
      },
    },
  });

  if (!festival) {
    return notFound();
  }

  const hasProgrammes = festival.programmes.length > 0;
  if (!hasProgrammes) {
    return (
      <EmptyState
        title="No Programmes"
        description="Add programmes and assign students to see results here."
        actionLabel="Go to Programmes"
        actionLink={`/dashboard/${slug}/pre-works/programmes`}
        icon={ListChecks}
      />
    );
  }

  return (
    <ResultsExploreClient
      festival={{
        id: festival.id,
        name: festival.name,
        slug: festival.slug,
      }}
      programmes={festival.programmes}
      categories={festival.categories}
    />
  );
}
