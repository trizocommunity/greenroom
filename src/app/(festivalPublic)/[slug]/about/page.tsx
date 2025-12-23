import { Building2, Calendar, Globe, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicFestivalData } from "@/server/loader/festivalPublic";

export default async function AboutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string }>;
}) {
  const { slug } = await params;
  const { edition: editionParam } = await searchParams;

  const data = await getPublicFestivalData(slug, editionParam);

  if (!data) {
    notFound();
  }

  const { festival, edition } = data;

  // Use edition description if available, else festival description
  const description = edition?.description || festival.description || "";

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

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Festival About */}
        <section>
          <h1
            className="text-3xl font-bold mb-6"
            style={{ color: accentColor }}
          >
            About{" "}
            {edition
              ? edition.name || `${edition.number}th Edition`
              : festival.name}
          </h1>
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg leading-relaxed text-muted-foreground">
                {description || "No description available."}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Organization Info */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Building2 className="h-6 w-6" style={{ color: accentColor }} />
            Organization Details
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>{orgName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orgDescription && (
                <p className="text-muted-foreground">{orgDescription}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {orgLocation && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{orgLocation}</span>
                  </div>
                )}
                {establishedYear && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Established {establishedYear}</span>
                  </div>
                )}
                {orgWebsite && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={orgWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      style={{ color: accentColor }}
                    >
                      {orgWebsite}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
