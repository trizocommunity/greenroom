import type { Tier } from "@prisma/client";

export const TIER_CONFIG: Record<Tier, any> = {
  BASIC: {
    price: 1500,
    label: "Basic",
    durationDays: 30,
    limits: {
      students: 150,
      programmes: 100,
      sessions: 15,
      storageMB: 512, // 0.5 GB
    },
  },
  STANDARD: {
    price: 3000,
    label: "Standard",
    durationDays: 90,
    limits: {
      students: 500,
      programmes: 250,
      sessions: 50,
      storageMB: 2048, // 2 GB
    },
  },
  PRO: {
    price: 6000,
    label: "Pro",
    durationDays: 180,
    limits: {
      students: 1000,
      programmes: 500,
      sessions: 100,
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
      `${TIER_CONFIG.BASIC.limits.sessions} Sessions`,
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
      `${TIER_CONFIG.STANDARD.limits.sessions} Sessions`,
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
      `${TIER_CONFIG.PRO.limits.programmes} Programmes`,
      `${TIER_CONFIG.PRO.limits.sessions} Sessions`,
      "10 GB Storage",
      `${TIER_CONFIG.PRO.durationDays} Days Active Duration`,
      "Read-only access afterwards",
    ],
    isPopular: false,
  },
];
