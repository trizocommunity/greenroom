import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FestivalCountdown } from "@/components/festival/landing/FestivalCountdown";
import { CustomDomainProvider } from "@/components/providers/custom-domain-provider";
import { getPublicFestivalData } from "@/features/festivals/loaders/festival-public.loader";

export const dynamic = "force-dynamic";

/**
 * Offline countdown surface for a festival whose public site is unpublished.
 *
 * Lives under the public route group so the same URL works on a branded host
 * (`https://{slug}.{apex}/`) and on the app host (`/{slug}`). When the admin
 * publishes the festival this route 404s and the live page renders instead;
 * when the festival is past expiry, the existing ExpiredFestivalView takes
 * over on `/{slug}` page.
 */
export default async function FestivalOfflinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;
  const customDomain = (await headers()).get("x-custom-domain");

  const data = await getPublicFestivalData(festivalSlug);
  if (!data) notFound();

  const { festival, event } = data;

  // Live festival: hand back to the live surface (the layout at /[slug] page).
  if (festival.publicSiteEnabled) notFound();

  return (
    <CustomDomainProvider customDomain={customDomain}>
      <FestivalCountdown
        festivalName={festival.name}
        tagline={festival.tagline}
        description={festival.description}
        startDate={event?.startDate ?? null}
        endDate={event?.endDate ?? null}
        location={event?.location ?? festival.orgLocation ?? null}
        logo={
          festival.branding &&
          typeof festival.branding === "object" &&
          "logo" in festival.branding
            ? ((festival.branding as any).logo as string | null)
            : null
        }
        branding={festival.branding}
      />
    </CustomDomainProvider>
  );
}
