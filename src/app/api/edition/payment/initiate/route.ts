import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/services/auth.service"; // Adjust import path
import { findFestivalByOwnerId } from "@/server/models/festival.model";
import { RazorpayService } from "@/server/services/razorpay.service";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const festival = await findFestivalByOwnerId(user.id);
    if (!festival) {
      return NextResponse.json(
        { error: "No festival found for this user" },
        { status: 404 },
      );
    }

    // Validation: Festival.isLocked === true OR no ACTIVE edition exists
    // If active edition exists, block.
    const activeEdition = await prisma.edition.findFirst({
      where: {
        festivalId: festival.id,
        status: "ACTIVE",
      },
    });

    if (activeEdition) {
      return NextResponse.json(
        { error: "An active edition already exists. Cannot create another." },
        { status: 400 },
      );
    }

    // Create Razorpay Order
    // Price: 1500 INR
    const amount = 1500 * 100; // in paise
    const currency = "INR";
    const receipt = `rcpt_${festival.id.substring(0, 8)}_${Date.now()}`;

    const order = await RazorpayService.createOrder(amount, currency, receipt, {
      festivalId: festival.id,
      userId: user.id,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Payment Initiate Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 },
    );
  }
}
