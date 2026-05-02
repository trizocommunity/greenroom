"use client";

import { Camera, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils/cn";

export type QuickAddFieldStatus = "idle" | "scanning" | "processing";

export interface QuickAddScanFormProps {
  manualInput: string;
  onManualInputChange: (value: string) => void;
  onManualSubmit: (e: React.FormEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenCamera: () => void;
  onOpenCameraFallback: () => void;
  showCameraFallback: boolean;
  fieldStatus: QuickAddFieldStatus;
}

export function QuickAddScanForm({
  manualInput,
  onManualInputChange,
  onManualSubmit,
  fileInputRef,
  onFileChange,
  onOpenCamera,
  onOpenCameraFallback,
  showCameraFallback,
  fieldStatus,
}: QuickAddScanFormProps) {
  const busy = fieldStatus === "processing" || fieldStatus === "scanning";

  return (
    <div className="space-y-2">
      <form
        onSubmit={onManualSubmit}
        className="flex gap-1.5"
        aria-label="Add by chest number"
      >
        <Input
          value={manualInput}
          onChange={(e) => onManualInputChange(e.target.value.toUpperCase())}
          placeholder="Chest #"
          autoComplete="off"
          disabled={busy}
          className="h-8 min-w-0 flex-1 font-mono text-xs sm:text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={busy || !manualInput.trim()}
          className="h-8 shrink-0 px-3"
        >
          Add
        </Button>
      </form>

      <div
        className="flex flex-wrap items-center gap-1.5"
        aria-label="QR from image or camera"
      >
        <label
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "h-8 cursor-pointer gap-1 px-2.5",
            fieldStatus === "processing" && "pointer-events-none opacity-50",
          )}
        >
          <Upload className="!h-3.5 !w-3.5 shrink-0" aria-hidden />
          <span className="text-xs">Photo</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={fieldStatus === "processing"}
            className="sr-only"
          />
        </label>

        {fieldStatus !== "scanning" ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2.5"
              onClick={onOpenCamera}
              disabled={fieldStatus === "processing"}
            >
              <Camera className="!h-3.5 !w-3.5" aria-hidden />
              <span className="text-xs">Camera</span>
            </Button>
            {showCameraFallback ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={onOpenCameraFallback}
                disabled={fieldStatus === "processing"}
              >
                Any camera
              </Button>
            ) : null}
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">Preview below</span>
        )}
      </div>
    </div>
  );
}
