import "server-only";

import { verifyPaymentInput } from "@/api/contracts/payments";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { verifyPaymentByOrderIdDomain } from "@/features/payments/services/payments-domain.service";

const handler = createProtectedHandler({
  async POST({ request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = verifyPaymentInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    await verifyPaymentByOrderIdDomain({
      razorpay_order_id: parsed.data.razorpayOrderId,
      razorpay_payment_id: parsed.data.razorpayPaymentId,
      razorpay_signature: parsed.data.razorpaySignature,
    });

    return ok({ success: true });
  },
});

export const POST = handler;
