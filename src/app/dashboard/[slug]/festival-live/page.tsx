import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { festivalMember as memberTable } from "@/core/database/schema";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { isBasicTier } from "@/features/plan-features/services/tier";
import { FestivalLiveClient } from "./FestivalLiveClient";

export default async function FestivalLivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session?.userId) notFound();

  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  if (isBasicTier(festival.tier as any)) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=festivalLive`);
  }

  const isOwner = festival.ownerId === session.userId;
  const member = await db.query.festivalMember.findFirst({
    where: and(
      eq(memberTable.festivalId, festival.id),
      eq(memberTable.userId, session.userId),
    ),
  });
  const isAdmin = member?.isActive && member.role === "ADMIN";
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  if (!isOwner && !isAdmin && !isSuperAdmin) notFound();

  const headersList = await headers();
  const host = headersList.get("host") || "";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = host
    ? `${protocol}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-8 pt-5">
      <FestivalLiveClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        publicSiteEnabled={festival.publicSiteEnabled ?? false}
        publicUrl={baseUrl ? `${baseUrl}/${festival.slug}` : ""}
      />
    </div>
  );
}
