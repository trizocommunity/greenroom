import type { Tier } from "@prisma/client";

// DEFER-1 & DEFER-2 FIX: Completed features blocks for STANDARD and PRO tiers.
// Also typed the Record properly to remove `any`.

export interface TierFeatures {
  // Pre-Works Access
  categories: boolean;
  groups: boolean;
  students: boolean;
  programmes: boolean;
  assignments: boolean;

  // Event-Works Access
  chestNumbers: boolean;
  results: boolean;
  stageManagement: boolean;
  schedule: boolean;

  // Team & Collaboration
  maxTeamMembers: number;
  members: boolean;
  roleBasedAccess: boolean;

  // Import/Export
  studentImport: boolean;
  studentBulkUpload: boolean;
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

  // Certificates & QR
  qrCodes: boolean;
  autoCertificates: boolean;
  customCertificateTemplates: boolean;
  bulkCertificateGeneration: boolean;

  // Landing Page
  publicLandingPage: boolean;
  fullLandingPage: boolean;
  landingPageBuilder: boolean;

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

  // Settings
  festivalSettings: boolean;
  advancedSettings: boolean;

  // Support
  supportLevel: "whatsapp" | "email" | "priority" | "dedicated";
  supportResponseTime: number; // hours

  // Post-Expiry Behavior
  postExpiryAccess: "delete" | "readonly" | "full";
  dataRetentionDays: number;
}

export interface TierLimits {
  students: number;
  programmes: number;
  events: number;
  stages: number;
  storageMB: number;
  categories: number;
}

export interface TierConfig {
  price: number;
  label: string;
  durationDays: number;
  limits: TierLimits;
  features: TierFeatures;
}

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  BASIC: {
    price: 1500,
    label: "Basic",
    durationDays: 30,
    limits: {
      students: 250,
      programmes: 100,
      events: 10,
      stages: 2,
      storageMB: 512, // 0.5 GB
      categories: 5,
    },
    features: {
      // Pre-Works Access
      categories: true,
      groups: true,
      students: true,
      programmes: true,
      assignments: true,

      // Event-Works Access
      chestNumbers: true,
      results: true,
      stageManagement: false,
      schedule: false,

      // Team & Collaboration
      maxTeamMembers: 1, // Owner only, no additional members
      members: false,
      roleBasedAccess: false,

      // Import/Export
      studentImport: true,
      studentBulkUpload: false,
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

      // Certificates & QR
      qrCodes: false,
      autoCertificates: false,
      customCertificateTemplates: false,
      bulkCertificateGeneration: false,

      // Landing Page
      publicLandingPage: true, // Basic version (title + results)
      fullLandingPage: false,
      landingPageBuilder: false,

      // Branding
      customUrl: false,
      customDomain: false,
      logoUpload: true,
      customColors: false,
      whiteLabel: false,

      // Advanced Features
      apiAccess: false,
      webhooks: false,
      liveScoreboard: false,
      liveResults: false,
      multiFestivalManagement: false,

      // Settings
      festivalSettings: true,
      advancedSettings: false,

      // Support
      supportLevel: "whatsapp",
      supportResponseTime: 24,

      // Post-Expiry Behavior
      postExpiryAccess: "delete",
      dataRetentionDays: 0,
    },
  },

  STANDARD: {
    price: 3000,
    label: "Standard",
    durationDays: 90,
    limits: {
      students: 500,
      programmes: 250,
      events: 25,
      stages: 20,
      storageMB: 2048, // 2 GB
      categories: 10,
    },
    features: {
      // Pre-Works Access — all enabled
      categories: true,
      groups: true,
      students: true,
      programmes: true,
      assignments: true,

      // Event-Works Access — stage management and scheduling unlocked
      chestNumbers: true,
      results: true,
      stageManagement: true,
      schedule: true,

      // Team & Collaboration — up to 3 members, simple role management
      maxTeamMembers: 3,
      members: true,
      roleBasedAccess: false, // granular RBAC still a PRO feature

      // Import/Export — bulk upload unlocked
      studentImport: true,
      studentBulkUpload: true,
      programmeBulkUpload: true,
      pdfExport: true,
      excelExport: true,

      // Communication — email notifications added
      emailNotifications: true,
      whatsappSupport: true,
      smsNotifications: false,
      bulkNotifications: false,

      // Reporting & Analytics
      advancedAnalytics: false,
      customReports: false,

      // Certificates & QR — QR and auto-certs unlocked
      qrCodes: true,
      autoCertificates: true,
      customCertificateTemplates: false,
      bulkCertificateGeneration: false,

      // Landing Page — full landing page unlocked
      publicLandingPage: true,
      fullLandingPage: true,
      landingPageBuilder: false,

      // Branding — custom URL and colors
      customUrl: true,
      customDomain: false,
      logoUpload: true,
      customColors: true,
      whiteLabel: false,

      // Advanced Features
      apiAccess: false,
      webhooks: false,
      liveScoreboard: true,
      liveResults: false,
      multiFestivalManagement: false,

      // Settings
      festivalSettings: true,
      advancedSettings: true,

      // Support — email support with faster response
      supportLevel: "email",
      supportResponseTime: 12,

      // Post-Expiry Behavior — read-only access retained for 30 days
      postExpiryAccess: "readonly",
      dataRetentionDays: 30,
    },
  },

  PRO: {
    price: 6000,
    label: "Pro",
    durationDays: 180,
    limits: {
      students: 2000,
      programmes: 1000,
      events: 100,
      stages: 50,
      storageMB: 10240, // 10 GB
      categories: 50,
    },
    features: {
      // Pre-Works Access — all enabled
      categories: true,
      groups: true,
      students: true,
      programmes: true,
      assignments: true,

      // Event-Works Access — everything unlocked
      chestNumbers: true,
      results: true,
      stageManagement: true,
      schedule: true,

      // Team & Collaboration — up to 10 members with full RBAC
      maxTeamMembers: 10,
      members: true,
      roleBasedAccess: true,

      // Import/Export — everything unlocked
      studentImport: true,
      studentBulkUpload: true,
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

      // Certificates & QR — fully unlocked with templates + bulk generation
      qrCodes: true,
      autoCertificates: true,
      customCertificateTemplates: true,
      bulkCertificateGeneration: true,

      // Landing Page — drag-and-drop builder
      publicLandingPage: true,
      fullLandingPage: true,
      landingPageBuilder: true,

      // Branding — white-label + custom domain
      customUrl: true,
      customDomain: true,
      logoUpload: true,
      customColors: true,
      whiteLabel: true,

      // Advanced Features — API, webhooks, live results
      apiAccess: true,
      webhooks: true,
      liveScoreboard: true,
      liveResults: true,
      multiFestivalManagement: true,

      // Settings
      festivalSettings: true,
      advancedSettings: true,

      // Support — priority support with 4h SLA
      supportLevel: "priority",
      supportResponseTime: 4,

      // Post-Expiry Behavior — full access retained for 90 days
      postExpiryAccess: "full",
      dataRetentionDays: 90,
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
      `${TIER_CONFIG.BASIC.limits.students} Students`,
      `${TIER_CONFIG.BASIC.limits.programmes} Programmes`,
      `${TIER_CONFIG.BASIC.limits.events} Public Events`,
      `${TIER_CONFIG.BASIC.limits.stages} Stages`,
      "0.5 GB Storage",
      `${TIER_CONFIG.BASIC.durationDays} Days Active Duration`,
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
      `${TIER_CONFIG.STANDARD.limits.students} Students`,
      `${TIER_CONFIG.STANDARD.limits.programmes} Programmes`,
      `${TIER_CONFIG.STANDARD.limits.events} Public Events`,
      `${TIER_CONFIG.STANDARD.limits.stages} Stages`,
      "2 GB Storage",
      `${TIER_CONFIG.STANDARD.durationDays} Days Active Duration`,
      "Stage Management & Scheduling",
      "Bulk Upload (Students & Programmes)",
      "QR Codes & Auto Certificates",
      "Full Landing Page",
      "30-day read-only access after expiry",
    ],
    isPopular: true,
  },
  {
    id: "PRO",
    name: "Pro",
    price: TIER_CONFIG.PRO.price,
    description: "For established festivals needing maximum capacity.",
    features: [
      `${TIER_CONFIG.PRO.limits.students} Students`,
      "1,000 Programmes",
      `${TIER_CONFIG.PRO.limits.events} Public Events`,
      "50 Stages",
      "10 GB Storage",
      `${TIER_CONFIG.PRO.durationDays} Days Active Duration`,
      "Advanced Analytics & Custom Reports",
      "Live Scoreboard & Live Results",
      "Certificate Builder & Bulk Generation",
      "White-label + Custom Domain",
      "API Access & Webhooks",
      "Up to 10 Team Members with RBAC",
      "90-day full access after expiry",
    ],
    isPopular: false,
  },
];
