import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { db } from "@/core/database/client";
import { festival } from "@/core/database/schema";
import { eq, and } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hdrs = await headers();
  const customDomain = hdrs.get("x-custom-domain");

  if (customDomain) {
    const baseUrl = `https://${customDomain}`;
    return [
      {
        url: `${baseUrl}/`,
        lastModified: new Date().toISOString(),
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: `${baseUrl}/schedule`,
        lastModified: new Date().toISOString(),
        changeFrequency: "daily",
        priority: 0.8,
      },
      {
        url: `${baseUrl}/results`,
        lastModified: new Date().toISOString(),
        changeFrequency: "daily",
        priority: 0.8,
      },
    ];
  }

  const baseUrl = "https://greenroomfestivals.in";

  const staticRoutes = [
    "",
    "/features",
    "/pricing",
    "/about",
    "/services",
    "/contact",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Fetch all active public festivals
  const activeFestivals = await db.query.festival.findMany({
    where: eq(festival.publicSiteEnabled, true),
    columns: { slug: true, updatedAt: true },
  });

  const festivalRoutes = activeFestivals.map((fest) => ({
    url: `${baseUrl}/${fest.slug}`,
    lastModified: fest.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  return [...staticRoutes, ...festivalRoutes];
}
