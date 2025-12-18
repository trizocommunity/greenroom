import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import * as PaymentController from "@/server/controllers/payment.controller";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payments = await PaymentController.getUserPayments(session.userId);
    return NextResponse.json(payments);
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 },
    );
  }
}
