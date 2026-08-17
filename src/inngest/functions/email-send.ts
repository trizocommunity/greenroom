import { NonRetriableError } from "inngest";
import { sendEmailSync } from "@/core/integrations/email/send";
import type {
  SendEmailOpts,
  SendEmailResult,
} from "@/core/integrations/email/types";
import { inngest } from "@/inngest/client";

/**
 * Email send queue (UC2).
 *
 * Triggered by `email.requested` events from `sendEmail()`. Runs the
 * synchronous send path (which checks the super-admin per-kind toggle,
 * renders the template, and dispatches via Resend).
 *
 * Retry: 5 attempts with exponential backoff (Inngest default for the
 * `retries` config). 4xx errors from Resend (bad template, bad address)
 * are not retriable — wrapped in `NonRetriableError`.
 *
 * Concurrency: 5 (matches Resend's comfortable API rate).
 */
export const emailSend = inngest.createFunction(
  {
    id: "email-send",
    name: "Email send (Resend)",
    concurrency: { limit: 5 },
    retries: 5,
    triggers: [{ event: "email.requested" }],
  },
  async ({ event, step }) => {
    const opts = event.data.opts as SendEmailOpts;
    const result = await step.run(
      "send",
      async (): Promise<SendEmailResult> => {
        const r = await sendEmailSync(opts);
        if ("error" in r) {
          const status = (r.error as { statusCode?: number }).statusCode;
          if (status && status >= 400 && status < 500) {
            throw new NonRetriableError(r.error.message);
          }
        }
        return r;
      },
    );

    return { ok: true, result };
  },
);
