import { serverNowIso } from "@/core/datetime/server";
import { publish } from "@/core/pubsub/redis-pubsub";
import { keys } from "@/core/redis/keys";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import {
  getPaymentByOrderId,
  updatePaymentStatus,
} from "@/features/payments/repositories/payment.repository";
import { inngest } from "@/inngest/client";

/**
 * Razorpay webhook consumer (UC8).
 *
 * Triggered by `razorpay.webhook` events. The `dedupe` config collapses
 * Razorpay's duplicate deliveries within 7 days. The function looks up
 * the payment row by Razorpay's `payload.payment.entity.order_id`,
 * updates its status, and writes an audit log entry.
 *
 * Concurrency: 5. Retry: 5 attempts with exponential backoff.
 */
export const razorpayWebhook = inngest.createFunction(
  {
    id: "razorpay-webhook",
    name: "Razorpay webhook",
    concurrency: { limit: 5 },
    retries: 5,
    triggers: [{ event: "razorpay.webhook" }],
    idempotency: "event.data.eventId",
  },
  async ({ event, step }) => {
    const { eventId, payload } = event.data as {
      eventId: string;
      payload: Record<string, unknown>;
    };

    const paymentEntity = (payload as { payment?: { entity?: { order_id?: string; id?: string } } })
      .payment?.entity;
    const orderId = paymentEntity?.order_id;
    if (!orderId) {
      return { skipped: true, reason: "missing order_id", eventId };
    }

    const payment = await step.run("lookup-payment", () =>
      getPaymentByOrderId(orderId),
    );

    if (!payment) {
      return { skipped: true, reason: "no payment row", eventId, orderId };
    }

    const razorpayPaymentId = paymentEntity?.id ?? null;

    await step.run("mark-paid", () =>
      updatePaymentStatus(payment.id, "PAID", razorpayPaymentId ?? undefined),
    );

    await step.run("audit", () =>
      createAuditLog({
        action: "PAYMENT_SUCCESS",
        targetType: "PAYMENT",
        targetId: payment.id,
        metadata: {
          eventId,
          orderId,
          razorpayPaymentId,
          source: "razorpay-webhook",
        },
        actor: { actorId: payment.userId, actorRole: "USER" },
      }),
    );

    await publish(keys.superAdminStats(), {
      type: "payment_received",
      delta: 1,
      occurredAt: serverNowIso(),
    });

    return { ok: true, eventId, orderId };
  },
);
