"use client";

import { PRICING_TIERS } from "@/config/pricing";
import { Info, Lock, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface UpgradeTriggerProps {
  /**
   * Name of the feature being locked
   */
  feature: string;

  /**
   * The tier required to unlock this feature
   */
  requiredTier: "STANDARD" | "PRO";

  /**
   * The locked content to display
   */
  children: React.ReactNode;

  /**
   * Optional className for the wrapper
   */
  className?: string;

  /**
   * Show inline upgrade CTA instead of icon
   * @default false
   */
  inline?: boolean;
}

export function UpgradeTrigger({
  feature,
  requiredTier,
  children,
  className,
  inline = false,
}: UpgradeTriggerProps) {
  const router = useRouter();

  const isTierAvailable = PRICING_TIERS.some((t) => t.id === requiredTier);

  if (!isTierAvailable) {
    return null;
  }

  const handleUpgradeClick = () => {
    if (isTierAvailable) {
      router.push("/pricing");
    }
  };

  const tierInfo = {
    STANDARD: {
      name: "Standard",
      icon: "⭐",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500",
    },
    PRO: {
      name: "Pro",
      icon: "🏆",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500",
    },
  };

  const tier = tierInfo[requiredTier];

  // Inline upgrade CTA
  if (inline) {
    return (
      <div className={cn("relative group", className)}>
        <div className="opacity-60 pointer-events-none">{children}</div>

        <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            className={cn("shadow-lg", tier.bgColor, "hover:opacity-90")}
            onClick={handleUpgradeClick}
            disabled={!isTierAvailable}
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            {isTierAvailable ? `Upgrade to ${tier.name}` : "Not Available"}
          </Button>
        </div>
      </div>
    );
  }

  // Icon-based upgrade trigger
  return (
    <TooltipProvider>
      <div className={cn("relative inline-block group", className)}>
        {children}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute -top-2 -right-2 h-5 w-5 rounded-full",
                "shadow-md border border-white/20",
                tier.bgColor,
                "hover:opacity-90",
                "transition-all duration-200",
                "group-hover:scale-110",
              )}
              onClick={handleUpgradeClick}
            >
              <Lock className="h-2.5 w-2.5 text-white" />
            </Button>
          </TooltipTrigger>

          <TooltipContent side="top" className="max-w-xs p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    tier.bgColor,
                  )}
                >
                  <Lock className="w-3 h-3 text-white" />
                </div>
                <p className="font-semibold text-sm">
                  {tier.icon} {tier.name} Feature
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{feature}</span> is available in
                the{" "}
                <span className={cn("font-semibold", tier.color)}>
                  {tier.name}
                </span>{" "}
                plan and above.
              </p>

              <Button
                size="sm"
                className="w-full mt-2"
                onClick={handleUpgradeClick}
                disabled={!isTierAvailable}
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                {isTierAvailable ? "View Pricing" : "Not Available"}
              </Button>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

/**
 * Simple locked button component with upgrade trigger
 *
 * @example
 * ```tsx
 * <LockedButton feature="Excel Export" requiredTier="STANDARD">
 *   Export Excel
 * </LockedButton>
 * ```
 */
export function LockedButton({
  feature,
  requiredTier,
  children,
  className,
}: {
  feature: string;
  requiredTier: "STANDARD" | "PRO";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <UpgradeTrigger feature={feature} requiredTier={requiredTier}>
      <Button disabled variant="outline" className={cn("relative", className)}>
        <Lock className="w-4 h-4 mr-2" />
        {children}
      </Button>
    </UpgradeTrigger>
  );
}
