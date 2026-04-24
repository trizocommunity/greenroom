"use client";

import { useCallback } from "react";
import { toast } from "sonner";

interface UseQrActionsOptions {
  /** URL encoded in QR code */
  url: string;
  /** File name for download (default: "qr-code.png") */
  fileName?: string;
  /** Custom message for WhatsApp share */
  shareMessage?: string;
  /** Callback when download succeeds */
  onDownloadSuccess?: () => void;
  /** Callback when share is triggered */
  onShareSuccess?: () => void;
  /** Callback when link is copied */
  onCopySuccess?: () => void;
}

export function useQrActions({
  url,
  fileName = "qr-code.png",
  shareMessage,
  onDownloadSuccess,
  onShareSuccess,
  onCopySuccess,
}: UseQrActionsOptions) {
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
      onDownloadSuccess?.();
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download QR code");
    }
  }, [fileName, onDownloadSuccess]);

  // Share via WhatsApp
  const handleShare = useCallback(() => {
    try {
      const message = shareMessage || `Check out my festival profile: ${url}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");

      toast.success("Opening WhatsApp...");
      onShareSuccess?.();
    } catch (error) {
      console.error("Share failed:", error);
      toast.error("Failed to share");
    }
  }, [url, shareMessage, onShareSuccess]);

  // Copy link to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
      onCopySuccess?.();
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Failed to copy link");
    }
  }, [url, onCopySuccess]);

  // Share to other platforms (generic share API)
  const handleNativeShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Festival Profile",
          text: `Check out my festival profile!`,
          url: url,
        });
        toast.success("Shared successfully!");
        onShareSuccess?.();
      } else {
        // Fallback to copy
        handleCopy();
      }
    } catch (error) {
      if ((error as any).name !== "AbortError") {
        console.error("Native share failed:", error);
        toast.error("Failed to share");
      }
    }
  }, [url, handleCopy, onShareSuccess]);

  return {
    download: handleDownload,
    share: handleShare,
    copy: handleCopy,
    nativeShare: handleNativeShare,
  };
}
