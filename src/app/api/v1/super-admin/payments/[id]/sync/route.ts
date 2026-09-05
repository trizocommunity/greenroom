import "server-only";

import { eq, sql } from "drizzle-orm";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  ok,
  unauthorized,
} from "@/api/lib";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { payment, userPurchaseSummary } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { publish } from "@/core/pubsub/redis-pubsub";
import { keys } from "@/core/redis/keys";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import { updatePaymentStatus } from "@/features/payments/repositories/payment.repository";
import { RazorpayService } from "@/features/payments/services/razorpay.service";

export const POST = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();
  if (session.role !== "SUPER_ADMIN") return forbidden();

  const { id } = await params;

  const paymentRecord = await db.query.payment.findFirst({
    where: eq(payment.id, id),
  });

  if (!paymentRecord) {
    return notFound("PAYMENT_NOT_FOUND", "Payment record not found");
  }

  if (paymentRecord.status === "PAID") {
    return ok({
      synced: false,
      status: "PAID",
      message: "Payment is already marked as PAID.",
    });
  }

  if (!paymentRecord.providerId) {
    return badRequest(
      "NO_ORDER_ID",
      "No Razorpay Order ID found on this payment record.",
    );
  }

  try {
    const orderPayments = await RazorpayService.fetchOrderPayments(
      paymentRecord.providerId,
    );
    const items =
      (
        orderPayments as {
          items?: Array<{ id: string; status: string; amount: number }>;
        }
      )?.items || [];

    const capturedPayment = items.find((p) => p.status === "captured");

    if (capturedPayment) {
      await updatePaymentStatus(paymentRecord.id, "PAID", capturedPayment.id);

      await db
        .insert(userPurchaseSummary)
        .values({
          userId: paymentRecord.userId,
          totalSpend: paymentRecord.amount,
          festivalsCount: 1,
          lastPurchaseAt: paymentRecord.createdAt,
          updatedAt: paymentRecord.createdAt,
          festivalIds: [],
          planCountsByTier: {},
        })
        .onConflictDoUpdate({
          target: userPurchaseSummary.userId,
          set: {
            totalSpend: sql`${userPurchaseSummary.totalSpend} + ${paymentRecord.amount}`,
            festivalsCount: sql`${userPurchaseSummary.festivalsCount} + 1`,
            lastPurchaseAt: paymentRecord.createdAt,
          },
        });

      await createAuditLog({
        action: "PAYMENT_SUCCESS",
        targetType: "PAYMENT",
        targetId: paymentRecord.id,
        metadata: {
          source: "super-admin-sync",
          razorpayOrderId: paymentRecord.providerId,
          razorpayPaymentId: capturedPayment.id,
        },
        actor: { actorId: session.userId, actorRole: "SUPER_ADMIN" },
      });

      try {
        await publish(keys.superAdminStats(), {
          type: "payment_received",
          delta: 1,
          occurredAt: serverNowIso(),
        });
      } catch (e) {
        console.warn("[sync-payment] Pubsub publish failed (ignored)", e);
      }

      return ok({
        synced: true,
        status: "PAID",
        referenceId: capturedPayment.id,
        message: `Payment confirmed on Razorpay (${capturedPayment.id}). Record updated to PAID!`,
      });
    }

    const failedCount = items.filter((p) => p.status === "failed").length;
    if (items.length > 0) {
      return ok({
        synced: false,
        status: paymentRecord.status,
        message: `Razorpay checked: Found ${items.length} attempt(s) (${failedCount} failed), but none captured yet.`,
      });
    }

    return ok({
      synced: false,
      status: paymentRecord.status,
      message:
        "Razorpay checked: No payment attempt has been completed for this order yet.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error contacting Razorpay";
    return internalError(`Razorpay sync failed: ${message}`);
  }
};
