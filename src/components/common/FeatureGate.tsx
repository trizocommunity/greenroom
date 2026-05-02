/**
 * Feature Gate Component
 *
 * Conditionally renders children based on feature availability.
 * Provides clean separation between available and locked features.
 *
 * @example
 * ```tsx
 * // Show feature only if available
 * <FeatureGate feature="excelExport">
 *   <ExportExcelButton />
 * </FeatureGate>
 *
 * // Show upgrade prompt if not available
 * <FeatureGate feature="excelExport" requiredTier="STANDARD">
 *   <ExportExcelButton />
 * </FeatureGate>
 *
 * // Custom fallback
 * <FeatureGate
 *   feature="excelExport"
 *   fallback={<p>Excel export not available</p>}
 * >
 *   <ExportExcelButton />
 * </FeatureGate>
 * ```
 */

"use client";

import { UpgradeTrigger } from "@/components/common/UpgradeTrigger";
import { useFeature } from "@/features/plan-features/hooks/use-feature";
import type { FeaturePath } from "@/features/plan-features/services/features";

interface FeatureGateProps {
  /**
   * The feature to check
   */
  feature: FeaturePath;

  /**
   * The tier required to unlock this feature
   * If provided and feature is not available, shows upgrade prompt
   */
  requiredTier?: "STANDARD" | "PRO";

  /**
   * Custom fallback to show when feature is not available
   * If not provided and requiredTier is set, shows upgrade prompt
   * If neither provided, renders nothing
   */
  fallback?: React.ReactNode;

  /**
   * Content to show when feature is available
   */
  children: React.ReactNode;

  /**
   * Optional className for the wrapper
   */
  className?: string;
}

/**
 * Conditionally renders children based on feature availability
 */
export function FeatureGate({
  feature,
  requiredTier,
  fallback,
  children,
  className,
}: FeatureGateProps) {
  const hasAccess = useFeature(feature);

  // Feature is available - render children
  if (hasAccess) {
    return className ? <div className={className}>{children}</div> : children;
  }

  // Feature not available - check for fallback
  if (fallback) {
    return className ? <div className={className}>{fallback}</div> : fallback;
  }

  // Show upgrade trigger if tier specified
  if (requiredTier) {
    return (
      <UpgradeTrigger
        feature={getFeatureLabel(feature)}
        requiredTier={requiredTier}
      >
        <div className="opacity-50 pointer-events-none">{children}</div>
      </UpgradeTrigger>
    );
  }

  // No fallback, no tier - render nothing
  return null;
}

/**
 * Helper to get human-readable feature labels
 */
function getFeatureLabel(feature: FeaturePath): string {
  const labels: Record<FeaturePath, string> = {
    // Pre Event Works
    categories: "Categories",
    groups: "Groups",
    students: "Students",
    viewStudentProfile: "Student Profile",
    publicStudentProfile: "Public Student Profile",
    programmes: "Programmes",
    assignments: "Assignments",

    // Event-Works
    chestNumbers: "Chest Numbers",
    results: "Results",
    stageManagement: "Stage Management",
    schedule: "Schedule",

    // Team
    members: "Team Members",
    maxTeamMembers: "Team Member Limit",
    roleBasedAccess: "Role-Based Access",

    // Import/Export
    studentImport: "Student Import",
    studentBulkUpload: "Bulk Student Upload",
    programmeBulkUpload: "Bulk Programme Upload",
    pdfExport: "PDF Export",
    excelExport: "Excel Export",

    // Communication
    emailNotifications: "Email Notifications",
    whatsappSupport: "WhatsApp Support",
    smsNotifications: "SMS Notifications",
    bulkNotifications: "Bulk Notifications",

    // Analytics
    advancedAnalytics: "Advanced Analytics",
    customReports: "Custom Reports",

    // Certificates & QR
    qrCodes: "QR Codes",
    autoCertificates: "Auto Certificates",
    customCertificateTemplates: "Custom Certificate Templates",
    bulkCertificateGeneration: "Bulk Certificate Generation",

    // Landing Page
    publicLandingPage: "Public Landing Page",
    fullLandingPage: "Full Landing Page",
    landingPageBuilder: "Landing Page Builder",
    gallery: "Gallery",
    news: "News",

    // Branding
    customUrl: "Custom URL",
    customDomain: "Custom Domain",
    logoUpload: "Logo Upload",
    customColors: "Custom Colors",
    whiteLabel: "White Label",

    // Advanced
    apiAccess: "API Access",
    webhooks: "Webhooks",
    liveScoreboard: "Live Scoreboard",
    liveResults: "Live Results",
    multiFestivalManagement: "Multi-Festival Management",

    // Settings
    festivalSettings: "Festival Settings",
    advancedSettings: "Advanced Settings",
    programmeAssignmentDeadline: "Programme Assignment Deadline",

    // Support
    supportLevel: "Support Level",
    supportResponseTime: "Support Response Time",

    // Post-Expiry
    postExpiryAccess: "Post-Expiry Access",
    dataRetentionDays: "Data Retention",
  };

  return labels[feature] || feature;
}
