import { notFound, redirect } from "next/navigation";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { getGalleryImagesAction } from "@/server/actions/gallery.actions";
import { GalleryClient } from "./GalleryClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function GalleryPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "gallery");
  if (!canManage) {
    redirect(
      `/dashboard/${slug}?error=upgrade_required&feature=gallery`,
    );
  }

  const images = await getGalleryImagesAction(festival.id);

  return (
    <div className="pt-4 sm:pt-6">
      <GalleryClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        initialImages={images}
      />
    </div>
  );
}
