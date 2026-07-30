/**
 * Validation for enabling the public festival website (Festival Live).
 * Plan-based:
 * - All plans: festival name, description, and organization name + description are required.
 * - Non-BASIC only: also requires media (min 4 images) and news (min 1 post with title, description, image).
 */

import type { Tier } from "@/core/types/app-enums";
import { getResolvedTier } from "@/features/plan-features/services/tier";

export interface ValidationInput {
  name: string | null;
  description: string | null;
  orgName: string | null;
  orgDescription: string | null;
  orgWebsite: string | null;
  orgLocation: string | null;
  tier: Tier | string | null;
  /** For non-BASIC: number of media images (min 4 required). */
  mediaImageCount?: number;
  /** For non-BASIC: list of news posts; each must have title, content, image. Min 1 required. */
  newsPosts?: Array<{
    title?: string | null;
    content?: string | null;
    imageUrl?: string | null;
  }>;
}

export interface ValidationResult {
  canEnable: boolean;
  errors: string[];
}

function basicDetailsComplete(
  name: string | null,
  description: string | null,
): boolean {
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    typeof description === "string" &&
    description.trim().length > 0
  );
}

function orgDetailsComplete(input: ValidationInput): boolean {
  const hasOrgName =
    typeof input.orgName === "string" && input.orgName.trim().length > 0;
  const hasOrgDescription =
    typeof input.orgDescription === "string" &&
    input.orgDescription.trim().length > 0;
  return hasOrgName && hasOrgDescription;
}

function newsPostComplete(post: {
  title?: string | null;
  content?: string | null;
  imageUrl?: string | null;
}): boolean {
  const hasTitle =
    typeof post.title === "string" && post.title.trim().length > 0;
  const hasContent =
    typeof post.content === "string" && post.content.trim().length > 0;
  const hasImage =
    typeof post.imageUrl === "string" && post.imageUrl.trim().length > 0;
  return hasTitle && hasContent && hasImage;
}

/**
 * Returns whether the festival can enable the public site and any error messages.
 */
export function validatePublicSiteRequirements(
  input: ValidationInput,
): ValidationResult {
  const errors: string[] = [];
  const tier = getResolvedTier(input.tier);
  const isBasic = tier === "BASIC";

  // All plans: festival basic details
  if (!basicDetailsComplete(input.name, input.description)) {
    errors.push("Festival name and description are required.");
  }

  // All plans: organization details required to enable (no enable without org info)
  if (!orgDetailsComplete(input)) {
    errors.push(
      "Organization name and organization description are required to enable Festival Live.",
    );
  }

  if (isBasic) {
    return {
      canEnable: errors.length === 0,
      errors,
    };
  }

  // Non-BASIC only: media (min 4 images)
  const mediaCount = input.mediaImageCount ?? 0;
  if (mediaCount < 4) {
    errors.push("Media must have at least 4 images.");
  }

  // Non-BASIC: news (min 1 post, each with title, description, image)
  const posts = input.newsPosts ?? [];
  const completePosts = posts.filter(newsPostComplete);
  if (completePosts.length < 1) {
    errors.push(
      "At least 1 news post is required; it must have title, description, and image.",
    );
  }

  return {
    canEnable: errors.length === 0,
    errors,
  };
}
