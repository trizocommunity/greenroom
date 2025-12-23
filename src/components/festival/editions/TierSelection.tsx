"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EditionTier } from "@prisma/client";

interface TierSelectionProps {
  festivalId: string;
  onSelect: (tier: EditionTier) => void;
  isProcessing: boolean;
}

const TIERS = [
  {
    id: EditionTier.BASIC,
    name: "Basic",
    price: 1500,
    duration: "90 days",
    features: [
      { label: "300 Participants", value: "300" },
      { label: "30 Events", value: "30" },
      { label: "10 Judges", value: "10" },
      { label: "0.5GB Storage", value: "0.5GB" },
    ],
    recommended: false,
    color: "gray",
    badgeColor: "bg-gray-500",
    borderColor: "border-gray-500/20",
    selectedBorderColor: "border-gray-500",
    selectedBgColor: "bg-gray-500/5",
    selectedRingColor: "ring-gray-500",
    selectedShadowColor: "shadow-gray-500/20",
  },
  {
    id: EditionTier.STANDARD,
    name: "Standard",
    price: 3000,
    duration: "120 days",
    features: [
      { label: "1000 Participants", value: "1000" },
      { label: "100 Events", value: "100" },
      { label: "50 Judges", value: "50" },
      { label: "2GB Storage", value: "2GB" },
    ],
    recommended: true,
    color: "primary", // Purple/Green as per theme (primary is likely purple/green)
    badgeColor: "bg-primary",
    borderColor: "border-primary/20",
    selectedBorderColor: "border-primary",
    selectedBgColor: "bg-primary/5",
    selectedRingColor: "ring-primary",
    selectedShadowColor: "shadow-primary/20",
  },
  {
    id: EditionTier.PRO,
    name: "Pro",
    price: 6000,
    duration: "180 days",
    features: [
      { label: "3000 Participants", value: "3000" },
      { label: "300 Events", value: "300" },
      { label: "150 Judges", value: "150" },
      { label: "10GB Storage", value: "10GB" },
    ],
    recommended: false,
    color: "yellow", // Gold
    badgeColor: "bg-yellow-500",
    borderColor: "border-yellow-500/20",
    selectedBorderColor: "border-yellow-500",
    selectedBgColor: "bg-yellow-500/5",
    selectedRingColor: "ring-yellow-500",
    selectedShadowColor: "shadow-yellow-500/20",
  },
];

export function TierSelection({ onSelect, isProcessing }: TierSelectionProps) {
  const [selectedTier, setSelectedTier] = useState<EditionTier | null>(null);

  const handleSelect = () => {
    if (selectedTier) {
      onSelect(selectedTier);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent mb-4">
          Select Your Edition Tier
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Choose a plan that fits your festival size. All features are
          included—limits are the only difference.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {TIERS.map((tier) => {
          const isSelected = selectedTier === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => !isProcessing && setSelectedTier(tier.id)}
              className={cn(
                "relative rounded-xl border p-6 cursor-pointer transition-all duration-300 hover:scale-105 text-left w-full focus-visible:outline-hidden focus-visible:ring-2",
                tier.borderColor, // Default border color
                "bg-white/5 hover:bg-white/10",
                isSelected &&
                  cn(
                    tier.selectedBorderColor,
                    tier.selectedBgColor,
                    "ring-1",
                    tier.selectedRingColor,
                    "shadow-2xl",
                    tier.selectedShadowColor,
                  ),
                isProcessing && "opacity-50 cursor-not-allowed",
              )}
            >
              {tier.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-primary/20">
                  Recommended
                </div>
              )}

              {/* Tier Name Badge */}
              <div className="text-center mb-6">
                <div
                  className={cn(
                    "inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 uppercase tracking-wider text-white",
                    isSelected ? tier.badgeColor : "bg-white/10 text-gray-400",
                  )}
                >
                  {tier.name}
                </div>

                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold">₹{tier.price}</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">{tier.duration}</p>
              </div>

              <div className="space-y-4 mb-6">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div
                      className={cn(
                        "shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors",
                        isSelected
                          ? cn(tier.badgeColor, "text-white") // Use badge color for check circle
                          : "bg-white/10 text-gray-400",
                      )}
                    >
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-gray-300">
                      <strong className="text-white">{feature.value}</strong>{" "}
                      {feature.label.split(" ").slice(1).join(" ")}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className={cn(
                  "w-full h-1 rounded-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!selectedTier || isProcessing}
          onClick={handleSelect}
          className="w-full max-w-sm h-12 text-lg font-semibold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : (
            "Continue to Payment"
          )}
        </Button>
      </div>
    </div>
  );
}
