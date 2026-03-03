import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { StudentsClient } from "@/components/festival/pre-works/students/StudentsClient";
import { getSession } from "@/lib/auth/session";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { findMemberByFestivalAndUser } from "@/server/models/member.model";
import { prisma } from "@/lib/db";
import { getChestNumberSettings } from "@/server/actions/chest-number.actions";
import { EmptyState } from "@/components/common/EmptyState";
import { Tags } from "lucide-react";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;
  const festival = await findFestivalBySlugOrId(festivalSlug); // This uses findFestivalBySlugOrId which might not be prisma directly but returns limited fields?
  // Actually findFestivalBySlugOrId calls prisma.festival.findFirst.
  // It returns a Festival object.

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

  async function handleChestRevalidate() {
    "use server";
    revalidatePath(`/dashboard/${festival.slug}/pre-works/students`);
  }

  return (
    <StudentsClient
      festivalId={festival.id}
      festivalSlug={festival.slug}
      initialChestSettings={initialChestSettings}
      onChestRevalidate={handleChestRevalidate}
    />
  );
}
