import { type NextRequest, NextResponse } from "next/server";
import {
  enqueueRazorpayWebhook,
  verifyRazorpayWebhookSignature,
} from "@/features/payments/services/razorpay-webhook.service";

/**
 * Razorpay webhook receiver (UC8).
 *
 * Razorpay calls this URL for server-to-server events that bypass the
 * client-side verify (refunds, disputes, payment.captured on headless
 * payments). The handler:
 *
 * 1. Reads `X-Razorpay-Signature` and the raw body.
 * 2. HMAC-verifies the signature with `RAZORPAY_WEBHOOK_SECRET`.
 *    Defence in depth — never enqueue an untrusted payload.
 * 3. Enqueues a `razorpay.webhook` event into Inngest. The consumer
 *    function (`razorpay-webhook`) has `dedupe: { key: eventId, ttl: "7d" }`
 *    so duplicate deliveries within Razorpay's replay window collapse.
 * 4. Returns 200 OK immediately. Processing happens asynchronously.
 *
 * Signature failures return 403 so Razorpay retries (and we get a
 * chance to investigate). Inngest failures are invisible to Razorpay
 * — they're a separate concern.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-Razorpay-Signature header" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 403 },
    );
  }

  let parsed: {
    event?: string;
    id?: string;
    payload?: Record<string, unknown>;
  };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventId = parsed.id ?? parsed.event ?? "unknown";
  const payload = parsed.payload ?? parsed;

  await enqueueRazorpayWebhook(eventId, payload as Record<string, unknown>);

  return NextResponse.json({ ok: true, eventId }, { status: 200 });
}
