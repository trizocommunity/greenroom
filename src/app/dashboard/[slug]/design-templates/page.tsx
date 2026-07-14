import { notFound, redirect } from "next/navigation";
import { DesignTemplatesClient } from "@/components/festival/posters/DesignTemplatesClient";
import { getSession } from "@/core/auth/session";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { listPosterTemplatesAction } from "@/features/posters/actions/poster-template.actions";
import { canManageDesignTemplates } from "@/features/posters/auth/poster-access";

export default async function DesignTemplatesPage({
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
  if (!canManageDesignTemplates(ctx.role)) notFound();

  const listRes = await listPosterTemplatesAction(ctx.festival.id);
  const templates = listRes.success ? listRes.data : [];

  return (
    <div className="p-6">
      <DesignTemplatesClient
        festivalId={ctx.festival.id}
        festivalSlug={slug}
        initialTemplates={templates}
        readOnly={false}
      />
    </div>
  );
}
