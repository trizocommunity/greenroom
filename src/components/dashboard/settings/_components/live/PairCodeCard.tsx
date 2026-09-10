"use client";

import { Copy, Loader2, RefreshCw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

interface PairingData {
  token: string;
  code: string;
  url: string;
  expiresAt: string;
}

interface PairCodeCardProps {
  festivalId: string;
}

/**
 * Display-side pairing surface. Rendered inside the LaunchOverlay so it's
 * only meaningful once the operator is in the launch flow. Shows:
 *   - QR code (open the URL on the stage device)
 *   - 6-digit code (type-in fallback for tablets that struggle with QR)
 *   - The full URL (read-aloud or AirDrop-friendly)
 *   - Expiry countdown + rotate button
 *
 * Mint on first open, then re-mint when the operator hits "Rotate".
 * 30-minute TTL is generous for an event slot; rotating throws away the
 * old token so a leaked URL becomes inert.
 */
export function PairCodeCard({ festivalId }: PairCodeCardProps) {
  const [pairing, setPairing] = useState<PairingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mint = useCallback(
    async (rotate = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/v1/festivals/${encodeURIComponent(festivalId)}/launch-control/pair`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rotate }),
          },
        );
        if (!res.ok) {
          setError("Could not generate pairing. Refresh and try again.");
          return;
        }
        const json = (await res.json()) as {
          success: boolean;
          data?: PairingData;
        };
        if (!json.success || !json.data) {
          setError("Could not generate pairing.");
          return;
        }
        setPairing(json.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Network error generating pairing.",
        );
      } finally {
        setLoading(false);
      }
    },
    [festivalId],
  );

  useEffect(() => {
    void mint();
  }, [mint]);

  const copyUrl = useCallback(async () => {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(pairing.url);
      toast.success("Controller URL copied");
    } catch {
      toast.error("Couldn't copy. Select the URL manually.");
    }
  }, [pairing]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold">Stage controller</h4>
          <p className="text-xs text-muted-foreground">
            Open this URL on the device the guest will hold on stage. They
            press <kbd className="font-mono">Space</kbd> to launch the
            website on this display.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void mint(true)}
          disabled={loading}
          aria-label="Rotate pairing"
          className="h-8 shrink-0 gap-1.5"
        >
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Rotate
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {!pairing && loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Generating pairing…
        </div>
      )}

      {pairing && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <QrCodeDisplay url={pairing.url} size={140} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pairing code
              </p>
              <p className="font-mono text-2xl font-bold tracking-[0.2em] tabular-nums">
                {pairing.code}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                URL
              </p>
              <div className="flex items-center gap-1.5">
                <code className="block min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-[11px]">
                  {pairing.url}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void copyUrl()}
                  className="h-7 w-7 shrink-0 p-0"
                  aria-label="Copy URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <ExpiryCountdown expiresAt={pairing.expiresAt} />
          </div>
        </div>
      )}
    </div>
  );
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) {
    return (
      <p className="text-[10px] text-destructive">
        Expired — rotate to generate a fresh pairing.
      </p>
    );
  }
  const mins = Math.floor(ms / 60_000);
  return (
    <p className="text-[10px] text-muted-foreground">
      Expires in {mins} min
    </p>
  );
}