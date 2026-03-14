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
 *   const maxMembers = useFeatureValue<number>('maxTeamMembers');
 *
 *   return (
 *     <div>
 *       {canExport && <ExportButton />}
 *       <p>Max members: {maxMembers}</p>
 *     </div>
 *   );
 * }
 * ```
 */

"use client";

import { useFestival } from "@/components/festival/FestivalContext";
import { FeatureService, type FeaturePath } from "@/lib/features";
import { getResolvedTier } from "@/lib/tier";

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

  if (festival?.effectiveFeatures && featurePath in festival.effectiveFeatures) {
    return Boolean(festival.effectiveFeatures[featurePath]);
  }
  return FeatureService.isFeatureEnabled(tier, featurePath);
}

/**
 * Hook to get a feature value for the current festival's tier
 *
 * @param featurePath - The feature to get
 * @returns The feature value or null if not found
 *
 * @example
 * ```tsx
 * const maxTeamMembers = useFeatureValue<number>('maxTeamMembers');
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
 * Hook to get the maximum team members for the current festival
 *
 * @returns Number of max team members, -1 for unlimited
 *
 * @example
 * ```tsx
 * const maxMembers = useMaxTeamMembers();
 * const canAddMore = currentCount < maxMembers || maxMembers === -1;
 * ```
 */
export function useMaxTeamMembers(): number {
  const festival = useFestival();
  const tier = getResolvedTier(festival?.tier);

  return FeatureService.getMaxTeamMembers(tier);
}

/**
 * Hook to check if the current festival allows unlimited team members
 *
 * @returns True if unlimited team members are allowed
 */
export function useHasUnlimitedTeamMembers(): boolean {
  const festival = useFestival();
  const tier = getResolvedTier(festival?.tier);

  return FeatureService.hasUnlimitedTeamMembers(tier);
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

    // Team
    maxTeamMembers: useMaxTeamMembers(),
    hasUnlimitedMembers: useHasUnlimitedTeamMembers(),

    // Support
    supportLevel: useFeatureValue<string>("supportLevel"),
    supportResponseTime: useFeatureValue<number>("supportResponseTime"),
  };
}
