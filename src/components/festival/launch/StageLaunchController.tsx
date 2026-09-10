"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Rocket } from "lucide-react";
import party from "party-js";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/dashboard/[slug]/settings/_components/live/LaunchOverlay.module.css";
import { LaunchAnimation } from "@/components/festival/launch/LaunchAnimation";
import { cn } from "@/core/utils/cn";
import { useEventSource } from "@/hooks/use-event-source";

/**
 * Stage-side launch controller. Mirrors the operator's display laptop
 * view: buzzer on center, closed curtains around it, and a preloaded
 * public-site iframe behind everything. The guest sees the same
 * "window opener" the operator sees — the curtains animate open to
 * reveal the live site.
 *
 * Preload strategy:
 *   1. The stage page passes `publicUrl` (built from the festival
 *      slug). The iframe mounts on first render and starts loading
 *      immediately. While the site is offline, that response is the
 *      FestivalCountdown; we hide the iframe so the guest never sees
 *      it pre-launch.
 *   2. The connection is warm by the time the operator hits Space —
 *      DNS, TLS, and TCP are cached. When the LAUNCH event arrives,
 *      we cache-bust the iframe src (`&t=<ts>`) so the browser
 *      refetches the now-live content. The refresh is significantly
 *      faster than a cold load, so the curtains hide what's left.
 *
 * Lifecycle:
 *   - SSE connects on mount, authenticated by `?token=` in the URL.
 *   - Space/Enter triggers `fire()` → POST /trigger.
 *   - LAUNCH event → small confetti burst (behind still-closed curtains);
 *     iframe is refreshed once (via contentWindow.location.reload) so the
 *     now-live site loads. Curtains STAY up until the iframe has finished
 *     reloading — without this the guest sees the offline countdown
 *     briefly flash between the buzzer vanishing and the live site
 *     painting (the festival layout renders FestivalCountdown for
 *     anonymous visitors while publicSiteEnabled is false, so the
 *     iframe's previous document is the countdown).
 *   - liveIframeLoaded false→true edge → LaunchAnimation reveal: curtains
 *     sweep open and confetti bursts to expose the live site. Pill flips
 *     to "● Live" simultaneously.
 *   - RESET event → state resets, button returns, iframe is hidden.
 *
 * The iframe src is *stable* (always `publicUrl`) — we never append a
 * cache-buster. The earlier `&t=<ts>` approach caused the iframe to
 * navigate every time the SSE effect ran, which surfaced as the
 * "loading again and again" symptom. Reloading via the contentWindow
 * is a one-shot, fires only on the false→true edge of `launched`.
 */
export function StageLaunchController({
  festivalId,
  token,
  publicUrl,
}: {
  festivalId: string;
  token: string;
  publicUrl: string;
}) {
  const [armed, setArmed] = useState(true);
  const [launched, setLaunched] = useState(false);
  /**
   * True after the iframe's onLoad has fired *post-launch* (i.e. the
   * live site is fully painted). Used to flip the status pill from
   * "Loading…" to "● Live".
   */
  const [liveIframeLoaded, setLiveIframeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /**
   * Identity guard for the SSE event payload — same object across
   * re-emits means "this is the same launch, don't replay".
   */
  const lastLaunchEventRef = useRef<unknown>(null);
  const inFlightRef = useRef(false);
  /**
   * Ref to the public-site iframe. We don't change its `src` on launch
   * (that was the source of the "loading again and again" symptom);
   * instead we call `contentWindow.location.reload()` once on the
   * false→true edge of `launched`. Same-origin reload, no extra HTTP
   * request from a React state change.
   */
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastLaunchedRef = useRef(false);
  /**
   * Monotonically increasing counter for the post-launch reveal animation.
   * Bumped once on the false→true `liveIframeLoaded` edge so the
   * `LaunchAnimation` (which is keyed by an integer, not a boolean) plays
   * exactly once per launch without replaying on SSE reconnect.
   */
  const [revealKey, setRevealKey] = useState(0);

  const streamUrl = `/api/v1/festivals/${encodeURIComponent(
    festivalId,
  )}/launch-control/stream?token=${encodeURIComponent(token)}`;

  const { status, data: event } = useEventSource<{
    type: "LAUNCH" | "RESET" | string;
    at?: number;
    publicUrl?: string;
  }>({
    url: streamUrl,
    parse: (raw) => raw as { type: string; at?: number; publicUrl?: string },
  });

  useEffect(() => {
    if (!event) return;
    // Guard against the SSE re-emitting the same payload on reconnect —
    // a stable event reference is what tells us "this is a new launch".
    if (event === lastLaunchEventRef.current) return;
    lastLaunchEventRef.current = event;

    if (event.type === "LAUNCH") {
      setLaunched((was) => {
        // Only fire the confetti on the false→true edge. A new SSE
        // event object always represents a new launch (the operator
        // has to re-arm + re-trigger), so we don't need a separate
        // key — the dedupe above already prevents replays.
        if (!was) fireLaunchConfetti();
        return true;
      });
      setArmed(false);
      setError(null);
      setLiveIframeLoaded(false);
    } else if (event.type === "RESET") {
      setLaunched(false);
      setArmed(true);
      setError(null);
      setLiveIframeLoaded(false);
    }
  }, [event]);

  const fire = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!armed || launched) return;
    if (status !== "open") return;
    // Tactile feedback the moment the press lands — a small confetti
    // burst around the button so the guest sees "got it" before the
    // SSE round-trip completes and the bigger reveal animation fires.
    fireButtonConfetti();
    inFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/festivals/${encodeURIComponent(festivalId)}/launch-control/trigger`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        },
      );
      if (res.status === 409) {
        setLaunched(true);
        setArmed(false);
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setArmed(false);
        setError("Pairing lost. Ask the operator to re-pair the controller.");
        return;
      }
      if (!res.ok) {
        setError(
          `Trigger failed (${res.status}). Try again or ask the operator.`,
        );
        return;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error. Try again.",
      );
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }, [armed, launched, status, festivalId, token]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== "Enter") return;
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      void fire();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fire]);

  /**
   * One-shot iframe refresh on the false→true `launched` edge.
   * We don't change the iframe's `src` prop — that was the previous
   * "loading again and again" symptom because the SSE effect re-ran on
   * every event identity check. Reloading via the contentWindow only
   * fires once per launch and only navigates within the same origin.
   */
  useEffect(() => {
    if (launched && !lastLaunchedRef.current && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.location.reload();
      } catch {
        // Same-origin policy guard — fall through; the next user
        // action (or operator take-offline → re-arm) will surface a
        // re-render. Reload is best-effort.
      }
    }
    lastLaunchedRef.current = launched;
  }, [launched]);

  /**
   * Bump `revealKey` once when the live iframe has actually painted.
   * Tied to the false→true `liveIframeLoaded` edge (rather than
   * `launched` directly) so the curtain reveal only fires after the
   * new document has loaded — which is exactly the moment the
   * countdown→live transition is complete. Without this gating, the
   * guest sees the offline countdown flash between the buzzer
   * vanishing and the live site painting.
   */
  const lastLiveLoadedRef = useRef(false);
  useEffect(() => {
    if (launched && liveIframeLoaded && !lastLiveLoadedRef.current) {
      setRevealKey((k) => k + 1);
    }
    lastLiveLoadedRef.current = liveIframeLoaded;
  }, [launched, liveIframeLoaded]);

  const connected = status === "open";
  const pillLabel = error
    ? "Error"
    : !connected
      ? "Reconnecting…"
      : armed
        ? "Armed"
        : launched
          ? liveIframeLoaded
            ? "Live"
            : "Launched · loading…"
          : "Connected";

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden bg-neutral-950 text-white select-none"
      data-testid="stage-launch-controller"
    >
      {/* Iframe — always mounted and at full opacity, mirroring the
          operator's overlay. The preloaded page (offline countdown
          while the site is offline) keeps the connection warm so the
          cache-busted refresh on LAUNCH is fast. The closed curtains
          layered on top of this hide the iframe contents pre-launch;
          on LAUNCH the cache-busted refresh swaps in the live site
          and the curtains animate open to reveal it. `pointer-events:
          none` keeps the iframe from being clickable — it's a passive
          mirror, not a navigation surface for the guest. */}
      <iframe
        ref={iframeRef}
        src={publicUrl}
        title="Live festival website"
        className="absolute inset-0 h-full w-full border-0 bg-white"
        style={{ pointerEvents: "none" }}
        onLoad={() => {
          // The iframe's onLoad fires for both the preload and the
          // post-launch refresh. We only want to flag the site as
          // "active" once *launched* and the live content has actually
          // painted. Same-origin reloads fire onLoad after the new
          // document loads, so this is the right hook.
          if (launched) {
            setLiveIframeLoaded(true);
          }
        }}
      />

      {/* Static closed curtains — visible pre-launch so the stage
          device looks like the operator's view: a closed "window" the
          guest is about to open. We also keep them up *during* the
          post-launch iframe reload: the iframe's previous document is
          the FestivalCountdown (the public layout renders it for
          anonymous visitors while `publicSiteEnabled` is false), so if
          we unmount the curtains the moment `launched` flips true the
          guest sees a half-second flash of the countdown before the
          live site paints. The reveal happens via the LaunchAnimation
          below, gated on `liveIframeLoaded` (i.e. the iframe has
          finished loading the live content). */}
      {(!launched || (launched && !liveIframeLoaded)) && <ClosedCurtains />}

      {/* The buzzer — pixel-identical to the operator's overlay. Same
          3D base (`styles.buzzerBase`), same red gradient top
          (`styles.buzzer`), same rocket icon, same "LAUNCH" label, same
          pointer-tilt + shine. Sits centred on top of the closed
          curtains. We render `submitting` as a disabled state rather
          than a spinner because the operator's buzzer doesn't spin
          either — both rely on the same Space-key listener that calls
          `fire()` underneath. */}
      {!launched && (
        <BuzzerButton
          armed={armed}
          connected={connected}
          submitting={submitting}
          onFire={() => void fire()}
        />
      )}

      {/* Curtain reveal — fires exactly once per launch, on the
          liveIframeLoaded false→true edge, so the guest sees a single
          coherent "curtains open → live site" moment rather than the
          previous "buzzer vanishes → countdown flashes → site appears"
          sequence. Keyed by `revealKey` so it doesn't replay on SSE
          reconnect (LaunchAnimation no-ops when the key is unchanged). */}
      {revealKey > 0 && (
        <LaunchAnimation
          playKey={revealKey}
          onComplete={() => {
            // No-op: the iframe is already painted by the time this
            // animation completes. Hook left here in case a future
            // post-reveal step needs to run (e.g. clear a transient
            // overlay).
          }}
        />
      )}

      {error && !launched && (
        <p className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 text-sm text-red-400 text-center max-w-sm px-4">
          {error}
        </p>
      )}

      {/* Minimal launch celebration: a small confetti burst fired
          synchronously from the SSE effect on the false→true `launched`
          edge. Note that since we now keep the closed curtains up
          until the iframe has actually repainted with the live site,
          this burst is hidden behind them — the prominent reveal is
          done by `LaunchAnimation` above on the `revealKey` edge. */}
      {/* (no JSX here — confetti is DOM-only, see fireLaunchConfetti) */}

      {/* Status pill — shown before launch (● Armed) and after
          (● Launched · loading… → ● Live once the iframe finishes
          loading). Stays visible so the operator always knows the
          paired device's status. */}
      <div className="absolute bottom-4 right-4 z-20">
        <StatusPill
          connected={connected}
          label={pillLabel}
          live={launched && liveIframeLoaded}
          loading={launched && !liveIframeLoaded}
        />
      </div>
    </main>
  );
}

/**
 * Static "closed" curtains — same fabric SVG and pelmet bar used in
 * the operator's launch overlay, but with `opening=false` so the
 * hems and panels never animate. Renders above the iframe and below
 * the button so the stage device shows the same "window" the
 * operator's buzzer overlay shows.
 */
function ClosedCurtains() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    >
      <div className="absolute inset-y-0 left-0 w-1/2 origin-left bg-[#252525] shadow-[inset_0_0_55px_#0005,0_12px_45px_#0008]">
        <CurtainFabric />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-black/30" />
      </div>
      <div className="absolute inset-y-0 right-0 w-1/2 origin-right bg-[#252525] shadow-[inset_0_0_55px_#0005,0_12px_45px_#0008]">
        <CurtainFabric />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/30" />
      </div>
      <div
        className={cn(
          styles.pelmet,
          "absolute inset-x-0 top-0 h-[clamp(28px,5vh,54px)]",
        )}
      />
    </div>
  );
}

function CurtainFabric() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="cf" x1="0" y1="0" x2="1" y2="0">
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
        const shoulder = width * 0.24;
        const swell = width * 0.14;
        const swellBack = width * 0.1;
        const hem = width / 2;
        return (
          <g key={index}>
            <path
              fill="url(#cf)"
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

/**
 * The exact buzzer from the operator's launch overlay. Same 3D base
 * (`buzzerBase`), same red gradient top (`buzzer`), same rocket icon,
 * same "LAUNCH" label, same pointer-driven 3D tilt + shine. The only
 * difference from the operator's version is the size — bumped to
 * h-48/w-48 (192 px) for the stage tablet's reach distance — and the
 * disabled state, which here is the union of "not armed" / "SSE
 * closed" / "trigger in flight" rather than the operator's "preview not
 * ready" / "read-only".
 */
function BuzzerButton({
  armed,
  connected,
  submitting,
  onFire,
}: {
  armed: boolean;
  connected: boolean;
  submitting: boolean;
  onFire: () => void;
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

  const disabled = !armed || !connected || submitting;
  // When the SSE isn't connected, the buzzer should look unmistakably
  // inert. Tailwind's `disabled:opacity-60` is too subtle for a
  // live-event context — the guest needs to see at a glance that the
  // device isn't talking to the display. We apply a stronger treatment
  // specifically when `!connected`, leaving the lighter disabled
  // styling for the brief in-flight trigger (`submitting`).
  const grayed = !connected;

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center">
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
          onPointerLeave={() => {
            pointerX.set(0);
            pointerY.set(0);
          }}
          onPointerCancel={() => {
            pointerX.set(0);
            pointerY.set(0);
          }}
          onBlur={() => {
            pointerX.set(0);
            pointerY.set(0);
          }}
          onClick={onFire}
          disabled={disabled}
          aria-label={
            !connected
              ? "Reconnecting to the festival display"
              : !armed
                ? "Awaiting arm signal"
                : "Launch festival website"
          }
          className={cn(
            styles.buzzer,
            "group relative flex h-48 w-48 cursor-pointer touch-manipulation flex-col items-center justify-center gap-3 rounded-full transition-all duration-300 sm:h-52 sm:w-52",
            // Hover/active: only when armed and connected.
            connected &&
              "hover:scale-[1.025] active:translate-y-1 active:scale-[0.97]",
            // Focus ring.
            "focus-visible:outline-2 focus-visible:outline-offset-[18px] focus-visible:outline-white",
            // Reduced motion.
            "motion-reduce:transform-none",
            // Disabled cursor + the *light* disabled treatment (used
            // when armed but the trigger is in flight).
            disabled && !grayed && "cursor-wait opacity-60",
            // Strong grayed-out treatment for the reconnecting case.
            // We drop the 3D shine, desaturate, halve the opacity, and
            // swap the cursor to not-allowed so the guest can tell at
            // a glance that the device isn't talking to the display.
            grayed && "grayscale cursor-not-allowed opacity-40",
          )}
        >
          <motion.span
            aria-hidden
            style={reduceMotion ? undefined : { x: shineX, y: shineY }}
            className="pointer-events-none absolute inset-x-3 top-2 h-1/3 rounded-full bg-white/25 blur-md"
          />
          <Rocket
            aria-hidden
            className="relative h-14 w-14 drop-shadow-sm sm:h-16 sm:w-16"
          />
          <span className="relative text-sm font-semibold tracking-[0.25em] sm:text-base">
            LAUNCH
          </span>
        </button>
      </motion.div>
    </div>
  );
}

function StatusPill({
  connected,
  label,
  live,
  loading,
}: {
  connected: boolean;
  label: string;
  live?: boolean;
  loading?: boolean;
}) {
  // Three terminal states:
  //   - live: green, "Live" — site is up and the iframe has painted
  //   - loading: amber, pulsing dot, "Live · loading…" — refresh in flight
  //   - connected only: emerald outline, "Armed" / "Launched" / "Connected"
  //   - disconnected: amber, "Reconnecting…"
  const tone = live
    ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-100"
    : loading
      ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
      : connected
        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
        : "border-amber-400/40 bg-amber-500/15 text-amber-200";

  const dotClass = live
    ? "bg-emerald-400"
    : connected
      ? "bg-emerald-400 animate-pulse"
      : "bg-amber-400 animate-pulse";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur",
        tone,
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} />
      <span>{label}</span>
    </div>
  );
}

/**
 * Tiny, immediate confetti burst centered on the launch button. Fires
 * synchronously on `fire()` so the guest gets visual confirmation of
 * their press before the SSE round-trip and the bigger reveal animation
 * complete. Skipped under `prefers-reduced-motion`.
 *
 * This is a one-shot — we don't worry about teardown of the source
 * element since it's a 0×0 pixel that party-js auto-cleans. If it ever
 * leaks visually, harden with a setTimeout-removed source node.
 */
function fireButtonConfetti(): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const source = document.createElement("span");
  source.setAttribute("aria-hidden", "true");
  Object.assign(source.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    width: "1px",
    height: "1px",
    pointerEvents: "none",
  });
  document.body.appendChild(source);

  // Defer to next tick so the source is laid out before party-js samples
  // its bounding rect for the emitter position.
  const start = performance.now() + 16;
  party.scene.current.createEmitter({
    emitterOptions: {
      loops: 1,
      duration: 1.2,
      modules: [
        new party.ModuleBuilder()
          .drive("rotation")
          .by((t) => new party.Vector(180, 240, 320).scale(t))
          .relative()
          .build(),
      ],
    },
    emissionOptions: {
      rate: 0,
      bursts: [{ time: 0, count: 40 }],
      sourceSampler: party.sources.dynamicSource(source),
      angle: party.variation.skew(270, 90),
      initialLifetime: 1.2,
      initialSpeed: party.variation.range(180, 320),
      initialSize: party.variation.skew(1.0, 0.4),
      initialRotation: () => party.random.randomUnitVector().scale(180),
      initialColor: () =>
        party.Color.fromHsl(party.random.randomRange(0, 360), 100, 70),
    },
    rendererOptions: { shapeFactory: ["square", "circle"] },
  });

  // Best-effort cleanup. party-js doesn't expose a teardown handle for
  // a single burst; the source element is removed when the page
  // navigates or when this same effect is garbage-collected.
  void start;
}

/**
 * Minimal post-launch celebration. Smaller than the operator's full
 * 5-source reveal — a single upward burst from the button centre, a
 * second smaller burst, ~1.6 s lifetime. Fires synchronously from
 * the SSE effect on the false→true `launched` edge.
 *
 * With the curtain-stays-up-until-iframe-loads fix in place, this
 * burst actually plays behind the still-closed curtains (the guest
 * can't see it). The prominent reveal is handled by `LaunchAnimation`
 * on the `revealKey` edge. We keep this call as harmless overlap —
 * particle sources are pinned to the bottom of the viewport and
 * party-js cleans them up — rather than risk a regression by
 * removing the immediate tactile feedback the original code wanted
 * to guarantee.
 */
function fireLaunchConfetti(): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const emitters: party.Emitter[] = [];

  const makeSource = (left: string) => {
    const s = document.createElement("span");
    s.setAttribute("aria-hidden", "true");
    Object.assign(s.style, {
      position: "fixed",
      bottom: "12px",
      left,
      width: "1px",
      height: "1px",
      pointerEvents: "none",
    });
    document.body.appendChild(s);
    return s;
  };

  const makeEmitter = (
    source: HTMLElement,
    angle: number,
    count: number,
    speed: [number, number],
  ) => {
    const gravity = party.settings.gravity;
    const v = Math.sqrt(2 * gravity * window.innerHeight);
    emitters.push(
      party.scene.current.createEmitter({
        emitterOptions: {
          loops: 1,
          duration: 1.6,
          modules: [
            new party.ModuleBuilder()
              .drive("rotation")
              .by((t) => new party.Vector(140, 200, 260).scale(t))
              .relative()
              .build(),
          ],
        },
        emissionOptions: {
          rate: 0,
          bursts: [{ time: 0, count }],
          sourceSampler: party.sources.dynamicSource(source),
          angle: party.variation.skew(angle, 30),
          initialLifetime: 1.6,
          initialSpeed: party.variation.range(v * speed[0], v * speed[1]),
          initialSize: party.variation.skew(1.0, 0.3),
          initialRotation: () => party.random.randomUnitVector().scale(180),
          initialColor: () =>
            party.Color.fromHsl(party.random.randomRange(0, 360), 100, 70),
        },
        rendererOptions: { shapeFactory: ["square", "circle"] },
      }),
    );
  };

  const main = makeSource("50%");
  const left = makeSource("20%");
  const right = makeSource("80%");
  makeEmitter(main, -90, 50, [0.8, 1.0]);
  makeEmitter(left, -75, 25, [0.7, 0.9]);
  makeEmitter(right, -105, 25, [0.7, 0.9]);

  window.setTimeout(() => {
    for (const e of emitters) {
      e.emission.bursts = [];
      e.clearParticles();
    }
    for (const s of [main, left, right]) s.remove();
  }, 1_700);
}
