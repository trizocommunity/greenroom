import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import { getUserPaymentsDomain } from "@/features/payments/services/payments-domain.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payments = await getUserPaymentsDomain(session.userId);
    return NextResponse.json(payments);
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 },
    );
  }
}
