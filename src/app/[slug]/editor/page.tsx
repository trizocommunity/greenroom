import { notFound, redirect } from "next/navigation";
import { FestivalPosterEditor } from "@/components/festival/posters/FestivalPosterEditor";
import { getSession } from "@/core/auth/session";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { canManageTemplates } from "@/features/posters/auth/poster-access";

export default async function FestivalEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const ctx = await getFestivalContext({
    slugOrId: slug,
    userId: session.userId,
    globalRole: session.role,
  });
  if (!ctx) notFound();
  if (!canManageTemplates(ctx.role)) notFound();

  return (
    <FestivalPosterEditor
      festivalId={ctx.festival.id}
      festivalSlug={slug}
      festivalName={ctx.festival.name}
    />
  );
}
