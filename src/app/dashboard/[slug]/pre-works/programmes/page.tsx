import { notFound } from "next/navigation";
import { ProgrammesClient } from "@/components/festival/pre-works/programmes/ProgrammesClient";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/common/EmptyState";
import { Tags, Users } from "lucide-react";

export default async function ProgrammesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);

  if (!festival) {
    notFound();
  }

  // Check for categories
  const categoryCount = await prisma.category.count({
    where: { festivalId: festival.id },
  });

  if (categoryCount === 0) {
    return (
      <EmptyState
        title="No Categories Found"
        description="You need to create categories before you can create programmes."
        actionLabel="Create Categories"
        actionLink={`/dashboard/${festival.slug}/pre-works/categories`}
        icon={Tags}
      />
    );
  }

  // Check for students
  const studentCount = await prisma.student.count({
    where: { festivalId: festival.id },
  });

  if (studentCount === 0) {
    return (
      <EmptyState
        title="No Students Found"
        description="You need to create students before you can manage programmes."
        actionLabel="Create Students"
        actionLink={`/dashboard/${festival.slug}/pre-works/students`}
        icon={Users}
      />
    );
  }

  return (
    <div className="pt-4 sm:pt-6">
      <ProgrammesClient festivalId={festival.id} festivalTier={festival.tier}>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Programmes</h1>
      </ProgrammesClient>
    </div>
  );
}
