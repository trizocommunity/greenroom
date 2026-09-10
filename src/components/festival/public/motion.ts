import type { Easing, SpringOptions, Transition } from "framer-motion";
import { useSyncExternalStore } from "react";

/**
 * The public site's physical signature, in one place.
 *
 * These three values were already re-typed by hand across the navbar,
 * results list, schedule and hero. Naming them is why a brand-new sheet
 * feels like the same product on first sight — and why changing the feel
 * of the site is one edit rather than a grep.
 *
 * Deliberately no `"use client"`: the constants stay readable from server
 * components, and a client module marking itself is the caller's job.
 */

/**
 * Layout/reorder spring. Already the transition at FestivalNavbar,
 * ResultsList and ScheduleByDay.
 */
export const HOUSE_SPRING = {
  type: "spring",
  stiffness: 400,
  damping: 34,
} as const satisfies Transition;

/** The hero's entrance curve. For anything that reveals rather than reorders. */
export const HOUSE_EASE = [0.22, 1, 0.36, 1] as const satisfies Easing;

/**
 * For `useSpring` on a number counting to a new total, not moving in space.
 */
export const COUNT_SPRING = {
  stiffness: 90,
  damping: 20,
} as const satisfies SpringOptions;

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

// Resolved once and cached: `getSnapshot` runs on every render pass, and
// matchMedia is not free.
let reduceQuery: MediaQueryList | null = null;

function getReduceQuery(): MediaQueryList | null {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return null;
  }
  if (!reduceQuery) reduceQuery = window.matchMedia(REDUCE_QUERY);
  return reduceQuery;
}

function subscribeToReduceQuery(onChange: () => void): () => void {
  const query = getReduceQuery();
  if (!query) return () => {};
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReduceSnapshot(): boolean {
  return getReduceQuery()?.matches ?? false;
}

// Hydration reads this, not the live media query, so the first client render
// matches the server byte for byte. React re-reads the real snapshot right
// after and re-renders if the visitor does prefer reduced motion.
function getReduceServerSnapshot(): boolean {
  return false;
}

/**
 * `true` when the visitor has asked for reduced motion, kept live via a
 * `change` listener — framer's own `useReducedMotion` samples once at mount,
 * returns `boolean | null`, and reads the real value during hydration.
 *
 * Motion that is CSS-driven should not use this: `globals.css` already
 * disables those utilities under the media query. This is for the cases
 * framer owns — springs, `layout`, `AnimatePresence` — plus confetti and
 * haptics, which have no CSS switch.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReduceQuery,
    getReduceSnapshot,
    getReduceServerSnapshot,
  );
}
