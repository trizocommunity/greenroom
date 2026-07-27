import { Building2, Calendar, Globe, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicFestivalData } from "@/features/festivals/loaders/festival-public.loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicFestivalData(slug);

  if (!data) return { title: "About Not Found" };

  const { festival } = data;
  const title = `About - ${festival.name}`;

  return {
    title: title,
    description: `About ${festival.name} and organization details.`,
    openGraph: {
      title: title,
      description: `About ${festival.name} and organization details.`,
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getPublicFestivalData(slug);

  if (!data) {
    notFound();
  }

  const { festival } = data;

  const description = festival.description || "";

  const accentColor =
    festival.branding &&
    typeof festival.branding === "object" &&
    "colors" in festival.branding
      ? (festival.branding as any).colors?.primary || "#000000"
      : "#000000";
  const orgName = festival.orgName || "Organization Name";
  const orgDescription = festival.orgDescription || "";
  const orgLocation = festival.orgLocation || "";
  const establishedYear = festival.establishedYear || null;
  const orgWebsite = festival.orgWebsite || "";
  const isNonBasic = festival.tier && festival.tier !== "BASIC";

  return (
    <div className="py-16 md:py-20 px-4">
      <div className="max-w-4xl mx-auto space-y-14">
        {/* Festival About */}
        <section className="space-y-5">
          <p className="text-eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            About
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-heading">
            About {festival.name}
          </h1>
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-premium">
            <p className="text-base leading-relaxed text-muted-foreground">
              {description || "No description available."}
            </p>
          </div>
        </section>

        {/* Organization Info: full block for STANDARD/PRO, minimal for BASIC */}
        <section className="space-y-5">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8"
              style={{ color: accentColor }}
            >
              <Building2 size={18} strokeWidth={1.75} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-heading">
              Organization details
            </h2>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-premium space-y-5">
            <h3 className="text-lg font-semibold tracking-tight text-heading">
              {orgName}
            </h3>

            {isNonBasic && orgDescription ? (
              <p className="text-muted-foreground leading-relaxed">
                {orgDescription}
              </p>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-border">
              {orgLocation && (
                <div className="flex items-center gap-2.5 text-sm text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{orgLocation}</span>
                </div>
              )}
              {establishedYear && (
                <div className="flex items-center gap-2.5 text-sm text-foreground">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Established {establishedYear}</span>
                </div>
              )}
              {orgWebsite && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={orgWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                    style={{ color: accentColor }}
                  >
                    {orgWebsite}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
