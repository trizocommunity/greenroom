import type { Tier } from "@prisma/client";

export const TIER_CONFIG: Record<Tier, any> = {
  BASIC: {
    price: 1500,
    label: "Basic",
    durationDays: 90,
    limits: {
      participants: 300,
      events: 30,
      judges: 10,
      storageMB: 512, // 0.5 GB
    },
  },
  STANDARD: {
    price: 3000,
    label: "Standard",
    durationDays: 120,
    limits: {
      participants: 1000,
      events: 100,
      judges: 50,
      storageMB: 2048, // 2 GB
    },
  },
  PRO: {
    price: 6000,
    label: "Pro",
    durationDays: 180,
    limits: {
      participants: 3000,
      events: 300,
      judges: 150,
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
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "BASIC",
    name: "Basic",
    price: TIER_CONFIG.BASIC.price,
    description: "Perfect for small local festivals and beginners.",
    features: [
      `${TIER_CONFIG.BASIC.limits.participants} Participants`,
      `${TIER_CONFIG.BASIC.limits.events} Events`,
      `${TIER_CONFIG.BASIC.limits.judges} Judges`,
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
      `${TIER_CONFIG.STANDARD.limits.participants} Participants`,
      `${TIER_CONFIG.STANDARD.limits.events} Events`,
      `${TIER_CONFIG.STANDARD.limits.judges} Judges`,
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
      `${TIER_CONFIG.PRO.limits.participants} Participants`,
      `${TIER_CONFIG.PRO.limits.events} Events`,
      `${TIER_CONFIG.PRO.limits.judges} Judges`,
      "10 GB Storage",
      `${TIER_CONFIG.PRO.durationDays} Days Active Duration`,
      "Read-only access afterwards",
    ],
    isPopular: false,
  },
];
