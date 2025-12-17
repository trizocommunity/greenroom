import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PaymentController } from "@/server/controllers/payment.controller";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const status = await PaymentController.getUserStatus(session.userId);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
