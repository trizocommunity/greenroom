import { notFound, redirect } from "next/navigation";
import { getNewsPostsAction } from "@/server/actions/news.actions";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { NewsClient } from "./NewsClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewsPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "news");
  if (!canManage) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=news`);
  }

  const posts = await getNewsPostsAction(festival.id);

  return (
    <div className="pt-4 sm:pt-6">
      <NewsClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        initialPosts={posts}
      />
    </div>
  );
}
