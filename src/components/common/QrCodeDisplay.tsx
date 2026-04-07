"use client";

import { Eye } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const QR_OPTIONS = {
  margin: 1,
  color: { dark: "#000000", light: "#ffffff" },
} as const;

export interface QrCodeDisplayProps {
  /** URL or text to encode in the QR code */
  url: string;
  /** Size in pixels (default 120) */
  size?: number;
  /** Show a "View" icon button that opens a dialog with larger QR and optional link */
  showViewButton?: boolean;
  /** When View is clicked, open this URL (e.g. student profile page). Shown in dialog. */
  viewHref?: string;
  /** Label for the view action (e.g. "Open student page") */
  viewLabel?: string;
  /** Highlight the view button (primary styling) */
  highlightViewButton?: boolean;
  /** When true and showViewButton is true, only render the button; QR is shown in modal on click */
  buttonOnly?: boolean;
  /** Optional click handler on the QR (e.g. open dialog) */
  onQrClick?: () => void;
  className?: string;
}

export function QrCodeDisplay({
  url,
  size = 120,
  showViewButton = false,
  viewHref,
  viewLabel = "Open link",
  highlightViewButton = false,
  buttonOnly = false,
  onQrClick,
  className = "",
}: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (buttonOnly && showViewButton) return;
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      ...QR_OPTIONS,
    })
      .then(() => setLoaded(true))
      .catch(() => setLoaded(false));
  }, [url, size, buttonOnly, showViewButton]);

  const canvasEl = (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block rounded"
      style={{ display: loaded ? "block" : "none" }}
      aria-hidden
    />
  );

  const wrapper = onQrClick ? (
    <button
      type="button"
      onClick={onQrClick}
      className="cursor-pointer rounded border border-border bg-white p-0.5 transition hover:border-primary/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label="View QR code"
    >
      {canvasEl}
    </button>
  ) : (
    <div className="rounded border border-border bg-white p-0.5">
      {canvasEl}
    </div>
  );

  const showCanvas = !buttonOnly || !showViewButton;

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        {showCanvas && wrapper}
        {showViewButton && (
          <Button
            type="button"
            variant={highlightViewButton ? "default" : "outline"}
            size="sm"
            className={
              highlightViewButton
                ? "h-9 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 px-3"
                : "h-9 shrink-0 gap-1.5 px-3"
            }
            onClick={() => setDialogOpen(true)}
            aria-label="Show QR code"
          >
            <Eye className="h-4 w-4" />
            {buttonOnly ? "Show QR" : null}
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border bg-white p-4">
              <QrCodeDisplayInner url={url} size={200} />
            </div>
            {viewHref && (
              <Button asChild variant="default" className="w-full">
                <a href={viewHref} target="_blank" rel="noopener noreferrer">
                  {viewLabel}
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Inner component that only renders the canvas (used in dialog to avoid duplicate effect). */
function QrCodeDisplayInner({ url, size }: { url: string; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      ...QR_OPTIONS,
    })
      .then(() => setLoaded(true))
      .catch(() => setLoaded(false));
  }, [url, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block rounded"
      style={{ display: loaded ? "block" : "none" }}
      aria-hidden
    />
  );
}
