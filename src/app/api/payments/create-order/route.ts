import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import * as PaymentController from "@/server/controllers/payment.controller";

// POST /api/payments/create-order - Create a Razorpay order
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await PaymentController.createOrder(session.userId);

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
