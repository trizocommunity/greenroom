import { cronDaily } from "./cron-daily";
import { emailSend } from "./email-send";
import { exportJob } from "./export-job";
import { smokeTest } from "./smoke-test";

/**
 * Inngest function registry. Imported by the webhook route at
 * `/api/inngest/route.ts` and passed to `serve()` so Inngest knows what
 * to schedule.
 *
 * New functions go here — keep this list in priority order so the most
 * critical queue (exports, webhooks) reads first.
 */
export const inngestFunctions = [
  // Production queues
  cronDaily,
  emailSend,
  exportJob,
  // Smoke test (remove before production)
  smokeTest,
];
