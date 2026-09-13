import { notFound, redirect } from "next/navigation";
import type { Tier } from "@/core/types/app-enums";
import { getDownloadsAction } from "@/features/downloads/actions/downloads.actions";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { loadFeatureOverrides } from "@/features/plan-features/services/plan-features.service";
import { DownloadsClient } from "./DownloadsClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DownloadsPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "downloads", effectiveFeatures);
  if (!canManage) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=downloads`);
  }

  const rows = await getDownloadsAction(festival.id);

  return (
    <div className="pt-4 sm:pt-6">
      <DownloadsClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        initialDownloads={rows.map((r) => ({
          ...r,
          description: r.description ?? null,
          publishedAt: r.publishedAt ?? null,
        }))}
      />
    </div>
  );
}
