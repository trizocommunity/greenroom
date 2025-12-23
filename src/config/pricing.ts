import { EditionTier } from "@prisma/client";

export const TIER_CONFIG = {
  [EditionTier.BASIC]: {
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
  [EditionTier.STANDARD]: {
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
  [EditionTier.PRO]: {
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
    id: EditionTier.BASIC,
    name: "Basic",
    price: TIER_CONFIG[EditionTier.BASIC].price,
    description: "Perfect for small local festivals and beginners.",
    features: [
      `${TIER_CONFIG[EditionTier.BASIC].limits.participants} Participants`,
      `${TIER_CONFIG[EditionTier.BASIC].limits.events} Events`,
      `${TIER_CONFIG[EditionTier.BASIC].limits.judges} Judges`,
      "0.5 GB Storage",
      `${TIER_CONFIG[EditionTier.BASIC].durationDays} Days Active Duration`,
      "Read-only access afterwards",
    ],
    isPopular: false,
  },
  {
    id: EditionTier.STANDARD,
    name: "Standard",
    price: TIER_CONFIG[EditionTier.STANDARD].price,
    description: "The best value for most growing festivals.",
    features: [
      `${TIER_CONFIG[EditionTier.STANDARD].limits.participants} Participants`,
      `${TIER_CONFIG[EditionTier.STANDARD].limits.events} Events`,
      `${TIER_CONFIG[EditionTier.STANDARD].limits.judges} Judges`,
      "2 GB Storage",
      `${TIER_CONFIG[EditionTier.STANDARD].durationDays} Days Active Duration`,
      "Read-only access afterwards",
    ],
    isPopular: true,
  },
  {
    id: EditionTier.PRO,
    name: "Pro",
    price: TIER_CONFIG[EditionTier.PRO].price,
    description: "For established festivals needing more capacity.",
    features: [
      `${TIER_CONFIG[EditionTier.PRO].limits.participants} Participants`,
      `${TIER_CONFIG[EditionTier.PRO].limits.events} Events`,
      `${TIER_CONFIG[EditionTier.PRO].limits.judges} Judges`,
      "10 GB Storage",
      `${TIER_CONFIG[EditionTier.PRO].durationDays} Days Active Duration`,
      "Read-only access afterwards",
    ],
    isPopular: false,
  },
];
