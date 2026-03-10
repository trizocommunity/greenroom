import { notFound } from "next/navigation";
import { GroupsClient } from "@/components/festival/pre-works/groups/GroupsClient";
import { findFestivalBySlug } from "@/server/models/festival.model";

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  return (
    <div className="pt-4 sm:pt-6">
      <GroupsClient festivalId={festival.id}>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Groups</h1>        
      </GroupsClient>
    </div>
  );
}
