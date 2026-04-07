/** Shape of Festival.branding JSON (navbar/landing colors, logo, hero) */
export interface FestivalBranding {
  colors?: { primary?: string };
  logo?: string | null;
  heroImage?: string | null;
}

export function getBrandingFromJson(
  branding: unknown,
): FestivalBranding | null {
  if (!branding || typeof branding !== "object") return null;
  const b = branding as Record<string, unknown>;
  return {
    colors:
      b.colors && typeof b.colors === "object" && b.colors !== null
        ? { primary: (b.colors as { primary?: string }).primary }
        : undefined,
    logo:
      typeof b.logo === "string" ? b.logo : b.logo === null ? null : undefined,
    heroImage:
      typeof b.heroImage === "string"
        ? b.heroImage
        : b.heroImage === null
          ? null
          : undefined,
  };
}

export interface JoinedFestival {
  id: string;
  name: string;
  role: "ADMIN" | "TEAM-LEADER" | "STAGE-MANAGER" | "ANNOUNCER" | "OWNER";
  startDate: Date;
  location: string;
}
