import crypto from 'crypto';
import { razorpay } from '@/services/razorpay.service';
import { 
  createPayment, 
  updatePaymentStatus, 
  getPaymentByOrderId,
  getActivePaymentForUser
} from '@/models/PaymentModel';

const FESTIVAL_PRICE = 1000 * 100; // ₹1000 in paise
const VALIDITY_DAYS = 30;

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function createRazorpayOrder(userId: string): Promise<CreateOrderResult> {
  // Check if user already has an active payment
  const activePayment = await getActivePaymentForUser(userId);
  if (activePayment) {
    throw new Error('You already have an active festival pass');
  }

  // Create Razorpay order
  const order = await razorpay.orders.create({
    amount: FESTIVAL_PRICE,
    currency: 'INR',
    receipt: `rcpt_${userId.slice(-10)}_${Date.now().toString().slice(-8)}`,
    notes: {
      userId,
      purpose: 'festival_pass',
    },
  });

  // Calculate validity window
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + VALIDITY_DAYS);

  // Create pending payment record
  await createPayment({
    userId,
    amount: FESTIVAL_PRICE,
    currency: 'INR',
    validityDays: VALIDITY_DAYS,
    razorpayOrderId: order.id,
  });

  return {
    orderId: order.id,
    amount: FESTIVAL_PRICE,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID || '',
  };
}

export async function verifyRazorpayPayment(payload: VerifyPaymentInput): Promise<boolean> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw new Error('Invalid payment signature');
  }

  // Update payment status in database
  const payment = await getPaymentByOrderId(razorpay_order_id);
  if (!payment) {
    throw new Error('Payment record not found');
  }

  await updatePaymentStatus(payment.id, 'COMPLETED', razorpay_payment_id);

  return true;
}
