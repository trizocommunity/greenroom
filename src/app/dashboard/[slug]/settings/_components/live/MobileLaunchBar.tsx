"use client";

import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Sticky bottom CTA on mobile while the site is offline. The desktop path is
 * handled by the hero card itself; this only exists to keep the launch
 * affordance reachable on a phone when the operator has scrolled past the
 * hero to the DNS section. */
export function MobileLaunchBar({
  visible,
  isReadOnly,
  onLaunch,
}: {
  visible: boolean;
  isReadOnly: boolean;
  onLaunch: () => void;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:hidden">
      <Button
        type="button"
        size="lg"
        className="h-12 w-full text-base"
        onClick={onLaunch}
        disabled={isReadOnly}
      >
        <Rocket className="h-4 w-4 mr-2" />
        Launch website
      </Button>
    </div>
  );
}
