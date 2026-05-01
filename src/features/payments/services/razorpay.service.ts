import crypto from "crypto";
import Razorpay from "razorpay";

function getRazorpayKeys(): { key_id: string; key_secret: string } {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay credentials are required. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment.",
    );
  }
  return { key_id, key_secret };
}

let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    const { key_id, key_secret } = getRazorpayKeys();
    razorpayInstance = new Razorpay({ key_id, key_secret });
  }
  return razorpayInstance;
}

export function getRazorpayKeyId(): string {
  return getRazorpayKeys().key_id;
}

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
    return getRazorpay().orders.create({
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
    const { key_secret } = getRazorpayKeys();
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(body)
      .digest("hex");

    return expectedSignature === signature;
  },
};
