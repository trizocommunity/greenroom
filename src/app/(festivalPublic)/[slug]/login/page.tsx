import { notFound } from "next/navigation";
import { ParticipantLoginClient } from "@/components/festival/public/ParticipantLoginClient";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findGroupsByFestival } from "@/features/groups/repositories/group.repository";

export default async function ParticipantLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const groups = await findGroupsByFestival(festival.id);

  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-8">
      <ParticipantLoginClient
        festivalSlug={festival.slug}
        festivalName={festival.name}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      />
    </div>
  );
}
