import { notFound, redirect } from "next/navigation";
import type { Tier } from "@/core/types/app-enums";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getNewsPostsAction } from "@/features/news/actions/news.actions";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { loadFeatureOverrides } from "@/features/plan-features/services/plan-features.service";
import { NewsClient } from "./NewsClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewsPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "news", effectiveFeatures);
  if (!canManage) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=news`);
  }

  const posts = await getNewsPostsAction(festival.id);
  const normalizedPosts = posts.map((post) => ({
    ...post,
    publishedAt: post.publishedAt ?? null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }));

  return (
    <div className="pt-4 sm:pt-6">
      <NewsClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        initialPosts={normalizedPosts}
      />
    </div>
  );
}
