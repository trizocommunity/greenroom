import crypto from "crypto";
import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn(
    "Razorpay credentials not configured. Payment integration will not work.",
  );
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";

export const RazorpayService = {
  async createOrder(
    amount: number,
    currency: string,
    receipt: string,
    notes: Record<string, string | number | undefined>,
  ) {
    const stringNotes: Record<string, string> = {};
    for (const [k, v] of Object.entries(notes)) {
      if (v !== undefined) stringNotes[k] = String(v);
    }
    return razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: stringNotes,
    });
  },

  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex");

    return expectedSignature === signature;
  },
};
