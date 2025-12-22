import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/services/auth.service"; // Adjust import path
import { EditionPaymentController } from "@/server/controllers/edition-payment.controller";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment details" },
        { status: 400 },
      );
    }

    // Price is fixed for now: 1500 INR
    const amount = 1500 * 100; // Need to be sure this matches order, but for verify signature it doesn't matter as much, but we record it.

    const newEdition = await EditionPaymentController.createPaidEdition(user, {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      amount: amount,
      currency: "INR",
    });

    return NextResponse.json({
      success: true,
      editionId: newEdition.id,
      editionSlug: newEdition.slug,
      redirect: `/festival/${newEdition.festivalId}/${newEdition.slug}`,
    }); // Frontend handles redirect path usually
  } catch (error: any) {
    console.error("Payment Success Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment success" },
      { status: 500 },
    );
  }
}
