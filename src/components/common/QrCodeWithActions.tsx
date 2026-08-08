"use client";

import { Download, Link as LinkIcon, Share2 } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { QrCodeDisplay, type QrCodeDisplayProps } from "./QrCodeDisplay";

export interface QrCodeWithActionsProps extends QrCodeDisplayProps {
  /** Label for download button (default: "Download") */
  downloadLabel?: string;
  /** Label for share button (default: "Share") */
  shareLabel?: string;
  /** Show download button */
  showDownload?: boolean;
  /** Show WhatsApp share button */
  showShare?: boolean;
  /** File name for download (default: "qr-code.png") */
  fileName?: string;
  /** Custom message for WhatsApp share (default: uses chest number) */
  shareMessage?: string;
  /** Size variant: "sm" | "md" | "lg" (default: "md") */
  sizeVariant?: "sm" | "md" | "lg";
  /** QR code content (chest number for reporting) */
  qrContent?: string;
}

export function QrCodeWithActions({
  url,
  size = 200,
  downloadLabel = "Download",
  shareLabel = "Share",
  showDownload = true,
  showShare = true,
  fileName = "qr-code.png",
  shareMessage,
  sizeVariant = "md",
  qrContent,
  ...qrProps
}: QrCodeWithActionsProps) {
  // Share via WhatsApp
  const handleShare = useCallback(() => {
    try {
      const message = shareMessage || `My chest number: ${qrContent || url}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
      toast.success("Opening WhatsApp...");
    } catch (error) {
      console.error("Share failed:", error);
      toast.error("Failed to share");
    }
  }, [url, qrContent, shareMessage]);

  // Download QR as PNG
  const handleDownload = useCallback(() => {
    try {
      // Find the canvas element with QR code
      const canvas = document.querySelector("canvas");
      if (!canvas) {
        toast.error("QR code not found. Please try again.");
        return;
      }

      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("QR code downloaded!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download QR code");
    }
  }, [fileName]);

  // Copy link to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Failed to copy link");
    }
  }, [url]);

  // Size variants
  const sizeClasses = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6",
  };

  const buttonSizeClasses = {
    sm: "h-8 text-xs gap-1.5",
    md: "h-9 text-sm gap-2",
    lg: "h-10 text-base gap-2.5",
  };

  return (
    <div className={`flex flex-col items-center ${sizeClasses[sizeVariant]}`}>
      {/* QR Code */}
      <div className="mb-4">
        <QrCodeDisplay url={qrContent || url} size={size} {...qrProps} />
      </div>

      {/* Action Buttons */}
      <div
        className={`flex flex-wrap items-center justify-center gap-2 w-full ${buttonSizeClasses[sizeVariant]}`}
      >
        {showDownload && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="shrink-0"
            aria-label={downloadLabel}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{downloadLabel}</span>
          </Button>
        )}

        {showShare && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="shrink-0"
            aria-label={shareLabel}
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{shareLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
