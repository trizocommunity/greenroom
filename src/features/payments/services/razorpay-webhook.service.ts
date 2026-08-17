import crypto from "crypto";
import { inngest } from "@/inngest/client";

/**
 * Lazily resolve the Razorpay webhook secret. Matches the lazy pattern
 * used elsewhere in the codebase so module imports don't throw when env
 * vars are unset.
 */
function getWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is not defined. Razorpay webhooks cannot be verified.",
    );
  }
  return secret;
}

/**
 * Verify a Razorpay webhook signature. Razorpay sends `X-Razorpay-Signature`
 * as an HMAC-SHA256 of the raw request body keyed with the webhook secret.
 *
 * Use the raw body string before any JSON parsing — the signature covers
 * the exact bytes Razorpay sent.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const secret = getWebhookSecret();
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

/**
 * Push a verified Razorpay webhook event into the Inngest queue. The
 * `dedupe` config in the consumer function (`razorpay-webhook`) collapses
 * duplicate deliveries within 7 days.
 */
export async function enqueueRazorpayWebhook(
  eventId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await inngest.send({
    name: "razorpay.webhook",
    data: { eventId, payload },
  });
}
