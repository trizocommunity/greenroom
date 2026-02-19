import type { Tier } from "@prisma/client";

export const TIER_CONFIG: Record<Tier, any> = {
  BASIC: {
    price: 1500,
    label: "Basic",
    durationDays: 30,
    limits: {
      students: 250,
      programmes: 100,
      events: 10, // Public events (talks, ceremonies)
      stages: 2,
      storageMB: 512, // 0.5 GB
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
      members: false, // No team member management UI
      roleBasedAccess: false,

      // Import/Export
      studentImport: true, // CSV import allowed
      studentBulkUpload: false, // No bulk upload
      programmeBulkUpload: false, // No bulk upload
      pdfExport: true,
      excelExport: false,

      // Communication
      emailNotifications: false,
      whatsappSupport: true, // 24h response time
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
      publicLandingPage: true, // Basic version only (title + results)
      fullLandingPage: false,
      landingPageBuilder: false,

      // Branding
      customUrl: false,
      customDomain: false,
      logoUpload: true, // Basic logo upload only
      customColors: false,
      whiteLabel: false,

      // Advanced Features
      apiAccess: false,
      webhooks: false,
      liveScoreboard: false,
      liveResults: false,
      multiFestivalManagement: false,

      // Settings
      festivalSettings: true, // Settings page access enabled for config
      advancedSettings: false,

      // Support
      supportLevel: "whatsapp",
      supportResponseTime: 24, // hours

      // Post-Expiry Behavior
      postExpiryAccess: "delete", // Data will be deleted on expiry
      dataRetentionDays: 0, // No retention, immediate deletion
    },
  },
  STANDARD: {
    price: 3000,
    label: "Standard",
    durationDays: 90,
    limits: {
      students: 500,
      programmes: 250,
      events: 25, // Public events (talks, ceremonies)
      stages: 20,
      storageMB: 2048, // 2 GB
    },
  },
  PRO: {
    price: 6000,
    label: "Pro",
    durationDays: 180,
    limits: {
      students: 2000,
      programmes: 1000, // Effectively unlimited
      events: 100, // Public events (talks, ceremonies)
      stages: 50, // Effectively unlimited
      storageMB: 10240, // 10 GB
    },
  },
};

export type PricingTier = {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  isCustom?: boolean; // Added Custom Support
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
      "Read-only access afterwards",
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
      "Read-only access afterwards",
    ],
    isPopular: true,
  },
  {
    id: "PRO",
    name: "Pro",
    price: TIER_CONFIG.PRO.price,
    description: "For established festivals needing more capacity.",
    features: [
      `${TIER_CONFIG.PRO.limits.students} Students`,
      "Unlimited Programmes",
      `${TIER_CONFIG.PRO.limits.events} Public Events`,
      "Unlimited Stages",
      "10 GB Storage",
      `${TIER_CONFIG.PRO.durationDays} Days Active Duration`,
      "Read-only access afterwards",
    ],
    isPopular: false,
  },
];
