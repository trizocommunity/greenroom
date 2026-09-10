"use client";

import { motion, useReducedMotion } from "framer-motion";
import party from "party-js";
import { useEffect, useId, useRef } from "react";

import styles from "@/app/dashboard/[slug]/settings/_components/live/LaunchOverlay.module.css";

/**
 * The launch reveal: curtain sweep + confetti burst. Shared by the
 * operator's `LaunchOverlay` and the stage device's mirror so both
 * surfaces render the same animation when a launch fires.
 *
 * `playKey` is an integer that increments to fire. Tying the animation
 * to a key — not a boolean — makes it cheap to gate on the SSE
 * transition into LAUNCH without re-firing on reconnect: a stable
 * `launched` boolean would replay the animation every time the SSE
 * resubscribes and re-emits the same payload.
 *
 * On `prefers-reduced-motion: reduce`, the animation is collapsed:
 * curtains skip the sweep (held open), confetti is skipped entirely.
 */
export function LaunchAnimation({
  playKey,
  onComplete,
}: {
  playKey: number;
  onComplete?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const completedRef = useRef<number | null>(null);

  useEffect(() => {
    // Skip the effect on mount and any key that has already played.
    if (playKey <= 0) return;
    if (completedRef.current === playKey) return;
    completedRef.current = playKey;

    if (reduceMotion) {
      onComplete?.();
      return;
    }

    const cleanup = fireConfetti();
    const t = window.setTimeout(() => {
      cleanup();
      onComplete?.();
    }, 3_400);
    return () => {
      window.clearTimeout(t);
      cleanup();
    };
  }, [playKey, reduceMotion, onComplete]);

  const opening = true;
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

function fireConfetti(): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }

  const emitters: party.Emitter[] = [];
  const sources = [
    { left: "3%", angle: -65 },
    { left: "27%", angle: -80 },
    { left: "50%", angle: -90 },
    { left: "73%", angle: -100 },
    { left: "97%", angle: -115 },
  ].map(({ left, angle }) => {
    const source = document.createElement("span");
    source.setAttribute("aria-hidden", "true");
    Object.assign(source.style, {
      position: "fixed",
      bottom: "8px",
      left,
      width: "1px",
      height: "1px",
      pointerEvents: "none",
    });
    document.body.appendChild(source);
    return { source, angle };
  });

  const burst = (
    source: HTMLElement,
    angle: number,
    count: number,
  ) => {
    const speed = Math.sqrt(2 * party.settings.gravity * window.innerHeight);
    emitters.push(
      party.scene.current.createEmitter({
        emitterOptions: {
          loops: 1,
          duration: 4,
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
          angle: party.variation.skew(angle, 20),
          initialLifetime: 4,
          initialSpeed: party.variation.range(speed * 0.85, speed * 1.1),
          initialSize: party.variation.skew(1.3, 0.3),
          initialRotation: () => party.random.randomUnitVector().scale(180),
          initialColor: () =>
            party.Color.fromHsl(party.random.randomRange(0, 360), 100, 70),
        },
        rendererOptions: { shapeFactory: ["square", "circle"] },
      }),
    );
  };

  for (const { source, angle } of sources) {
    burst(source, angle, 80);
  }
  const timer = window.setTimeout(() => {
    for (const { source } of sources) source.remove();
  }, 4_000);

  return () => {
    window.clearTimeout(timer);
    for (const emitter of emitters) {
      emitter.emission.bursts = [];
      emitter.clearParticles();
    }
    for (const { source } of sources) source.remove();
  };
}

function cn(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}