/**
 * Feature Hooks
 *
 * React hooks for tier-based feature access control.
 * These hooks should be used in client components to conditionally
 * render features based on the festival's tier.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const canExport = useFeature('excelExport');
 *   const supportLevel = useFeatureValue<string>('supportLevel');
 *
 *   return (
 *     <div>
 *       {canExport && <ExportButton />}
 *       <p>Support level: {supportLevel}</p>
 *     </div>
 *   );
 * }
 * ```
 */

"use client";

import { useFestival } from "@/components/festival/FestivalContext";
import {
  type FeaturePath,
  FeatureService,
} from "@/features/plan-features/services/features";
import type { FeatureTag } from "@/features/plan-features/services/features-tags";
import { getFeatureTagRequirements } from "@/features/plan-features/services/features-tags";
import { getResolvedTier } from "@/features/plan-features/services/tier";

/**
 * Hook to check if a feature is enabled for the current festival's tier
 *
 * @param featurePath - The feature to check
 * @returns True if the feature is enabled, false otherwise
 *
 * @example
 * ```tsx
 * const canExportExcel = useFeature('excelExport');
 * ```
 */
export function useFeature(featurePath: FeaturePath): boolean {
  const festival = useFestival();
  const tier = getResolvedTier(festival?.tier);

  if (
    festival?.effectiveFeatures &&
    featurePath in festival.effectiveFeatures
  ) {
    return Boolean(festival.effectiveFeatures[featurePath]);
  }
  return FeatureService.isFeatureEnabled(tier, featurePath);
}

/**
 * Feature Tag hook (business-intent layer).
 *
 * Tags map to one or more underlying `FeaturePath` requirements.
 * This hook evaluates tag enablement using:
 * - `festival.effectiveFeatures` overrides (same behavior as `useFeature`)
 * - Tag rules (allowed tiers / hard-blocks / AND semantics over required features)
 */
export function useFeatureTag(tag: FeatureTag): boolean {
  const festival = useFestival();
  const tier = getResolvedTier(festival?.tier);

  const effectiveFeatures = festival?.effectiveFeatures;
  const req = getFeatureTagRequirements(tag);

  if (req.allowedTiers && !req.allowedTiers.includes(tier as any)) return false;
  if (req.hardBlockBasics && tier === "BASIC") return false;

  const requires = req.requires ?? [];
  if (requires.length === 0) return true; // Tier-only tag

  for (const f of requires) {
    const overridden =
      effectiveFeatures && f in effectiveFeatures
        ? Boolean(effectiveFeatures[f])
        : undefined;

    const enabled =
      overridden ?? FeatureService.isFeatureEnabled(tier, f as FeaturePath);

    if (!enabled) return false;
  }

  return true;
}

/**
 * Hook to get a feature value for the current festival's tier
 *
 * @param featurePath - The feature to get
 * @returns The feature value or null if not found
 *
 * @example
 * const supportLevel = useFeatureValue<string>('supportLevel');
 * ```
 */
export function useFeatureValue<T = any>(featurePath: FeaturePath): T | null {
  const festival = useFestival();
  const tier = getResolvedTier(festival?.tier);

  return FeatureService.getFeatureValue<T>(tier, featurePath);
}

/**
 * Hook to check if the current festival has a specific support level
 *
 * @param requiredLevel - The required support level
 * @returns True if the festival has the required support level or higher
 *
 * @example
 * ```tsx
 * const hasPremiumSupport = useSupportLevel('premium');
 * ```
 */
export function useSupportLevel(
  requiredLevel: "whatsapp" | "priority" | "premium",
): boolean {
  const festival = useFestival();
  const tier = getResolvedTier(festival?.tier);

  return FeatureService.hasSupportLevel(tier, requiredLevel);
}

/**
 * Hook to get all feature information for the current festival
 *
 * @returns Object with commonly used feature checks
 *
 * @example
 * ```tsx
 * const features = useFeatures();
 *
 * return (
 *   <div>
 *     {features.canExportExcel && <ExcelExportButton />}
 *     {features.canManageMembers && <MembersLink />}
 *     {features.canAccessSettings && <SettingsLink />}
 *   </div>
 * );
 * ```
 */
export function useFeatures() {
  return {
    // Export capabilities
    canExportPdf: useFeature("pdfExport"),
    canExportExcel: useFeature("excelExport"),

    // Import capabilities
    canImportCsv: useFeature("studentImport"),
    canBulkUploadStudents: useFeature("studentBulkUpload"),
    canBulkUploadProgrammes: useFeature("programmeBulkUpload"),

    // UI Access
    canManageMembers: useFeature("members"),
    canAccessSettings: useFeature("festivalSettings"),
    canManageStages: useFeature("stageManagement"),
    canManageSchedule: useFeature("schedule"),

    // Features
    canGenerateQR: useFeature("qrCodes"),
    canGenerateCertificates: useFeature("autoCertificates"),
    hasAdvancedAnalytics: useFeature("advancedAnalytics"),
    hasLiveScoreboard: useFeature("liveScoreboard"),
    hasLiveResults: useFeature("liveResults"),
    canUseAdvancedSettings: useFeature("advancedSettings"),
    canUseCustomColors: useFeature("customColors"),
    canManageGallery: useFeature("gallery"),
    canManageNews: useFeature("news"),
    // Support
    supportLevel: useFeatureValue<string>("supportLevel"),
    supportResponseTime: useFeatureValue<number>("supportResponseTime"),
  };
}
