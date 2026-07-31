import { notFound, redirect } from "next/navigation";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import { ExportsClient } from "./ExportsClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ExportsPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canExport = await getEffectiveFeatureEnabled(festival.tier, "exports");
  if (!canExport) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=exports`);
  }

  return (
    <div className="pt-4 sm:pt-6">
      <ExportsClient festivalId={festival.id} festivalSlug={festival.slug} />
    </div>
  );
}
