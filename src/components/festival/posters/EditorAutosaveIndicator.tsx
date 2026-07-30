"use client";

import { Cloud, CloudOff, Loader2 } from "lucide-react";
import type { AutosaveStatus } from "@/components/festival/posters/use-poster-editor-autosave";
import { cn } from "@/core/utils/cn";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function EditorAutosaveIndicator({
  status,
  lastSavedAt,
  errorMessage,
}: {
  status: AutosaveStatus;
  lastSavedAt: string | null;
  errorMessage: string | null;
}) {
  const label =
    status === "saving"
      ? "Saving draft…"
      : status === "saved" && lastSavedAt
        ? `Draft saved ${formatTime(lastSavedAt)}`
        : status === "dirty"
          ? "Unsaved changes"
          : status === "error"
            ? (errorMessage ?? "Save failed")
            : "Autosave on";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[11px]",
        status === "error" ? "text-destructive" : "text-muted-foreground",
      )}
      title={errorMessage ?? undefined}
    >
      {status === "saving" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : status === "error" ? (
        <CloudOff className="h-3 w-3" />
      ) : (
        <Cloud className="h-3 w-3" />
      )}
      <span>{label}</span>
    </div>
  );
}
