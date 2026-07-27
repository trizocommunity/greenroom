/**
 * Feature tags (business-intent layer).
 *
 * Tags are meant to answer: "what capability does the UI/action want?"
 * while still mapping to concrete `FeaturePath` checks for actual enforcement.
 *
 * SECURITY NOTE:
 * - Never rely on tags alone for backend security-critical decisions.
 * - Server must still evaluate required `FeaturePath`s (this module is safe for that,
 *   because it maps tags -> required feature flags deterministically).
 */

import {
  PLAN_FEATURE_LABELS,
  PLAN_FEATURE_TOGGLE_KEYS,
} from "@/config/plan-features.config";
import type { Tier } from "@/core/types/app-enums";
import type { FeaturePath } from "@/features/plan-features/services/features";

export type FeatureToggleKey = (typeof PLAN_FEATURE_TOGGLE_KEYS)[number];

export type CuratedFeatureTag =
  | "eventWorks.reporting"
  | "eventWorks.externalJudging"
  | "eventWorks.judgmentUI"
  | "eventWorks.marksUI"
  | "programme.teamLead"
  | "programme.auditDrawer";

export type FeatureTag = FeatureToggleKey | CuratedFeatureTag;

const CURATED_FEATURE_TAGS: CuratedFeatureTag[] = [
  "eventWorks.reporting",
  "eventWorks.externalJudging",
  "eventWorks.judgmentUI",
  "eventWorks.marksUI",
  "programme.teamLead",
  "programme.auditDrawer",
];

export const FEATURE_TAGS: FeatureTag[] = [
  ...PLAN_FEATURE_TOGGLE_KEYS,
  ...CURATED_FEATURE_TAGS,
];

type TagRequirement = {
  /**
   * Underlying FeaturePaths that must be enabled (AND semantics).
   * If omitted, the tag has no dependency (beyond tier constraints).
   */
  requires?: FeatureToggleKey[];
  /**
   * Optional: tier restriction for UI gating semantics.
   */
  allowedTiers?: Tier[];
  /**
   * Optional: BASIC hard-block regardless of underlying FeaturePath toggles.
   * (Used for external judging to ensure BASIC never exposes the workflow.)
   */
  hardBlockBasics?: boolean;
};

const CURATED_TAG_REQUIREMENTS: Record<CuratedFeatureTag, TagRequirement> = {
  "eventWorks.reporting": {
    requires: ["stageManagement"],
  },
  "eventWorks.externalJudging": {
    requires: ["schedule"],
    hardBlockBasics: true,
  },
  "eventWorks.judgmentUI": {
    requires: ["schedule"],
    hardBlockBasics: true,
  },
  "eventWorks.marksUI": {
    // Marks UI is intended for BASIC manual workflow.
    // Require the same concrete FeaturePaths that the UI/actions rely on.
    allowedTiers: ["BASIC"],
    requires: ["results", "chestNumbers"],
  },
  "programme.teamLead": {
    allowedTiers: ["PRO"],
  },
  "programme.auditDrawer": {
    allowedTiers: ["PRO"],
  },
};

export function isCuratedFeatureTag(tag: FeatureTag): tag is CuratedFeatureTag {
  return (CURATED_FEATURE_TAGS as readonly FeatureTag[]).includes(tag);
}

export function getFeatureTagRequirements(tag: FeatureTag): TagRequirement {
  if (isCuratedFeatureTag(tag)) return CURATED_TAG_REQUIREMENTS[tag];
  // Alias tags: 1:1 mapping to underlying boolean FeaturePath.
  return { requires: [tag] };
}

const CURATED_FEATURE_TAG_LABELS: Record<CuratedFeatureTag, string> = {
  "eventWorks.reporting": "Reporting",
  "eventWorks.externalJudging": "External Judges",
  "eventWorks.judgmentUI": "Judgment UI",
  "eventWorks.marksUI": "Marks UI",
  "programme.teamLead": "Programme Team Lead",
  "programme.auditDrawer": "Programme Audit Trail",
};

export function getFeatureTagLabel(tag: FeatureTag): string {
  if (isCuratedFeatureTag(tag)) return CURATED_FEATURE_TAG_LABELS[tag];
  return PLAN_FEATURE_LABELS[tag as FeaturePath] ?? String(tag);
}

export function isFeatureToggleKey(tag: FeatureTag): tag is FeatureToggleKey {
  return (PLAN_FEATURE_TOGGLE_KEYS as readonly FeaturePath[]).includes(
    tag as FeaturePath,
  );
}

export function isFeatureTagEnabled(params: {
  tier: Tier;
  tag: FeatureTag;
  effectiveFeatureMatrix:
    | Partial<Record<FeaturePath, boolean>>
    | null
    | undefined;
}): boolean {
  const { tier, tag, effectiveFeatureMatrix } = params;
  const req = getFeatureTagRequirements(tag);

  if (req.allowedTiers && !req.allowedTiers.includes(tier)) return false;
  if (req.hardBlockBasics && tier === "BASIC") return false;

  const requires = req.requires ?? [];
  for (const f of requires) {
    if (!effectiveFeatureMatrix?.[f]) return false;
  }

  return true;
}
