import "server-only";
import { EmailPreferencesService } from "@/features/email-preferences/services/email-preferences.service";
import { inngest } from "@/inngest/client";
import { renderEmail } from "./render";
import type { SendEmailOpts, SendEmailResult } from "./types";

/**
 * Resolve the Resend client lazily. Matches the same lazy pattern as
 * `src/core/database/client.ts` so importing this module doesn't throw
 * during `next build`'s page-data-collection phase when env vars are
 * missing.
 */
let _resend: import("resend").Resend | undefined;
async function getResend(): Promise<import("resend").Resend> {
  if (_resend) return _resend;
  const { Resend } = await import("resend");
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not defined");
  }
  _resend = new Resend(apiKey);
  return _resend;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || "Greenroom <trizocommunity@gmail.com>";
}

function recipients(to: string | string[]): string[] {
  return Array.isArray(to) ? to : [to];
}

async function dispatchViaResend(
  rendered: { subject: string; html: string; text: string },
  to: string[],
): Promise<SendEmailResult> {
  try {
    const resend = await getResend();
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (error) {
      console.error("[email] Resend returned an error", {
        error,
        to,
        subject: rendered.subject,
      });
      return { error: { message: error.message } };
    }

    return { id: data?.id ?? `unknown-${Date.now()}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] Resend threw", {
      message,
      to,
      subject: rendered.subject,
    });
    return { error: { message } };
  }
}

/**
 * Dev fallback used when `RESEND_API_KEY` is unset. Prints the rendered
 * email to the console so a developer can see exactly what would have
 * been sent, without burning Resend quota.
 */
function devFallback(
  rendered: { subject: string; html: string; text: string },
  to: string[],
): SendEmailResult {
  const lines = [
    "",
    "─── [email:dev] would have sent ─────────────────────────────",
    `  to:      ${to.join(", ")}`,
    `  from:    ${fromAddress()}`,
    `  subject: ${rendered.subject}`,
    `  text (${rendered.text.length} chars):`,
    ...rendered.text.split("\n").map((line) => `    ${line}`),
    "─────────────────────────────────────────────────────────────",
    "",
  ];
  console.warn(lines.join("\n"));
  return { id: `dev-${Date.now()}` };
}

/**
 * Send synchronously. Use this when the caller needs to know if Resend
 * accepted the message (e.g. sign-in OTP — if Resend is down we delete
 * the OTP row and surface the failure to the user).
 *
 * For fire-and-forget notifications, prefer `sendEmail()` which queues
 * via Inngest with automatic retries.
 */
export async function sendEmailSync(
  opts: SendEmailOpts,
): Promise<SendEmailResult | { id: string; kindDisabled: true }> {
  const enabled = await EmailPreferencesService.isEnabled(opts.kind.kind);
  if (!enabled) {
    console.info(
      `[email] Kind "${opts.kind.kind}" is disabled by super-admin; skipping send.`,
    );
    return { id: `skipped-${opts.kind.kind}`, kindDisabled: true };
  }

  const to = recipients(opts.to);
  const rendered = await renderEmail(opts.kind, opts.theme);

  if (!process.env.RESEND_API_KEY) {
    return devFallback(rendered, to);
  }

  return dispatchViaResend(rendered, to);
}

/**
 * Queue an email via Inngest. Returns immediately with a synthetic id.
 *
 * The actual send happens in the `email-send` Inngest function, which has
 * 5 retries with exponential backoff and skips retrying on 4xx errors
 * (bad template, bad address — not worth retrying).
 *
 * Use this for any notification that doesn't need a synchronous result:
 * invitations, expiry warnings, dashboards, etc.
 */
export async function sendEmail(
  opts: SendEmailOpts,
): Promise<{ id: string; queued: true } | { id: string; kindDisabled: true }> {
  const enabled = await EmailPreferencesService.isEnabled(opts.kind.kind);
  if (!enabled) {
    return { id: `skipped-${opts.kind.kind}`, kindDisabled: true };
  }

  await inngest.send({
    name: "email.requested",
    data: { opts },
  });

  return { id: `queued-${Date.now()}`, queued: true as const };
}
