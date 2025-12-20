export type PricingTier = {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  limits: {
    participants: number;
    events: number;
    judges: number;
    storage: string;
    durationMonths: number;
  };
  isPopular?: boolean;
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter Edition",
    price: 1500,
    description: "Perfect for small local festivals and beginners.",
    limits: {
      participants: 500,
      events: 50,
      judges: 20,
      storage: "500 MB",
      durationMonths: 3,
    },
    features: [
      "500 Participants",
      "50 Events",
      "20 Judges",
      "500 MB Storage",
      "3 Months Active Duration",
      "Read-only access after 3 months",
      "Archived after 1 year",
    ],
  },
  {
    id: "standard",
    name: "Standard Edition",
    price: 2500,
    description: "The best value for most growing festivals.",
    isPopular: true,
    limits: {
      participants: 1000,
      events: 100,
      judges: 50,
      storage: "1 GB",
      durationMonths: 3,
    },
    features: [
      "1000 Participants",
      "100 Events",
      "50 Judges",
      "1 GB Storage",
      "3 Months Active Duration",
      "Read-only access after 3 months",
      "Archived after 1 year",
    ],
  },
  {
    id: "large",
    name: "Large Edition",
    price: 4000,
    description: "For established festivals needing more capacity.",
    limits: {
      participants: 3000,
      events: 200,
      judges: 100,
      storage: "3 GB",
      durationMonths: 3,
    },
    features: [
      "3000 Participants",
      "200 Events",
      "100 Judges",
      "3 GB Storage",
      "3 Months Active Duration",
      "Read-only access after 3 months",
      "Archived after 1 year",
    ],
  },
];
