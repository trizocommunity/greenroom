import { notFound, redirect } from "next/navigation";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";

export default async function FestivalDashboardRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlugOrId(slug);

  if (!festival) {
    notFound();
  }

  // Find active edition or first edition to redirect to
  const activeEdition =
    festival.editions.find((e) => e.status === "ACTIVE") ||
    festival.editions[0];

  if (activeEdition) {
    redirect(`/festival/${festival.slug}/${activeEdition.slug}`);
  }

  // If no editions, maybe redirect to settings or show empty state?
  // For now, redirect to settings if user has access, or just show a message.
  // Assuming access control is handled by layout/middleware, so simple message is safe.
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <h1 className="text-2xl font-bold">No Active Edition</h1>
      <p className="text-muted-foreground">
        This festival has no editions yet.
      </p>
      {/* Could add a button to create edition if we can determine role here */}
    </div>
  );
}
