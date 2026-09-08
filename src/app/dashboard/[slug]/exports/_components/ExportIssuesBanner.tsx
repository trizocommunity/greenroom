"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ExportListItem } from "@/features/exports/types/export.types";
import { getBannerContent } from "./export-issues-banner.logic";

interface ExportIssuesBannerProps {
  exports: ExportListItem[];
}

export function ExportIssuesBanner({ exports }: ExportIssuesBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const content = getBannerContent(exports);
  if (!content) return null;

  return (
    <Alert
      variant={content.variant === "failure" ? "destructive" : "default"}
      className="flex items-start justify-between gap-4"
    >
      <div className="flex gap-3">
        {content.variant === "failure" ? (
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
        ) : (
          <Loader2 className="h-5 w-5 mt-0.5 shrink-0 animate-spin text-muted-foreground" />
        )}
        <div className="space-y-1">
          <AlertTitle>{content.title}</AlertTitle>
          <AlertDescription>{content.description}</AlertDescription>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        Dismiss
      </Button>
    </Alert>
  );
}
