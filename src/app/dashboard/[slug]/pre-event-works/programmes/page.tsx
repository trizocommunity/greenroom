import { eq, sql } from "drizzle-orm";
import { Tags } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { ProgrammesClient } from "@/components/festival/pre-event-works/programmes/ProgrammesClient";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  group as groupTable,
} from "@/core/database/schema";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";

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
  const [categoryCountResult] = await db
    .select({ count: sql`count(*)` })
    .from(categoryTable)
    .where(eq(categoryTable.festivalId, festival.id));
  const categoryCount = Number(categoryCountResult.count);

  if (categoryCount === 0) {
    return (
      <EmptyState
        title="No Categories Found"
        description="You need to create categories before you can create programmes."
        actionLabel="Create Categories"
        actionLink={`/dashboard/${festival.slug}/pre-event-works/categories`}
        icon={Tags}
      />
    );
  }

  // Check for participants
  const [groupCountResult] = await db
    .select({ count: sql`count(*)` })
    .from(groupTable)
    .where(eq(groupTable.festivalId, festival.id));
  const groupCount = Number(groupCountResult.count);

  return (
    <div className="pt-4 sm:pt-6">
      <ProgrammesClient
        festivalId={festival.id}
        festivalTier={festival.tier as any}
        groupCount={groupCount}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Programmes
        </h1>
      </ProgrammesClient>
    </div>
  );
}
