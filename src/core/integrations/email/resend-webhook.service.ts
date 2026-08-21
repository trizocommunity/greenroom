import crypto from "crypto";
import { inngest } from "@/inngest/client";

/**
 * Lazily resolve the Resend webhook secret. Matches the lazy pattern
 * used elsewhere in the codebase so module imports don't throw when env
 * vars are unset.
 */
function getWebhookSecret(): string {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "RESEND_WEBHOOK_SECRET is not defined. Resend webhooks cannot be verified.",
    );
  }
  return secret;
}

/**
 * Verify a Resend webhook signature. Resend sends `svix-signature`
 * containing `v1,<base64-hmac>` keyed with the webhook secret.
 *
 * We compute the expected HMAC over `${id}.${timestamp}.${rawBody}`
 * — that's the standard svix signature format Resend uses.
 */
export function verifyResendWebhookSignature(
  rawBody: string,
  svixSignatureHeader: string,
  svixIdHeader: string,
  svixTimestampHeader: string,
): boolean {
  const secret = getWebhookSecret();
  // The signing secret is `whsec_<base64>` — strip the prefix.
  const b64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = Buffer.from(b64, "base64");

  const signedPayload = `${svixIdHeader}.${svixTimestampHeader}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", key)
    .update(signedPayload)
    .digest("base64");

  // The header may contain multiple space-separated `v1,<sig>` entries;
  // accept any one that matches.
  const candidates = svixSignatureHeader
    .split(" ")
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3));

  return candidates.some((c) => safeEqual(c, expected));
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Push a verified Resend webhook into the Inngest queue. The consumer
 * function (`resend-webhook`) deduplicates by `eventId` within 7 days.
 */
export async function enqueueResendWebhook(
  eventId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await inngest.send({
    name: "resend.webhook",
    data: { eventId, payload },
  });
}
