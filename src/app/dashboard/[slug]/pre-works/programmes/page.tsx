import { Tags, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { ProgrammesClient } from "@/components/festival/pre-works/programmes/ProgrammesClient";
import { db } from "@/lib/db";
import { 
  category as categoryTable, 
  student as studentTable, 
  group as groupTable 
} from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { findFestivalBySlug } from "@/server/models/festival.model";

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
        actionLink={`/dashboard/${festival.slug}/pre-works/categories`}
        icon={Tags}
      />
    );
  }

  // Check for students
  const [studentCountResult] = await db
    .select({ count: sql`count(*)` })
    .from(studentTable)
    .where(eq(studentTable.festivalId, festival.id));
  const studentCount = Number(studentCountResult.count);

  const [groupCountResult] = await db
    .select({ count: sql`count(*)` })
    .from(groupTable)
    .where(eq(groupTable.festivalId, festival.id));
  const groupCount = Number(groupCountResult.count);

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
