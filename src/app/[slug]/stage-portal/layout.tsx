import type { Metadata, Viewport } from "next";

import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getBrandingFromJson } from "@/features/festivals/types/festival.types";
import { isCloudinaryUrl, resizeCloudinaryImage } from "@/core/integrations/cloudinary-transform";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  
  const branding = festival ? getBrandingFromJson(festival.branding) : null;
  const fallbackColor = branding?.colors?.primary || "#d72626";
  const initials = ((festival?.name || "GR").substring(0, 2)).toUpperCase();
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${fallbackColor}"/><text x="50" y="54" font-family="sans-serif" font-weight="bold" font-size="45" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  const fallbackIcon = `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString("base64")}`;

  const rawLogo = branding?.logo ?? null;
  const resize = (size: number) =>
    rawLogo
      ? isCloudinaryUrl(rawLogo)
        ? resizeCloudinaryImage(rawLogo, { width: size, height: size })
        : rawLogo
      : fallbackIcon;

  const favicon32 = resize(32);
  const favicon180 = resize(180);

  return {
    title: "Stage Judge Portal",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Stage Portal",
    },
    icons: {
      icon: [{ url: favicon32, sizes: "32x32", type: "image/png" }],
      apple: [{ url: favicon180, sizes: "180x180", type: "image/png" }],
      shortcut: favicon32,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#d72626",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function StagePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-y-auto overflow-x-hidden bg-background">
      {children}
    </div>
  );
}
