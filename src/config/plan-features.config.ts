import { TIER_CONFIG } from "@/config/pricing";
import type { Tier } from "@/core/types/app-enums";
import type {
  BooleanFeaturePath,
  FeaturePath,
} from "@/features/plan-features/services/feature-gate";

/**
 * Boolean feature paths that can be toggled by Super Admin.
 * Derived from TierFeatures so the list cannot drift.
 */
export const PLAN_FEATURE_TOGGLE_KEYS = Object.keys(
  TIER_CONFIG.BASIC.features,
).filter(
  (key): key is BooleanFeaturePath =>
    typeof TIER_CONFIG.BASIC.features[
      key as keyof typeof TIER_CONFIG.BASIC.features
    ] === "boolean",
);

/** Human-readable labels for the plan features matrix. */
export const PLAN_FEATURE_LABELS: Record<FeaturePath, string> = {
  categories: "Categories",
  exports: "Exports",
  groups: "Groups",
  participants: "Participants",
  viewParticipantProfile: "Participant Profile",
  publicParticipantProfile: "Public Participant Profile",
  programmes: "Programmes",
  assignments: "Assignments",
  chestNumbers: "Chest Numbers",
  results: "Results",
  stageManagement: "Stage Management",
  schedule: "Schedule",
  foodHall: "Food Hall",
  members: "Members",
  roleBasedAccess: "Role-based Access",
  participantImport: "Participant Import",
  participantBulkUpload: "Participant Bulk Upload",
  programmeBulkUpload: "Programme Bulk Upload",
  pdfExport: "PDF Export",
  excelExport: "Excel Export",
  emailNotifications: "Email Notifications",
  whatsappSupport: "WhatsApp Support",
  smsNotifications: "SMS Notifications",
  bulkNotifications: "Bulk Notifications",
  notifications: "Notifications",
  advancedAnalytics: "Advanced Analytics",
  customReports: "Custom Reports",
  templates: "Templates",
  qrCodes: "QR Codes",
  autoCertificates: "Auto Certificates",
  customCertificateTemplates: "Custom Certificate Templates",
  bulkCertificateGeneration: "Bulk Certificate Generation",
  publicLandingPage: "Public Landing Page",
  fullLandingPage: "Full Landing Page",
  landingPageBuilder: "Landing Page Builder",
  media: "Media",
  news: "News",
  customUrl: "Custom URL",
  customDomain: "Custom Domain",
  logoUpload: "Logo Upload",
  customColors: "Custom Colors",
  whiteLabel: "White Label",
  apiAccess: "API Access",
  webhooks: "Webhooks",
  liveScoreboard: "Live Scoreboard",
  liveResults: "Live Results",
  multiFestivalManagement: "Multi-festival Management",
  festivalSettings: "Festival Settings",
  advancedSettings: "Advanced Settings",
  programmeAssignmentDeadline: "Programme Assignment Deadline",
  participantCreationDeadline: "Participant Registration Deadline",
  programmeTeamLead: "Programme Team Lead",
  programmeAuditDrawer: "Programme Audit Trail",
  supportLevel: "Support Level",
  supportResponseTime: "Support Response Time",
  postExpiryAccess: "Post-expiry Access",
  dataRetentionDays: "Data Retention Days",
};

export const PLANS: Tier[] = ["BASIC", "STANDARD", "PRO"];
