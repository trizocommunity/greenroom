import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const hdrs = await headers();
  const customDomain = hdrs.get("x-custom-domain");
  const sitemapUrl = customDomain
    ? `https://${customDomain}/sitemap.xml`
    : "https://greenroomfestivals.in/sitemap.xml";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/super-admin/", "/onboarding/", "/api/"],
    },
    sitemap: sitemapUrl,
  };
}
