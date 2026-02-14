/**
 * Feature Service
 *
 * Provides type-safe feature flag checking for tier-based access control.
 * This service should be used for both server-side and client-side feature checks.
 *
 * @example
 * // Check if a feature is enabled
 * const canExport = FeatureService.isFeatureEnabled('BASIC', 'excelExport');
 *
 * // Get a feature value
 * const maxMembers = FeatureService.getFeatureValue<number>('BASIC', 'maxTeamMembers');
 */

import { TIER_CONFIG } from "@/config/pricing";
import type { Tier } from "@prisma/client";

/**
 * Type-safe feature paths that can be checked
 */
export type FeaturePath =
  // Pre-Works Access
  | "categories"
  | "groups"
  | "students"
  | "programmes"
  | "assignments"
  // Event-Works Access
  | "chestNumbers"
  | "results"
  | "stageManagement"
  | "schedule"
  // Team & Collaboration
  | "members"
  | "maxTeamMembers"
  | "roleBasedAccess"
  // Import/Export
  | "studentImport"
  | "studentBulkUpload"
  | "programmeBulkUpload"
  | "pdfExport"
  | "excelExport"
  // Communication
  | "emailNotifications"
  | "whatsappSupport"
  | "smsNotifications"
  | "bulkNotifications"
  // Reporting & Analytics
  | "advancedAnalytics"
  | "customReports"
  // Certificates & QR
  | "qrCodes"
  | "autoCertificates"
  | "customCertificateTemplates"
  | "bulkCertificateGeneration"
  // Landing Page
  | "publicLandingPage"
  | "fullLandingPage"
  | "landingPageBuilder"
  // Branding
  | "customUrl"
  | "customDomain"
  | "logoUpload"
  | "customColors"
  | "whiteLabel"
  // Advanced Features
  | "apiAccess"
  | "webhooks"
  | "liveScoreboard"
  | "liveResults"
  | "multiFestivalManagement"
  // Settings
  | "festivalSettings"
  | "advancedSettings"
  // Support
  | "supportLevel"
  | "supportResponseTime"
  // Post-Expiry
  | "postExpiryAccess"
  | "dataRetentionDays";

/**
 * Feature Service - Centralized feature flag management
 */
export class FeatureService {
  /**
   * Check if a feature is enabled for a given tier
   * @param tier - The festival tier (BASIC, STANDARD, PRO)
   * @param featurePath - The feature to check
   * @returns True if feature is enabled, false otherwise
   */
  static isFeatureEnabled(tier: Tier, featurePath: FeaturePath): boolean {
    try {
      const features = TIER_CONFIG[tier]?.features;
      if (!features) {
        console.warn(`[FeatureService] No features found for tier: ${tier}`);
        return false;
      }

      const value = features[featurePath];

      // Handle undefined explicitly
      if (value === undefined) {
        console.warn(
          `[FeatureService] Feature '${featurePath}' not defined for tier ${tier}`,
        );
        return false;
      }

      return Boolean(value);
    } catch (error) {
      console.error(
        `[FeatureService] Error checking feature '${featurePath}' for tier ${tier}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get a feature value (useful for numeric limits or string values)
   * @param tier - The festival tier
   * @param featurePath - The feature to get
   * @returns The feature value or null if not found
   */
  static getFeatureValue<T = any>(
    tier: Tier,
    featurePath: FeaturePath,
  ): T | null {
    try {
      const features = TIER_CONFIG[tier]?.features;
      if (!features) {
        console.warn(`[FeatureService] No features found for tier: ${tier}`);
        return null;
      }

      const value = features[featurePath];

      if (value === undefined) {
        console.warn(
          `[FeatureService] Feature '${featurePath}' not defined for tier ${tier}`,
        );
        return null;
      }

      return value as T;
    } catch (error) {
      console.error(
        `[FeatureService] Error getting feature value '${featurePath}' for tier ${tier}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Check if a tier has access to a specific support level
   * @param tier - The festival tier
   * @param requiredLevel - The required support level
   * @returns True if tier has required support level or higher
   */
  static hasSupportLevel(
    tier: Tier,
    requiredLevel: "whatsapp" | "priority" | "premium",
  ): boolean {
    const supportLevels = ["whatsapp", "priority", "premium"];
    const tierLevel = this.getFeatureValue<string>(tier, "supportLevel");

    if (!tierLevel) return false;

    const tierLevelIndex = supportLevels.indexOf(tierLevel);
    const requiredLevelIndex = supportLevels.indexOf(requiredLevel);

    return tierLevelIndex >= requiredLevelIndex;
  }

  /**
   * Get the maximum team members allowed for a tier
   * @param tier - The festival tier
   * @returns Number of max team members, -1 for unlimited, 0 if not configured
   */
  static getMaxTeamMembers(tier: Tier): number {
    return this.getFeatureValue<number>(tier, "maxTeamMembers") ?? 0;
  }

  /**
   * Check if a tier allows unlimited team members
   * @param tier - The festival tier
   * @returns True if unlimited team members allowed
   */
  static hasUnlimitedTeamMembers(tier: Tier): boolean {
    return this.getMaxTeamMembers(tier) === -1;
  }

  /**
   * Get post-expiry behavior for a tier
   * @param tier - The festival tier
   * @returns 'readonly' or 'delete'
   */
  static getPostExpiryAccess(tier: Tier): "readonly" | "delete" {
    return (
      this.getFeatureValue<"readonly" | "delete">(tier, "postExpiryAccess") ??
      "readonly"
    );
  }
}
