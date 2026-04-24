import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import { getUserStatusDomain } from "@/features/payments/services/payments-domain.service";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const status = await getUserStatusDomain(session.userId, session.role);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
