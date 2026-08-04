import { notFound, redirect } from "next/navigation";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import {
  getMediaImagesAction,
  getMediaVideosAction,
} from "@/features/media/actions/media.actions";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import { MediaClient } from "./MediaClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MediaPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "media");
  if (!canManage) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=media`);
  }

  const [images, videos] = await Promise.all([
    getMediaImagesAction(festival.id),
    getMediaVideosAction(festival.id),
  ]);

  return (
    <div className="pt-4 sm:pt-6">
      <MediaClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        initialImages={images}
        initialVideos={videos}
      />
    </div>
  );
}
