import { GroupsClient } from "@/components/festival/pre-works/groups/GroupsClient";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { notFound } from "next/navigation";

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">
            Manage groups (Schools, Colleges, etc.) and their Team Leaders.
          </p>
        </div>
      </div>
      <GroupsClient festivalId={festival.id} />
    </div>
  );
}
