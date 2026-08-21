import { cloudinaryTransform } from "./cloudinary-transform";
import { countdownTicker } from "./countdown-ticker";
import { cronDaily } from "./cron-daily";
import { csvImport } from "./csv-import";
import { emailSend } from "./email-send";
import { exportJob } from "./export-job";
import { posterRender } from "./poster-render";
import { razorpayWebhook } from "./razorpay-webhook";
import { resendWebhook } from "./resend-webhook";
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
  countdownTicker,
  emailSend,
  exportJob,
  csvImport,
  posterRender,
  cloudinaryTransform,
  razorpayWebhook,
  resendWebhook,
  // Smoke test (remove before production)
  smokeTest,
];
