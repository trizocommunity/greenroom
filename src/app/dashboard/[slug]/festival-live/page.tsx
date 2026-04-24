import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { 
  festivalGalleryImage as galleryImageTable, 
  festivalNews as newsTable,
  festivalMember as memberTable
} from "@/server/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { validatePublicSiteRequirements } from "@/lib/festival-public-validation";
import { isBasicTier } from "@/lib/tier";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { getBrandingFromJson } from "@/types/festival";
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
    db.query.festivalGalleryImage.findMany({
      where: eq(galleryImageTable.festivalId, festival.id),
      orderBy: [asc(galleryImageTable.order)],
      columns: { id: true, url: true, order: true },
    }),
    db.query.festivalNews.findMany({
      where: eq(newsTable.festivalId, festival.id),
      orderBy: [desc(newsTable.createdAt)],
      columns: { id: true, title: true, content: true, imageUrl: true },
    }),
  ]);
  const galleryCount = galleryImages.length;

  const isOwner = festival.ownerId === session.userId;
  const member = await db.query.festivalMember.findFirst({
    where: and(
      eq(memberTable.festivalId, festival.id),
      eq(memberTable.userId, session.userId)
    ),
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
    tier: festival.tier as any,
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
  const baseUrl = host
    ? `${protocol}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || "";

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
          institutionType: festival.institutionType as any,
          institutionName: festival.institutionName || "",
          location: festival.location || "",
          founderName: festival.founderName || "",
          founderMessage: festival.founderMessage || "",
          slug: festival.slug,
          createdAt: festival.createdAt,
          expiresAt: festival.expiresAt,
        }}
        branding={getBrandingFromJson(festival.branding)}
        publicSiteEnabled={festival.publicSiteEnabled ?? false}
        canEnable={validation.canEnable}
        validationErrors={validation.errors}
        publicUrl={baseUrl ? `${baseUrl}/${festival.slug}` : ""}
        isBasicTier={isBasicTier(festival.tier as any)}
      />
    </div>
  );
}
