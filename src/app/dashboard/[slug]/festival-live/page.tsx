import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isBasicTier } from "@/lib/tier";
import { getBrandingFromJson } from "@/types/festival";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { validatePublicSiteRequirements } from "@/lib/festival-public-validation";
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

  const [galleryImages, newsPosts] = await Promise.all([
    prisma.festivalGalleryImage.findMany({
      where: { festivalId: festival.id },
      orderBy: { order: "asc" },
      select: { id: true, url: true, order: true },
    }),
    prisma.festivalNews.findMany({
      where: { festivalId: festival.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, imageUrl: true },
    }),
  ]);
  const galleryCount = galleryImages.length;

  const isOwner = festival.ownerId === session.userId;
  const member = await prisma.festivalMember.findUnique({
    where: {
      festivalId_userId: { festivalId: festival.id, userId: session.userId },
    },
  });
  const isAdmin = member?.isActive && member.role === "ADMIN";
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  if (!isOwner && !isAdmin && !isSuperAdmin) notFound();

  const validation = validatePublicSiteRequirements({
      name: festival.name,
      description: festival.description,
    orgName: festival.orgName,
    orgDescription: festival.orgDescription,
    orgWebsite: festival.orgWebsite,
    orgLocation: festival.orgLocation,
    tier: festival.tier,
    galleryImageCount: galleryCount,
    newsPosts: newsPosts.map((p) => ({
      title: p.title,
      content: p.content,
      imageUrl: p.imageUrl,
    })),
  });

  const headersList = await headers();
  const host = headersList.get("host") || "";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-8 pt-5">
      <FestivalLiveClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        festivalDetails={{
          name: festival.name || "",
          description: festival.description || "",
          startDate: festival.startDate,
          endDate: festival.endDate,
          orgName: festival.orgName || "",
          orgDescription: festival.orgDescription || "",
          orgWebsite: festival.orgWebsite || "",
          orgLocation: festival.orgLocation || "",
          establishedYear: festival.establishedYear,
          institutionType: festival.institutionType,
          institutionName: festival.institutionName || "",
          location: festival.location || "",
          founderName: festival.founderName || "",
          founderMessage: festival.founderMessage || "",
          slug: festival.slug,
        }}
        branding={getBrandingFromJson(festival.branding)}
        publicSiteEnabled={festival.publicSiteEnabled ?? false}
        canEnable={validation.canEnable}
        validationErrors={validation.errors}
        publicUrl={baseUrl ? `${baseUrl}/${festival.slug}` : ""}
        isBasicTier={isBasicTier(festival.tier)}
      />
    </div>
  );
}
