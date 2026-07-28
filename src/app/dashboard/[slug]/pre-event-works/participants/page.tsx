import { count, eq } from "drizzle-orm";
import { Tags } from "lucide-react";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { ParticipantsClient } from "@/components/festival/pre-event-works/participants/ParticipantsClient";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { category as categoryTable } from "@/core/database/schema";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { findMemberByFestivalAndUser } from "@/features/members/repositories/member.repository";
import { getChestNumberSettings } from "@/features/participants/actions/chest-number.actions";

export default async function ParticipantsPage({
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
        description="You need to create categories before you can add participants."
        actionLabel="Create Categories"
        actionLink={`/dashboard/${festival.slug}/pre-event-works/categories`}
        icon={Tags}
      />
    );
  }

  const session = await getSession();
  const member = session?.userId
    ? await findMemberByFestivalAndUser(festival.id, session.userId)
    : null;

  const initialChestSettings = await getChestNumberSettings(festival.id);

  const participantsPath =
    `/dashboard/${slug}/pre-event-works/participants` as const;
  async function handleChestRevalidate() {
    "use server";
    revalidatePath(participantsPath);
  }

  return (
    <div className="pt-4 sm:pt-6">
      <ParticipantsClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        teamLeaderLimit={(festival as any).teamLeaderLimit ?? 2}
        initialChestSettings={initialChestSettings}
        onChestRevalidate={handleChestRevalidate}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Participants
        </h1>
      </ParticipantsClient>
    </div>
  );
}
