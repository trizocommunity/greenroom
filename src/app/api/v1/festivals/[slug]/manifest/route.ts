import { NextResponse } from "next/server";
import { findFestivalBySlugForPublic } from "@/features/festivals/repositories/festival.repository";
import { getBrandingFromJson } from "@/features/festivals/types/festival.types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

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

  const iconUrl = branding?.logo || fallbackIconUrl;

  const manifest = {
    name: festival.name,
    short_name: festival.name,
    description:
      festival.tagline ||
      festival.description ||
      `Official app for ${festival.name}`,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: themeColor,
    icons: [
      {
        src: iconUrl,
        sizes: "192x192 512x512",
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
