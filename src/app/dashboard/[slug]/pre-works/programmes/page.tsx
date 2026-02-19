import { notFound } from "next/navigation";
import { ProgrammesClient } from "@/components/festival/pre-works/programmes/ProgrammesClient";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/common/EmptyState";
import { Tags } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Programmes</h2>
        <p className="text-muted-foreground">
          Manage programmes for{" "}
          <span className="font-semibold text-foreground">{festival.name}</span>
        </p>
      </div>

      <ProgrammesClient festivalId={festival.id} />
    </div>
  );
}
