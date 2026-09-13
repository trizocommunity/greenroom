import { NextResponse } from "next/server";
import {
  isCloudinaryUrl,
  resizeCloudinaryImage,
} from "@/core/integrations/cloudinary-transform";
import { findFestivalBySlugForPublic } from "@/features/festivals/repositories/festival.repository";
import { getBrandingFromJson } from "@/features/festivals/types/festival.types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ festivalId: string }> },
) {
  const { festivalId: slug } = await params;

  // Extract custom domain or institution headers if available
  const institutionId = request.headers.get("x-institution-id");

  const festival = await findFestivalBySlugForPublic(slug, institutionId);

  if (!festival) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const branding = getBrandingFromJson(festival.branding);
  const themeColor = branding?.colors?.primary || "#d72626";

  // For the icon, if they don't have a logo, we generate one using ui-avatars.com
  // so it meets PWA icon requirements (needs to be PNG usually).
  const initials = (festival.name.substring(0, 2) || "GR").toUpperCase();
  const fallbackIconUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    initials,
  )}&background=${themeColor.replace("#", "")}&color=fff&size=512`;

  const rawLogo = branding?.logo ?? null;
  /* PWA manifest needs the logo at exact 192px and 512px square — never
     serve the raw upload at that size. Rewrite Cloudinary URLs; pass
     non-Cloudinary sources through (the browser will still render them
     but they may not satisfy install requirements). */
  const iconAt = (size: number) =>
    rawLogo
      ? isCloudinaryUrl(rawLogo)
        ? resizeCloudinaryImage(rawLogo, { width: size, height: size })
        : rawLogo
      : fallbackIconUrl;

  const customDomain = request.headers.get("x-custom-domain");
  const startUrl = customDomain ? "/" : `/${slug}`;

  const manifest = {
    name: festival.name,
    short_name: festival.name,
    description:
      festival.tagline ||
      festival.description ||
      `Official app for ${festival.name}`,
    start_url: startUrl,
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: themeColor,
    icons: [
      {
        src: iconAt(192),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconAt(512),
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
