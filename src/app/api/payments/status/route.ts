import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { 
  createPayment, 
  getUserPaymentStatus, 
  updatePaymentStatus 
} from '@/models/PaymentModel';

// GET /api/payments/status - Get current user's payment status
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentStatus = await getUserPaymentStatus(session.userId);
    
    return NextResponse.json(paymentStatus);
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    );
  }
}
