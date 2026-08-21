import "server-only";
import { Inngest } from "inngest";

/**
 * Single Inngest client for the Greenroom platform.
 *
 * The event key comes from the Inngest dashboard (`INNGEST_EVENT_KEY`) and
 * is shared by every function in this codebase. In dev, leave it unset —
 * Inngest's CLI dev server accepts events without a real key.
 *
 * Inngest functions live in `src/inngest/functions/` and are exported via
 * the array at `src/inngest/functions/index.ts`. The webhook handler at
 * `/api/inngest` registers them with Inngest at boot.
 */
export const inngest = new Inngest({
  id: "greenroom",
  isDev: process.env.NODE_ENV !== "production",
});
