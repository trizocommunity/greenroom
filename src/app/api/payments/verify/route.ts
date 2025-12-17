import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import * as PaymentController from "@/server/controllers/payment.controller";

// POST /api/payments/verify - Verify Razorpay payment signature
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    await PaymentController.verifyPayment({
      razorpay_order_id: body.razorpay_order_id,
      razorpay_payment_id: body.razorpay_payment_id,
      razorpay_signature: body.razorpay_signature,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying payment:", error);
    const message =
      error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
