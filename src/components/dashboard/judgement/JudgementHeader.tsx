"use client";

import { ExternalLink } from "lucide-react";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { Button } from "@/components/ui/button";

/**
 * Page header — title plus the "How judgement works" + "Stage portal"
 * buttons. Lives on its own so the orchestrator can stay focused on data
 * flow.
 */
export function JudgementHeader({ festivalSlug }: { festivalSlug: string }) {
  return (
    <div className="flex  gap-4 flex-row items-center justify-between">
      <h1 className="text-lg font-semibold tracking-tight sm:text-2xl">
        Programme Judgement
      </h1>

      <div className="flex items-center gap-2">
        <HowItWorksButton title="How judgement works">
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold">Starting Judgement</h4>
              <p className="text-muted-foreground">
                Select a programme from the list. You can choose to judge in
                'Single' or 'Group' mode, and assign judges.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Judging Modes</h4>
              <p className="text-muted-foreground">
                <strong>Single:</strong> Judges score independently on their own
                devices.
                <br />
                <strong>Group:</strong> Judges share a single screen and score
                together.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Rejudge</h4>
              <p className="text-muted-foreground">
                If a judgement is completed but needs adjustments, you can
                restart it before it is published.
              </p>
            </div>
          </div>
        </HowItWorksButton>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Open stage portal"
        >
          <a
            href={`/${festivalSlug}/stage-portal`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Stage portal</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
