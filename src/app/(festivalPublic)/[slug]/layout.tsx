import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { CustomDomainProvider } from "@/components/providers/custom-domain-provider";
import { getFestivalDurationDays } from "@/config/pricing";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festivalMember as memberTable } from "@/core/database/schema";
import { MS } from "@/core/datetime/constants";
import { isFestivalExpired } from "@/features/festivals/lib/festival-expiry";
import { findFestivalBySlugForPublic } from "@/features/festivals/repositories/festival.repository";
import { getBrandingFromJson } from "@/features/festivals/types/festival.types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: festivalSlug } = await params;
  const hdrs = await headers();
  const institutionId = hdrs.get("x-institution-id");

  const festival = await findFestivalBySlugForPublic(
    festivalSlug,
    institutionId,
  );

  if (!festival) return { title: "Festival Not Found" };

  const branding = getBrandingFromJson(festival.branding);

  const fallbackColor = branding?.colors?.primary || "#d72626";
  const initials = (festival.name.substring(0, 2) || "GR").toUpperCase();
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${fallbackColor}"/><text x="50" y="54" font-family="sans-serif" font-weight="bold" font-size="45" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  const fallbackIcon = `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString("base64")}`;

  const logo = branding?.logo || fallbackIcon;

  const customDomain = hdrs.get("x-custom-domain");
  const canonicalUrl = customDomain
    ? `https://${customDomain}`
    : `https://greenroomfestivals.in/${festival.slug}`;

  return {
    title: {
      default: festival.name,
      template: `%s | ${festival.name}`,
    },
    description: festival.tagline || festival.description || undefined,
    manifest: `/api/v1/festivals/${festival.slug}/manifest`,
    alternates: {
      canonical: canonicalUrl,
    },
    icons: {
      icon: logo,
      apple: logo,
    },
    openGraph: {
      title: festival.name,
      description: festival.tagline || festival.description || undefined,
      siteName: festival.name,
      url: canonicalUrl,
      images: branding?.logo ? [{ url: branding.logo }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: festival.name,
      description: festival.tagline || festival.description || undefined,
      images: branding?.logo ? [branding.logo] : [],
    },
  };
}

export default async function FestivalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;
  const hdrs = await headers();
  const institutionId = hdrs.get("x-institution-id");
  // Set by the proxy only on a branded host; links below drop the `/{slug}`
  // prefix when it is present.
  const customDomain = hdrs.get("x-custom-domain");

  const festival = await findFestivalBySlugForPublic(
    festivalSlug,
    institutionId,
  );

  if (!festival) {
    notFound();
  }

  const expired = isFestivalExpired(festival);

  // Expired festivals keep results/standings on the same public URL. While a
  // site is offline, owners and admins may still render this exact route in the
  // authenticated settings preview; everyone else continues to receive 404.
  if (!expired && !festival.publicSiteEnabled) {
    const session = await getSession();
    const isOwner = session?.userId === festival.ownerId;
    const isSuperAdmin = session?.role === "SUPER_ADMIN";
    const adminMember =
      session?.userId && !isOwner && !isSuperAdmin
        ? await db.query.festivalMember.findFirst({
            where: and(
              eq(memberTable.festivalId, festival.id),
              eq(memberTable.userId, session.userId),
              eq(memberTable.role, "ADMIN"),
              eq(memberTable.isActive, true),
            ),
            columns: { id: true },
          })
        : null;

    if (!isOwner && !isSuperAdmin && !adminMember) {
      notFound();
    }
  }

  const branding = getBrandingFromJson(festival.branding);

  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    description: festival.description || "",
    tagline: festival.tagline || "",
    startDate: festival.createdAt,
    endDate:
      festival.expiresAt ||
      new Date(
        new Date(festival.createdAt).getTime() +
          getFestivalDurationDays() * MS.day,
      ).toISOString(),
    location: festival.orgLocation || "",
    status: festival.status,
    logo: branding?.logo ?? null,
    orgName: festival.orgName || "",
    orgDescription: festival.orgDescription || "",
    orgWebsite: festival.orgWebsite || "",
    orgLocation: festival.orgLocation || "",
    establishedYear: festival.establishedYear || null,
    participantsCount:
      (festival as { participantsCount?: number }).participantsCount || 0,
    limits: null,
    participantCreationStartDate: festival.participantCreationStartDate,
    participantCreationDeadline: festival.participantCreationDeadline,
    programmeAssignmentStartDate: festival.programmeAssignmentStartDate,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline,
    tier: festival.tier as string,
    isExpired: expired,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: festivalData.name,
    description: festivalData.description || festivalData.tagline,
    startDate: festivalData.startDate,
    endDate: festivalData.endDate,
    eventStatus:
      festival.status === "EXPIRED"
        ? "https://schema.org/EventPostponed"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    location: festivalData.location
      ? {
          "@type": "Place",
          name: festivalData.location,
          address: festivalData.location,
        }
      : undefined,
    organizer: festivalData.orgName
      ? {
          "@type": "Organization",
          name: festivalData.orgName,
          url: festivalData.orgWebsite,
        }
      : undefined,
    image:
      festivalData.logo ||
      "https://greenroomfestivals.in/icons/apple-touch-icon.png",
  };

  return (
    <CustomDomainProvider customDomain={customDomain}>
      <FestivalProvider festival={festivalData as any}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="min-h-screen flex flex-col">
          <FestivalNavbar festival={festivalData as any} />
          <main className="flex-1 pt-16">{children}</main>
          <FestivalFooter festival={festivalData as any} />
        </div>
      </FestivalProvider>
    </CustomDomainProvider>
  );
}
