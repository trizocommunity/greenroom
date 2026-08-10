import { MS } from "@/core/datetime/constants";
import type { Tier } from "@/core/types/app-enums";

export const MS_PER_DAY = MS.day;

// DEFER-1 & DEFER-2 FIX: Completed features blocks for STANDARD and PRO tiers.
// Also typed the Record properly to remove `any`.

export interface TierFeatures {
  // Pre Event Works Access
  categories: boolean;
  groups: boolean;
  participants: boolean;
  viewParticipantProfile: boolean; // View participant profile page (STANDARD+)
  publicParticipantProfile: boolean; // Public URL /{festival}/{participantSlug} (STANDARD+)
  programmes: boolean;
  assignments: boolean;

  // Event-Works Access
  chestNumbers: boolean;
  results: boolean;
  stageManagement: boolean;
  schedule: boolean;
  foodHall: boolean;

  // Team & Collaboration
  members: boolean;
  roleBasedAccess: boolean;

  // Import/Export
  participantImport: boolean;
  participantBulkUpload: boolean;
  programmeBulkUpload: boolean;
  pdfExport: boolean;
  excelExport: boolean;

  // Communication
  emailNotifications: boolean;
  whatsappSupport: boolean;
  smsNotifications: boolean;
  bulkNotifications: boolean;

  // Reporting & Analytics
  advancedAnalytics: boolean;
  customReports: boolean;

  // Templates (poster editor)
  templates: boolean;

  // Exports (festival-scoped data & document exports)
  exports: boolean;

  // Certificates & QR
  qrCodes: boolean;
  autoCertificates: boolean;
  customCertificateTemplates: boolean;
  bulkCertificateGeneration: boolean;

  // Landing Page & Content
  publicLandingPage: boolean;
  fullLandingPage: boolean;
  landingPageBuilder: boolean;
  media: boolean;
  news: boolean;

  // Branding
  customUrl: boolean;
  customDomain: boolean;
  logoUpload: boolean;
  customColors: boolean;
  whiteLabel: boolean;

  // Advanced Features
  apiAccess: boolean;
  webhooks: boolean;
  liveScoreboard: boolean;
  liveResults: boolean;
  multiFestivalManagement: boolean;
  programmeTeamLead: boolean; // Team lead picker on GROUP assignments (PRO)
  programmeAuditDrawer: boolean; // Audit timeline panel on programme drawer (PRO)

  // Settings
  festivalSettings: boolean;
  advancedSettings: boolean;
  programmeAssignmentDeadline: boolean;
  participantCreationDeadline: boolean;

  // Support
  supportLevel: "whatsapp" | "email" | "priority" | "dedicated";
  supportResponseTime: number; // hours

  // Post-expiry
  postExpiryAccess: "readonly" | "delete";
  dataRetentionDays: number;
}

export interface TierLimits {
  participants: number;
  programmes: number;
  events: number;
  stages: number;
  storageMB: number;
  categories: number;
}

export interface TierConfig {
  price: number;
  label: string;
  festivalDurationDays: number;
  limits: TierLimits;
  features: TierFeatures;
}

export const GRACE_PERIOD_DAYS = 7;

/**
 * Single source of truth for the active duration of a festival, in days.
 *
 * Every tier currently uses 90 days. The helper exists so that future tier-aware
 * duration policies (e.g. STANDARD → 120 days) only need to change `pricing.ts`
 * — every consumer routes through this function instead of hard-coded `90`s.
 */
export function getFestivalDurationDays(): number {
  return TIER_CONFIG.BASIC.festivalDurationDays;
}

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  BASIC: {
    price: 1500,
    label: "Basic",
    festivalDurationDays: 90,
    limits: {
      participants: 250,
      programmes: 100,
      events: 10,
      stages: 10,
      storageMB: 512, // 0.5 GB
      categories: 5,
    },
    features: {
      // Pre Event Works Access
      categories: true,
      groups: true,
      participants: true,
      viewParticipantProfile: false, // BASIC: no view participant profile
      publicParticipantProfile: false, // BASIC: no public participant profile page
      programmes: true,
      assignments: true,

      // Event-Works Access
      chestNumbers: true,
      results: true,
      stageManagement: false,
      schedule: false,
      foodHall: false,

      // Team & Collaboration
      members: false,
      roleBasedAccess: false,

      // Import/Export
      participantImport: true,
      participantBulkUpload: false,
      programmeBulkUpload: false,
      pdfExport: true,
      excelExport: false,

      // Communication
      emailNotifications: false,
      whatsappSupport: true,
      smsNotifications: false,
      bulkNotifications: false,

      // Reporting & Analytics
      advancedAnalytics: false,
      customReports: false,

      templates: true,

      exports: true,

      // Certificates & QR
      qrCodes: false,
      autoCertificates: false,
      customCertificateTemplates: false,
      bulkCertificateGeneration: false,

      // Landing Page & Content
      publicLandingPage: true, // Basic version (title + results)
      fullLandingPage: false,
      landingPageBuilder: false,
      media: false,
      news: false,

      // Branding
      customUrl: false,
      customDomain: false,
      logoUpload: true,
      customColors: false,
      whiteLabel: false,

      // Advanced Features
      apiAccess: false,
      webhooks: false,
      liveScoreboard: true,
      liveResults: true,
      multiFestivalManagement: false,
      programmeTeamLead: false,
      programmeAuditDrawer: false,

      // Settings — BASIC has no settings page (sidebar/route already gate on this)
      festivalSettings: true,
      advancedSettings: false,
      programmeAssignmentDeadline: false,
      participantCreationDeadline: false,

      // Support
      supportLevel: "whatsapp",
      supportResponseTime: 24,

      // Post-expiry
      postExpiryAccess: "delete",
      dataRetentionDays: 0,
    },
  },

  STANDARD: {
    price: 3000,
    label: "Standard",
    festivalDurationDays: 90,
    limits: {
      participants: 500,
      programmes: 250,
      events: 25,
      stages: 20,
      storageMB: 2048, // 2 GB
      categories: 10,
    },
    features: {
      // Pre Event Works Access — all enabled
      categories: true,
      groups: true,
      participants: true,
      viewParticipantProfile: true, // STANDARD: view participant profile
      publicParticipantProfile: true, // STANDARD: public participant profile at /{slug}/{participantSlug}
      programmes: true,
      assignments: true,

      // Event-Works Access — everything unlocked
      chestNumbers: true,
      results: true,
      stageManagement: true,
      schedule: true,
      foodHall: true,

      // Team & Collaboration — unlimited members with full RBAC
      members: true,
      roleBasedAccess: true,

      // Import/Export — everything unlocked
      participantImport: true,
      participantBulkUpload: true,
      programmeBulkUpload: true,
      pdfExport: true,
      excelExport: true,

      // Communication — all channels
      emailNotifications: true,
      whatsappSupport: true,
      smsNotifications: true,
      bulkNotifications: true,

      // Reporting & Analytics — advanced unlocked
      advancedAnalytics: true,
      customReports: true,

      templates: true,

      exports: true,

      // Certificates & QR — fully unlocked with templates + bulk generation
      qrCodes: true,
      autoCertificates: true,
      customCertificateTemplates: true,
      bulkCertificateGeneration: true,

      // Landing Page & Content — builder + media & news
      publicLandingPage: true,
      fullLandingPage: true,
      landingPageBuilder: true,
      media: true,
      news: true,

      // Branding — custom URL/colors; wildcard custom domain is PRO-only
      customUrl: true,
      customDomain: false,
      logoUpload: true,
      customColors: true,
      whiteLabel: true,

      // Advanced Features — API, webhooks, live results
      apiAccess: true,
      webhooks: true,
      liveScoreboard: true,
      liveResults: true,
      multiFestivalManagement: true,
      programmeTeamLead: true,
      programmeAuditDrawer: true,

      // Settings
      festivalSettings: true,
      advancedSettings: true,
      programmeAssignmentDeadline: true,
      participantCreationDeadline: true,

      // Support — priority support
      supportLevel: "priority",
      supportResponseTime: 4,

      // Post-expiry
      postExpiryAccess: "delete",
      dataRetentionDays: 0,
    },
  },

  PRO: {
    price: 6000,
    label: "Pro",
    festivalDurationDays: 90,
    limits: {
      participants: 2000,
      programmes: 1000,
      events: 100,
      stages: 50,
      storageMB: 10240, // 10 GB
      categories: 50,
    },
    features: {
      // Pre Event Works Access — all enabled
      categories: true,
      groups: true,
      participants: true,
      viewParticipantProfile: true, // PRO: view participant profile
      publicParticipantProfile: true, // PRO: public participant profile
      programmes: true,
      assignments: true,

      // Event-Works Access — everything unlocked
      chestNumbers: true,
      results: true,
      stageManagement: true,
      schedule: true,
      foodHall: true,

      // Team & Collaboration — unlimited members with full RBAC
      members: true,
      roleBasedAccess: true,

      // Import/Export — everything unlocked
      participantImport: true,
      participantBulkUpload: true,
      programmeBulkUpload: true,
      pdfExport: true,
      excelExport: true,

      // Communication — all channels
      emailNotifications: true,
      whatsappSupport: true,
      smsNotifications: true,
      bulkNotifications: true,

      // Reporting & Analytics — advanced unlocked
      advancedAnalytics: true,
      customReports: true,

      templates: true,

      exports: true,

      // Certificates & QR — fully unlocked with templates + bulk generation
      qrCodes: true,
      autoCertificates: true,
      customCertificateTemplates: true,
      bulkCertificateGeneration: true,

      // Landing Page & Content — builder + media & news
      publicLandingPage: true,
      fullLandingPage: true,
      landingPageBuilder: true,
      media: true,
      news: true,

      // Branding — white-label + custom domain (PRO)
      customUrl: true,
      customDomain: true, // Phase 1: DNS verify + proxy; Phase 2: Vercel Domains/TLS API — see DOCS/features/CUSTOM_DOMAIN.md
      logoUpload: true,
      customColors: true,
      whiteLabel: true,

      // Advanced Features — API, webhooks, live results
      apiAccess: true,
      webhooks: true,
      liveScoreboard: true,
      liveResults: true,
      multiFestivalManagement: true,
      programmeTeamLead: true,
      programmeAuditDrawer: true,

      // Settings
      festivalSettings: true,
      advancedSettings: true,
      programmeAssignmentDeadline: true,
      participantCreationDeadline: true,

      // Support — priority support with 4h SLA
      supportLevel: "priority",
      supportResponseTime: 4,

      // Post-expiry
      postExpiryAccess: "delete",
      dataRetentionDays: 0,
    },
  },
};

export type PricingTier = {
  id: Tier;
  name: string;
  price: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  isCustom?: boolean;
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "BASIC",
    name: "Basic",
    price: TIER_CONFIG.BASIC.price,
    description: "Perfect for small local festivals and beginners.",
    features: [
      `${TIER_CONFIG.BASIC.limits.participants} Participants`,
      `${TIER_CONFIG.BASIC.limits.programmes} Programmes`,
      `${TIER_CONFIG.BASIC.limits.events} Public Events`,
      `${TIER_CONFIG.BASIC.limits.stages} Stages`,
      "0.5 GB Storage",
      `${TIER_CONFIG.BASIC.festivalDurationDays} Days Active Duration`,
      "Data deleted on expiry",
    ],
    isPopular: false,
  },
  {
    id: "STANDARD",
    name: "Standard",
    price: TIER_CONFIG.STANDARD.price,
    description: "The best value for most growing festivals.",
    features: [
      `${TIER_CONFIG.STANDARD.limits.participants} Participants`,
      `${TIER_CONFIG.STANDARD.limits.programmes} Programmes`,
      `${TIER_CONFIG.STANDARD.limits.events} Public Events`,
      `${TIER_CONFIG.STANDARD.limits.stages} Stages`,
      "2 GB Storage",
      `${TIER_CONFIG.STANDARD.festivalDurationDays} Days Active Duration`,
      "Stage Management & Scheduling",
      "Bulk Upload (Participants & Programmes)",
      "QR Codes & Auto Certificates",
      "Full Landing Page",
    ],
    isPopular: true,
  },
  {
    id: "PRO",
    name: "Pro",
    price: TIER_CONFIG.PRO.price,
    description: "For established festivals needing maximum capacity.",
    features: [
      `${TIER_CONFIG.PRO.limits.participants} Participants`,
      "1,000 Programmes",
      `${TIER_CONFIG.PRO.limits.events} Public Events`,
      "50 Stages",
      "10 GB Storage",
      `${TIER_CONFIG.PRO.festivalDurationDays} Days Active Duration`,
      "Advanced Analytics & Custom Reports",
      "Live Scoreboard & Live Results",
      "Certificate Builder & Bulk Generation",
      "White-label + Custom Domain",
      "API Access & Webhooks",
      "Team Members with RBAC",
    ],
    isPopular: false,
  },
];
