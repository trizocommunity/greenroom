import { count, eq } from "drizzle-orm";
import { Tags } from "lucide-react";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { StudentsClient } from "@/components/festival/pre-works/students/StudentsClient";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { category as categoryTable } from "@/core/database/schema";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { findMemberByFestivalAndUser } from "@/features/members/repositories/member.repository";
import { getChestNumberSettings } from "@/features/students/actions/chest-number.actions";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;
  const festival = await findFestivalBySlugOrId(festivalSlug);

  if (!festival) {
    notFound();
  }

  const slug = festival.slug;

  // Check for categories
  const [categoryCountResult] = await db
    .select({ c: count() })
    .from(categoryTable)
    .where(eq(categoryTable.festivalId, festival.id));

  if (categoryCountResult.c === 0) {
    return (
      <EmptyState
        title="No Categories Found"
        description="You need to create categories before you can add students."
        actionLabel="Create Categories"
        actionLink={`/dashboard/${festival.slug}/pre-works/categories`}
        icon={Tags}
      />
    );
  }

  const session = await getSession();
  const member = session?.userId
    ? await findMemberByFestivalAndUser(festival.id, session.userId)
    : null;

  const initialChestSettings = await getChestNumberSettings(festival.id);

  const studentsPath = `/dashboard/${slug}/pre-works/students` as const;
  async function handleChestRevalidate() {
    "use server";
    revalidatePath(studentsPath);
  }

  return (
    <div className="pt-4 sm:pt-6">
      <StudentsClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        teamLeaderLimit={(festival as any).teamLeaderLimit ?? 2}
        initialChestSettings={initialChestSettings}
        onChestRevalidate={handleChestRevalidate}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Students
        </h1>
      </StudentsClient>
    </div>
  );
}
