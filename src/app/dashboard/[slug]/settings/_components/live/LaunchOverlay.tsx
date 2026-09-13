"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ExternalLink, Rocket } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/core/utils/cn";
import { useEventSource } from "@/hooks/use-event-source";
import styles from "./LaunchOverlay.module.css";

/** Fullscreen surface that doubles as the launch buzzer (offline) and the
 * live preview (live). The same iframe is mounted either way — the buzzer
 * just covers it — so going live is an instant reveal with no second
 * navigation or blank frame. */
export function LaunchOverlay({
  open,
  isLive,
  previewPath,
  previewReady,
  justLaunched,
  publicUrl,
  isReadOnly,
  festivalId,
  onPreviewReady,
  onClose,
  onLaunch,
  onRevealComplete,
}: {
  open: boolean;
  isLive: boolean;
  previewPath: string;
  previewReady: boolean;
  justLaunched: boolean;
  publicUrl: string;
  isReadOnly: boolean;
  festivalId?: string;
  onPreviewReady: () => void;
  onClose: () => void;
  /**
   * Trigger the local launch choreography. `initiatedBy="operator"` is
   * the default — used when the operator clicks the buzzer / presses
   * Space. `initiatedBy="remote"` is used by the SSE subscriber so the
   * parent can apply the post-take-offline cooldown only to remote
   * triggers (operator clicks always pass through).
   */
  onLaunch: (opts?: {
    initiatedBy?: "operator" | "remote";
  }) => Promise<void> | void;
  onRevealComplete: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Listen for LAUNCH events from a paired stage controller. Auth uses the
  // admin session cookie (this tab is already authenticated), so no token
  // is required on this end. The channel is no-op when no stage controller
  // has been paired — the existing local Space/click path stays primary.
  const { data: launchEvent } = useEventSource<{
    type: "LAUNCH" | "RESET" | string;
    at?: number;
  }>({
    url:
      open && festivalId
        ? `/api/v1/festivals/${encodeURIComponent(
            festivalId,
          )}/launch-control/stream`
        : "",
    withCredentials: true,
    parse: (raw) => raw as { type: string; at?: number },
  });

  // When a paired stage controller fires, run the same local launch
  // choreography the dashboard button would. The server already SETNX'd
  // the duplicate-guard, so a network retry between this device and the
  // server can't double-fire `setPublicSiteEnabledAction`. We pass
  // `initiatedBy: "remote"` so the parent's post-take-offline cooldown
  // can ignore stale events without blocking real operator clicks.
  useEffect(() => {
    if (!launchEvent) return;
    if (launchEvent.type === "LAUNCH" && !isLive && !isReadOnly) {
      void onLaunch({ initiatedBy: "remote" });
    }
  }, [launchEvent, isLive, isReadOnly, onLaunch]);

  // Esc closes the overlay; Space launches the buzzer while it's showing and
  // the preview is ready. Body scroll is locked while the overlay is open so
  // the page doesn't bleed through.
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Honour Space even when the button isn't focused (e.g. focus drifted
      // to the iframe during a pointer interaction). preventDefault stops the
      // default page-scroll behaviour and also suppresses the button's own
      // native Space-click so we don't double-fire onLaunch.
      if (e.code === "Space" && !isLive && previewReady && !isReadOnly) {
        e.preventDefault();
        void onLaunch();
      }
    },
    [onClose, isLive, previewReady, isReadOnly, onLaunch],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleKey]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] bg-background",
        open
          ? "visible opacity-100"
          : "invisible pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
      inert={!open}
      role="dialog"
      aria-modal={open || undefined}
      aria-label="Festival website launch"
    >
      <iframe
        src={`${previewPath}?preview=1`}
        className="absolute inset-0 h-full w-full"
        title="Festival website preview"
        tabIndex={open && isLive ? 0 : -1}
        inert={!open || !isLive}
        onLoad={onPreviewReady}
      />
      {isLive ? (
        <LiveOverlay
          justLaunched={justLaunched}
          previewReady={previewReady}
          publicUrl={publicUrl}
          onClose={onClose}
          onRevealComplete={onRevealComplete}
        />
      ) : (
        <BuzzerOverlay
          open={open}
          previewReady={previewReady}
          isReadOnly={isReadOnly}
          onLaunch={onLaunch}
        />
      )}
    </div>,
    document.body,
  );
}

function LiveOverlay({
  justLaunched,
  previewReady,
  publicUrl,
  onClose,
  onRevealComplete,
}: {
  justLaunched: boolean;
  previewReady: boolean;
  publicUrl: string;
  onClose: () => void;
  onRevealComplete: () => void;
}) {
  const [revealed, setRevealed] = useState(!justLaunched);
  const reduceMotion = useReducedMotion();

  return (
    <>
      {justLaunched && !revealed && (
        <OpeningCurtains
          onComplete={() => {
            setRevealed(true);
            onRevealComplete();
          }}
        />
      )}
      {!previewReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-background">
          <div
            aria-hidden
            className="pointer-events-none absolute h-[38rem] w-[38rem] rounded-full bg-primary/10 blur-3xl"
          />
          <span className="relative flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
            <span
              aria-hidden
              className="pointer-events-none absolute h-full w-full rounded-full bg-primary/15 animate-ping"
            />
            <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-[0_18px_40px_-12px_var(--primary)] ring-1 ring-white/20">
              <Rocket className="h-11 w-11 sm:h-14 sm:w-14" />
            </span>
          </span>
        </div>
      )}
      {(!justLaunched || revealed) && (
        <motion.div
          initial={
            justLaunched && !reduceMotion ? { opacity: 0, y: 16 } : false
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="absolute inset-x-3 bottom-4 z-20 flex max-w-lg mx-auto items-center gap-1 rounded-full border bg-background/90 px-1.5 py-1.5 shadow-lg backdrop-blur sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:px-2"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 px-2 text-sm font-mono text-muted-foreground sm:px-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse" />
            <span className="truncate">{publicUrl}</span>
          </span>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            Close
          </button>
        </motion.div>
      )}
    </>
  );
}

/** Broad satin folds with curved tops, sides and hems, like hanging fabric. */
function CurtainFabric() {
  const foldGradient = useId();

  return (
    <svg
      aria-hidden
      className={styles.fabric}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={foldGradient} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="12%" stopColor="#303030" />
          <stop offset="28%" stopColor="#535353" />
          <stop offset="40%" stopColor="#707070" />
          <stop offset="49%" stopColor="#656565" />
          <stop offset="63%" stopColor="#424242" />
          <stop offset="80%" stopColor="#292929" />
          <stop offset="100%" stopColor="#1c1c1c" />
        </linearGradient>
      </defs>
      {Array.from({ length: 14 }, (_, index) => {
        const width = 100 / 14;
        const left = index * width;
        const right = left + width;
        const mid = left + width / 2;
        // Bezier control offsets are scaled to the fold width so each fold
        // keeps the same visual curvature as the original 8-fold layout.
        const shoulder = width * 0.24;
        const swell = width * 0.14;
        const swellBack = width * 0.1;
        const hem = width / 2;
        return (
          <g key={index}>
            <path
              fill={`url(#${foldGradient})`}
              d={`M ${left} 1.2
                C ${left + shoulder} -0.4 ${right - shoulder} -0.4 ${right} 1.2
                C ${right - swell} 30 ${right + swellBack} 68 ${right} 99
                Q ${left + hem} 101 ${left} 99
                C ${left - swellBack} 68 ${left + swell} 30 ${left} 1.2 Z`}
            />
            <line
              x1={mid}
              y1="0"
              x2={mid}
              y2="100"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.35"
            />
          </g>
        );
      })}
    </svg>
  );
}

/** The hems draw aside first, then the gathered panels clear the whole site. */
function OpeningCurtains({
  opening = true,
  onComplete,
}: {
  opening?: boolean;
  onComplete?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0.001 : 3.2;
  const transition = {
    duration,
    times: [0, 0.6, 1],
    ease: [0.65, 0, 0.25, 1] as const,
  };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      {(["left", "right"] as const).map((side) => {
        const outerEdge = side === "left" ? 0 : 100;
        const innerEdge = side === "left" ? 100 : 0;
        // Matching polygon vertices let the lower hem sweep into a curved
        // opening while the top stays joined at the centre.
        const edge = Array.from({ length: 61 }, (_, index) => {
          const y = (index / 60) * 100;
          const pull = 82 * (y / 100) ** 2;
          return {
            closed: `${innerEdge}% ${y}%`,
            gathered: `${side === "left" ? 100 - pull : pull}% ${y}%`,
          };
        });
        const closed = `polygon(${outerEdge}% 0%, ${edge.map((point) => point.closed).join(", ")}, ${outerEdge}% 100%)`;
        const gathered = `polygon(${outerEdge}% 0%, ${edge.map((point) => point.gathered).join(", ")}, ${outerEdge}% 100%)`;

        return (
          <motion.div
            key={side}
            className={cn(
              styles.curtain,
              "absolute inset-y-0 w-[50.2%]",
              side === "left" ? "left-0 origin-left" : "right-0 origin-right",
            )}
            initial={{ x: "0%", scaleX: 1, clipPath: closed }}
            animate={
              opening
                ? {
                    x: ["0%", "0%", side === "left" ? "-102%" : "102%"],
                    scaleX: [1, 1, 0.3],
                    clipPath: [closed, gathered, gathered],
                  }
                : { x: "0%", scaleX: 1, clipPath: closed }
            }
            transition={transition}
            onAnimationComplete={
              opening && side === "right" ? onComplete : undefined
            }
          >
            <CurtainFabric />
            <div
              className={cn(
                styles.seam,
                side === "left" ? "right-0" : "left-0",
              )}
            />
          </motion.div>
        );
      })}
      <motion.div
        className={styles.pelmet}
        initial={{ y: "0%" }}
        animate={{ y: opening ? "-110%" : "0%" }}
        transition={{
          duration: duration * 0.4,
          delay: opening ? duration * 0.6 : 0,
          ease: transition.ease,
        }}
      />
    </div>
  );
}

function BuzzerOverlay({
  open,
  previewReady,
  isReadOnly,
  onLaunch,
}: {
  open: boolean;
  previewReady: boolean;
  isReadOnly: boolean;
  onLaunch: () => Promise<void> | void;
}) {
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 240, damping: 22 });
  const springY = useSpring(pointerY, { stiffness: 240, damping: 22 });
  const rotateX = useTransform(springY, [-1, 1], [9, -9]);
  const rotateY = useTransform(springX, [-1, 1], [-9, 9]);
  const shineX = useTransform(springX, [-1, 1], [-12, 12]);
  const shineY = useTransform(springY, [-1, 1], [-8, 8]);

  useEffect(() => {
    if (!open || !previewReady || isReadOnly) return;
    const previousFocus = document.activeElement;
    buttonRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement)
        previousFocus.focus({ preventScroll: true });
    };
  }, [open, previewReady, isReadOnly]);

  const resetTilt = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden">
      <OpeningCurtains opening={false} />
      <motion.div
        className={cn(styles.buzzerBase, "relative z-40 rounded-full")}
        style={
          reduceMotion
            ? undefined
            : { rotateX, rotateY, transformPerspective: 650 }
        }
      >
        <button
          ref={buttonRef}
          type="button"
          onPointerMove={(event) => {
            if (reduceMotion || event.pointerType !== "mouse") return;
            const bounds = event.currentTarget.getBoundingClientRect();
            pointerX.set(
              Math.max(
                -1,
                Math.min(
                  1,
                  ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
                ),
              ),
            );
            pointerY.set(
              Math.max(
                -1,
                Math.min(
                  1,
                  ((event.clientY - bounds.top) / bounds.height) * 2 - 1,
                ),
              ),
            );
          }}
          onPointerLeave={resetTilt}
          onPointerCancel={resetTilt}
          onBlur={resetTilt}
          onClick={() => void onLaunch()}
          disabled={isReadOnly || !previewReady}
          aria-label={
            previewReady
              ? "Launch festival website"
              : "Preparing festival website preview"
          }
          className={cn(
            styles.buzzer,
            "group relative flex h-36 w-36 cursor-pointer touch-manipulation flex-col items-center justify-center gap-3 rounded-full transition-transform duration-150 hover:scale-[1.025] active:translate-y-1 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-[18px] focus-visible:outline-white disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none sm:h-44 sm:w-44",
          )}
        >
          <motion.span
            aria-hidden
            style={reduceMotion ? undefined : { x: shineX, y: shineY }}
            className="pointer-events-none absolute inset-x-3 top-2 h-1/3 rounded-full bg-white/25 blur-md"
          />
          <Rocket
            aria-hidden
            className="relative h-11 w-11 drop-shadow-sm sm:h-14 sm:w-14"
          />
          <span className="relative text-xs font-semibold tracking-[0.25em] sm:text-sm">
            LAUNCH
          </span>
        </button>
      </motion.div>
      {(isReadOnly || !previewReady) && (
        <output
          className={cn(
            styles.prompt,
            "pointer-events-none absolute inset-x-4 top-[calc(50%+8rem)] z-40 text-center text-[10px] font-medium uppercase tracking-[0.3em] sm:top-[calc(50%+9.5rem)] sm:text-xs",
          )}
        >
          {isReadOnly
            ? "Launch unavailable in read-only mode"
            : "Preparing your website…"}
        </output>
      )}
    </div>
  );
}
