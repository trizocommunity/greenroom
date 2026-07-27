import { notFound } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ParticipantLoginClient } from "@/components/festival/public/ParticipantLoginClient";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";

export default async function ParticipantLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

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
