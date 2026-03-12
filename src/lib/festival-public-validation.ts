/**
 * Validation for enabling the public festival website (Festival Live).
 * Plan-based: BASIC requires basic details + home content; non-BASIC requires
 * additional org details, gallery (min 4 images), and news (min 3 posts with title, description, image).
 */

import type { Tier } from "@prisma/client";
import { getBrandingFromJson } from "@/types/festival";
import { getResolvedTier } from "@/lib/tier";

export interface ValidationInput {
  name: string | null;
  description: string | null;
  branding: unknown;
  orgName: string | null;
  orgDescription: string | null;
  orgWebsite: string | null;
  orgLocation: string | null;
  tier: Tier | string | null;
  /** For non-BASIC: number of gallery images (min 4 required). */
  galleryImageCount?: number;
  /** For non-BASIC: list of news posts; each must have title, content, image. Min 3 required. */
  newsPosts?: Array<{ title?: string | null; content?: string | null; imageUrl?: string | null }>;
}

export interface ValidationResult {
  canEnable: boolean;
  errors: string[];
}

function hasHomeContent(branding: unknown): boolean {
  const b = getBrandingFromJson(branding);
  if (!b) return false;
  const hasLogo = typeof b.logo === "string" && b.logo.trim().length > 0;
  const hasHero = typeof b.heroImage === "string" && b.heroImage.trim().length > 0;
  return hasLogo || hasHero;
}

function basicDetailsComplete(name: string | null, description: string | null): boolean {
  return typeof name === "string" && name.trim().length > 0 &&
    typeof description === "string" && description.trim().length > 0;
}

function orgDetailsComplete(input: ValidationInput): boolean {
  const hasOrgName = typeof input.orgName === "string" && input.orgName.trim().length > 0;
  const hasExtra = [
    input.orgDescription,
    input.orgWebsite,
    input.orgLocation,
  ].some((v) => typeof v === "string" && v.trim().length > 0);
  return hasOrgName && hasExtra;
}

function newsPostComplete(
  post: { title?: string | null; content?: string | null; imageUrl?: string | null },
): boolean {
  const hasTitle = typeof post.title === "string" && post.title.trim().length > 0;
  const hasContent = typeof post.content === "string" && post.content.trim().length > 0;
  const hasImage = typeof post.imageUrl === "string" && post.imageUrl.trim().length > 0;
  return hasTitle && hasContent && hasImage;
}

/**
 * Returns whether the festival can enable the public site and any error messages.
 */
export function validatePublicSiteRequirements(input: ValidationInput): ValidationResult {
  const errors: string[] = [];
  const tier = getResolvedTier(input.tier);
  const isBasic = tier === "BASIC";

  // All plans: festival basic details
  if (!basicDetailsComplete(input.name, input.description)) {
    errors.push("Festival name and description are required.");
  }

  // All plans: home page content (logo or hero image)
  if (!hasHomeContent(input.branding)) {
    errors.push("Add a logo or hero image in branding (Settings or festival details).");
  }

  if (isBasic) {
    return {
      canEnable: errors.length === 0,
      errors,
    };
  }

  // Non-BASIC: organization details
  if (!orgDetailsComplete(input)) {
    errors.push("Organization name and at least one of description, website, or location are required.");
  }

  // Non-BASIC: gallery (min 4 images)
  const galleryCount = input.galleryImageCount ?? 0;
  if (galleryCount < 4) {
    errors.push("Gallery must have at least 4 images.");
  }

  // Non-BASIC: news (min 3 posts, each with title, description, image)
  const posts = input.newsPosts ?? [];
  const completePosts = posts.filter(newsPostComplete);
  if (completePosts.length < 3) {
    errors.push("At least 3 news posts are required; each must have title, description, and image.");
  }

  return {
    canEnable: errors.length === 0,
    errors,
  };
}
