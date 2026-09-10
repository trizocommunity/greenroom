import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { FestivalCountdown } from "@/components/festival/landing/FestivalCountdown";
import { CustomDomainProvider } from "@/components/providers/custom-domain-provider";
import { getFestivalDurationDays } from "@/config/pricing";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festivalMember as memberTable } from "@/core/database/schema";
import { MS } from "@/core/datetime/constants";
import {
  isCloudinaryUrl,
  resizeCloudinaryImage,
} from "@/core/integrations/cloudinary-transform";
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

  /* SEO/AEO: never serve the raw uploaded logo at a fixed pixel size.
     Every consumer below asks for an exact dimension, and the helper
     rewrites a Cloudinary URL to deliver that size (auto-format /
     auto-quality). For non-Cloudinary logos (or the SVG fallback) we
     pass through unchanged — the browser/PWA host will size them. */
  const rawLogo = branding?.logo ?? null;
  const resize = (size: number) =>
    rawLogo
      ? isCloudinaryUrl(rawLogo)
        ? resizeCloudinaryImage(rawLogo, { width: size, height: size })
        : rawLogo
      : fallbackIcon;

  const favicon32 = resize(32);
  const favicon180 = resize(180);
  const social512 = resize(512);

  const customDomain = hdrs.get("x-custom-domain");
  const canonicalUrl = customDomain
    ? `https://${customDomain}`
    : `https://greenroomfestivals.in/${festival.slug}`;

  const description = festival.tagline || festival.description || undefined;
  const keywords = [
    festival.name,
    "festival",
    festival.orgName,
    festival.orgLocation,
    "results",
    "schedule",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    title: {
      default: festival.name,
      template: `%s | ${festival.name}`,
    },
    description,
    keywords: keywords || undefined,
    authors: festival.orgName ? [{ name: festival.orgName }] : undefined,
    creator: festival.orgName || undefined,
    publisher: festival.orgName || undefined,
    applicationName: festival.name,
    category: "events",
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    manifest: `/api/v1/festivals/${festival.slug}/manifest`,
    alternates: {
      canonical: canonicalUrl,
    },
    icons: {
      icon: [
        { url: favicon32, sizes: "32x32", type: "image/png" },
        { url: social512, sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: favicon180, sizes: "180x180", type: "image/png" }],
      shortcut: favicon32,
    },
    openGraph: {
      type: "website",
      title: festival.name,
      description,
      siteName: festival.name,
      url: canonicalUrl,
      locale: "en_IN",
      images: rawLogo
        ? [
            {
              url: social512,
              width: 512,
              height: 512,
              alt: `${festival.name} logo`,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: festival.name,
      description,
      images: rawLogo ? [social512] : [],
    },
  };
}

export default async function FestivalLayout({
  children,
  params,
  searchParams,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug: festivalSlug } = await params;
  // `?remote=1` is the launch-control mirror URL the stage device opens
  // after a successful launch. It renders the public site without the
  // navigation chrome (navbar, footer, banner countdown) so the guest's
  // screen reads as a passive monitor of the live reveal — not an
  // interactive surface that could be navigated away.
  // `searchParams` is `undefined` when the request has no query string,
  // so default to an empty record before reading keys.
  const sp = (await searchParams) ?? {};
  const remote = sp.remote === "1";
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
  // site is offline, anonymous visitors get the countdown page (so the
  // branded URL stays useful before launch); owners/admins still see the
  // full chrome via the dashboard preview iframe.
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

  const showOfflineToAnonymous =
    !expired &&
    !festival.publicSiteEnabled &&
    !isOwner &&
    !isSuperAdmin &&
    !adminMember;

  if (showOfflineToAnonymous) {
    const branding = getBrandingFromJson(festival.branding);
    const startDate = festival.createdAt;
    const endDate =
      festival.expiresAt ||
      new Date(
        new Date(festival.createdAt).getTime() +
          getFestivalDurationDays() * MS.day,
      ).toISOString();

    return (
      <CustomDomainProvider customDomain={customDomain}>
        <FestivalCountdown
          festivalName={festival.name}
          tagline={festival.tagline}
          description={festival.description}
          startDate={startDate}
          endDate={endDate}
          location={festival.orgLocation || ""}
          logo={branding?.logo ?? null}
          branding={festival.branding}
        />
      </CustomDomainProvider>
    );
  }

  const branding = getBrandingFromJson(festival.branding);

  // The accent also travels as an `accentColor` prop down to every leaf,
  // which is fine for a solid fill and useless for `color-mix()` from a
  // Tailwind class. Setting it once as a custom property lets any descendant
  // reach it in an arbitrary value, a keyframe or a pseudo-element with no
  // prop threading. Same fallback as `generateMetadata` above.
  const accentColor = branding?.colors?.primary || "#d72626";

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

  // Resized 512px logo for social cards + JSON-LD. AEO engines (Perplexity,
  // Bing Copilot, Google SGE) prefer entity-grade images; we never point
  // them at the raw upload.
  const socialImage = festivalData.logo
    ? isCloudinaryUrl(festivalData.logo)
      ? resizeCloudinaryImage(festivalData.logo, { width: 512, height: 512 })
      : festivalData.logo
    : "https://greenroomfestivals.in/icons/apple-touch-icon.png";

  const canonicalUrl = customDomain
    ? `https://${customDomain}`
    : `https://greenroomfestivals.in/${festival.slug}`;

  // Graph of entities, not a single blob — AEO engines reason over edges
  // (Organization → Event → Place) better than over a flat Event document.
  const jsonLdGraph: Array<Record<string, unknown>> = [];

  jsonLdGraph.push({
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
      availability: "https://schema.org/InStock",
      url: canonicalUrl,
    },
    image: [socialImage],
    url: canonicalUrl,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
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
          url: festivalData.orgWebsite || canonicalUrl,
        }
      : {
          "@type": "Organization",
          name: festivalData.name,
          url: canonicalUrl,
        },
  });

  if (festivalData.orgName) {
    jsonLdGraph.push({
      "@type": "Organization",
      name: festivalData.orgName,
      url: festivalData.orgWebsite || canonicalUrl,
      description: festivalData.orgDescription || undefined,
      address: festivalData.orgLocation || undefined,
      foundingDate:
        festivalData.establishedYear != null
          ? `${festivalData.establishedYear}-01-01`
          : undefined,
      logo: socialImage,
    });
  }

  jsonLdGraph.push({
    "@type": "WebSite",
    name: festivalData.name,
    url: canonicalUrl,
    inLanguage: "en-IN",
    publisher: festivalData.orgName
      ? { "@type": "Organization", name: festivalData.orgName }
      : undefined,
  });

  jsonLdGraph.push({
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: canonicalUrl,
      },
    ],
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": jsonLdGraph,
  };

  return (
    <CustomDomainProvider customDomain={customDomain}>
      <FestivalProvider festival={festivalData as any}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div
          className={
            remote
              ? "min-h-screen flex flex-col bg-background"
              : "min-h-screen flex flex-col"
          }
          style={{ "--fest": accentColor } as React.CSSProperties}
        >
          {remote ? (
            // Remote mode: the page content fills the viewport with no
            // navbar/footer/banner chrome. Stage controller's own pill
            // overlays on top of this iframe via absolute positioning.
            <main className="flex-1">{children}</main>
          ) : (
            <>
              <FestivalNavbar festival={festivalData as any} />
              <main className="flex-1 pt-16">{children}</main>
              <FestivalFooter festival={festivalData as any} />
            </>
          )}
        </div>
      </FestivalProvider>
    </CustomDomainProvider>
  );
}
