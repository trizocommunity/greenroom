import { Building2, Calendar, Globe, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findFestivalBySlug } from "@/server/models/festival.model";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);

  if (!festival) {
    notFound();
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Festival About */}
        <section>
          <h1
            className="text-3xl font-bold mb-6"
            style={{ color: festival.accentColor }}
          >
            About {festival.name}
          </h1>
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg leading-relaxed text-muted-foreground">
                {festival.description || "No description available."}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Organization Info */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Building2
              className="h-6 w-6"
              style={{ color: festival.accentColor }}
            />
            Organization Details
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>{festival.orgName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {festival.orgDescription && (
                <p className="text-muted-foreground">
                  {festival.orgDescription}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {festival.orgLocation && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{festival.orgLocation}</span>
                  </div>
                )}
                {festival.orgEstablishedYear && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Established {festival.orgEstablishedYear}</span>
                  </div>
                )}
                {festival.orgWebsite && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={festival.orgWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      style={{ color: festival.accentColor }}
                    >
                      {festival.orgWebsite}
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
