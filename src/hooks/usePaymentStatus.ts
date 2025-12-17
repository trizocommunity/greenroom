import { useQuery } from '@tanstack/react-query';

export interface PaymentStatus {
  status: 'NOT_PAID' | 'ACTIVE' | 'EXPIRED';
  payment?: {
    id: string;
    amount: number;
    validFrom: string;
    validUntil: string;
    createdAt: string;
  } | null;
  canCreateFestival: boolean;
}

async function fetchPaymentStatus(): Promise<PaymentStatus> {
  const res = await fetch('/api/payments/status');
  if (!res.ok) {
    throw new Error('Failed to fetch payment status');
  }
  return res.json();
}

export function usePaymentStatus() {
  return useQuery({
    queryKey: ['paymentStatus'],
    queryFn: fetchPaymentStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
