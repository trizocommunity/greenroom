import { MembersClient } from "./_components/MembersClient";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { notFound } from "next/navigation";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground">
          View all Admins and Team Leaders associated with this festival.
        </p>
      </div>
      <MembersClient festivalId={festival.id} />
    </div>
  );
}
