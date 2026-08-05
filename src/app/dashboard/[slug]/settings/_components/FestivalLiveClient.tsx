"use client";

import { ExternalLink, Power, Rocket } from "lucide-react";
import party from "party-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/core/utils/cn";
import { setPublicSiteEnabledAction } from "@/features/festivals/actions/festival-crud.actions";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { toast } from "@/lib/toast";

interface FestivalLiveClientProps {
  festivalId: string;
  festivalSlug: string;
  publicSiteEnabled: boolean;
  publicUrl: string;
  onExit: () => void;
}

type Phase = "buzzer" | "launching" | "live" | "taking-offline";

export function FestivalLiveClient({
  festivalId,
  festivalSlug,
  publicSiteEnabled,
  publicUrl,
  onExit,
}: FestivalLiveClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const [enabled, setEnabled] = useState(publicSiteEnabled);
  const [phase, setPhase] = useState<Phase>(
    publicSiteEnabled ? "live" : "buzzer",
  );
  const [iframeReady, setIframeReady] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (phase === "live" || phase === "buzzer")) {
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onExit]);

  const fireConfetti = useCallback(() => {
    const burst = (count: number, speed: number) =>
      party.confetti(document.body, { count, size: 2, speed, spread: 360 });
    burst(120, 14);
    setTimeout(() => burst(80, 11), 250);
    setTimeout(() => burst(50, 8), 600);
  }, []);

  const handleLaunch = async () => {
    if (isReadOnly) return;
    setPhase("launching");
    try {
      const result = await setPublicSiteEnabledAction(festivalId, true);
      if (result?.success) {
        setEnabled(true);
        setPhase("live");
        fireConfetti();
      } else {
        setPhase("buzzer");
        const msg =
          result && "error" in result && typeof result.error === "string"
            ? result.error
            : "Failed to launch.";
        toast.error(msg);
      }
    } catch {
      setPhase("buzzer");
      toast.error("Failed to launch.");
    }
  };

  const handleTakeOffline = async () => {
    if (isReadOnly) return;
    setPhase("taking-offline");
    try {
      const result = await setPublicSiteEnabledAction(festivalId, false);
      if (result?.success) {
        setEnabled(false);
        setIframeReady(false);
        setPhase("buzzer");
        toast.success("Website is now offline.");
      } else {
        setPhase("live");
        toast.error("Failed to take offline.");
      }
    } catch {
      setPhase("live");
      toast.error("Failed to take offline.");
    }
  };

  const fullPublicUrl = publicUrl || `/${festivalSlug}`;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 bg-background">
      {(phase === "buzzer" || phase === "launching") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Launch Your Website
            </h1>
            <p className="text-muted-foreground text-sm">
              Press the button to go live instantly
            </p>
          </div>

          <button
            type="button"
            onClick={handleLaunch}
            disabled={phase === "launching" || isReadOnly}
            className={cn(
              "group relative flex items-center justify-center rounded-full outline-none transition-transform duration-200 active:scale-90",
              "w-48 h-48 sm:w-56 sm:h-56",
              phase === "launching"
                ? "cursor-wait"
                : "cursor-pointer hover:scale-105",
            )}
          >
            <span className="absolute inset-0 rounded-full bg-primary/10 group-hover:bg-primary/15 transition-colors duration-200" />
            <span
              className={cn(
                "absolute inset-0 rounded-full border-[3px] border-primary/40 group-hover:border-primary/60 transition-colors duration-200",
                phase === "buzzer" && "animate-pulse",
              )}
            />
            <span className="absolute inset-3 rounded-full border border-primary/20" />
            <span className="absolute inset-6 rounded-full bg-primary/5" />

            <div className="relative flex flex-col items-center gap-3 text-primary">
              <Rocket
                className={cn(
                  "h-14 w-14 sm:h-16 sm:w-16 transition-transform duration-300",
                  phase === "launching" && "animate-bounce -rotate-12",
                )}
              />
              <span className="text-base font-bold uppercase tracking-widest">
                {phase === "launching" ? "Launching..." : "Launch"}
              </span>
            </div>
          </button>

          <p className="text-xs text-muted-foreground/60">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">
              Esc
            </kbd>{" "}
            to go back
          </p>
        </div>
      )}

      {(phase === "live" || phase === "taking-offline") && (
        <>
          {!iframeReady && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          <iframe
            src={`/${festivalSlug}`}
            className="w-full h-full"
            title="Festival website preview"
            onLoad={() => setIframeReady(true)}
          />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-md border shadow-lg px-2 py-1.5">
            <span className="flex items-center gap-2 px-3 text-sm font-mono text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="hidden sm:inline truncate max-w-[200px]">
                {fullPublicUrl}
              </span>
              <span className="sm:hidden">Live</span>
            </span>
            <a
              href={`/${festivalSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
            <button
              type="button"
              onClick={handleTakeOffline}
              disabled={phase === "taking-offline"}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors",
                phase === "taking-offline" && "opacity-50 cursor-wait",
              )}
            >
              <Power className="h-3.5 w-3.5" />
              {phase === "taking-offline" ? "Stopping..." : "Take Offline"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
