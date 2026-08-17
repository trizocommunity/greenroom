import { type NextRequest, NextResponse } from "next/server";
import {
  enqueueResendWebhook,
  verifyResendWebhookSignature,
} from "@/core/integrations/email/resend-webhook.service";

/**
 * Resend webhook receiver (UC11).
 *
 * Resend calls this URL for delivery events (`email.delivered`,
 * `email.bounced`, `email.complained`, `email.opened`). The handler:
 *
 * 1. Reads `svix-id`, `svix-timestamp`, `svix-signature` headers.
 * 2. Verifies the HMAC over `${id}.${timestamp}.${rawBody}` keyed with
 *    `RESEND_WEBHOOK_SECRET`. Defence in depth — never enqueue an
 *    untrusted payload.
 * 3. Enqueues a `resend.webhook` event into Inngest. The consumer
 *    function (`resend-webhook`) deduplicates by event id within 7 days.
 * 4. Returns 200 OK immediately. Processing happens asynchronously.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  if (
    !verifyResendWebhookSignature(rawBody, svixSignature, svixId, svixTimestamp)
  ) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 403 },
    );
  }

  let parsed: { type?: string; data?: Record<string, unknown> };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventId = `${parsed.type ?? "unknown"}-${svixId}`;
  const payload = parsed.data ?? {};

  await enqueueResendWebhook(eventId, payload);

  return NextResponse.json({ ok: true, eventId }, { status: 200 });
}
