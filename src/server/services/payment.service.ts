/**
 * Payment Verification Service
 *
 * In a real app, this would verify signatures from Stripe/Razorpay.
 * For Phase 3 implementation, we are standardizing the interface.
 */
import { RazorpayService } from "@/server/services/razorpay.service";

/**
 * Payment Verification Service
 *
 * Verifies signatures from Stripe/Razorpay.
 */
export const PaymentService = {
  /**
   * Verified that a payment is authentic and successful.
   *
   * @param orderId The Order ID from Razorpay
   * @param paymentId The Payment ID from Razorpay
   * @param signature The signature to verify
   * @returns verified boolean
   */
  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    return RazorpayService.verifyPaymentSignature(
      orderId,
      paymentId,
      signature,
    );
  },
};
