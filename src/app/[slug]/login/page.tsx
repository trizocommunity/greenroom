import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ParticipantLoginClient } from "@/components/festival/public/ParticipantLoginClient";
import { isFestivalExpired } from "@/features/festivals/lib/festival-expiry";
import { findFestivalBySlugForPublic } from "@/features/festivals/repositories/festival.repository";

export default async function ParticipantLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hdrs = await headers();
  const institutionId = hdrs.get("x-institution-id");
  const festival = await findFestivalBySlugForPublic(slug, institutionId);
  if (!festival) notFound();

  if (isFestivalExpired(festival) || !festival.publicSiteEnabled) {
    notFound();
  }

  return (
    <AuthLayout
      title="Participant Login"
      description={`Sign in to ${festival.name}`}
      variant="centered"
      showLogo={false}
    >
      <ParticipantLoginClient festivalSlug={festival.slug} />
    </AuthLayout>
  );
}
