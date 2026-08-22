import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { CustomDomainProvider } from "@/components/providers/custom-domain-provider";
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

  return {
    title: {
      default: festival.name,
      template: `%s | ${festival.name}`,
    },
    description: festival.tagline || festival.description || undefined,
    manifest: `/api/v1/festivals/${festival.slug}/manifest`,
    icons: {
      icon: logo,
      apple: logo,
    },
    openGraph: {
      title: festival.name,
      description: festival.tagline || festival.description || undefined,
      siteName: festival.name,
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

  // Expired festivals keep results/standings on the same public URL.
  // Offline (and not expired) → 404.
  if (!expired && !festival.publicSiteEnabled) {
    notFound();
  }

  const branding = getBrandingFromJson(festival.branding);

  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    description: festival.description || "",
    tagline: festival.tagline || "",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
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
