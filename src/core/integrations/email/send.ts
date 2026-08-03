import "server-only";
import { Resend } from "resend";
import { EmailPreferencesService } from "@/features/email-preferences/services/email-preferences.service";
import { renderEmail } from "./render";
import type { SendEmailOpts, SendEmailResult } from "./types";

/**
 * Resolve the Resend client lazily. Matches the same lazy pattern as
 * `src/core/database/client.ts` so importing this module doesn't throw
 * during `next build`'s page-data-collection phase when env vars are
 * missing.
 */
let _resend: Resend | undefined;
function getResend(): Resend {
  if (_resend) return _resend;
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
    const { data, error } = await getResend().emails.send({
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
 * been sent, without burning Resend quota. Returns a synthetic `{ id }`
 * so the caller can treat it as a successful no-op.
 *
 * This is the canonical local-dev path: leave `RESEND_API_KEY` unset in
 * your local `.env` (it lives in the Vercel dashboard for production)
 * and every send lands here.
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
 * Render an email from its kind and hand it to Resend.
 *
 * Returns `{ id }` on success (including the dev fallback path) and
 * `{ error }` on failure. The global super-admin per-kind toggle is
 * checked before rendering; disabled kinds return a synthetic `{ id }`
 * with `kindDisabled: true` so callers can branch if they care.
 */
export async function sendEmail(
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
