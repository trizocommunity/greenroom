"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED";
  razorpayOrderId: string | null;
  razorpayId: string | null;
  createdAt: string;
  validFrom: string;
  validUntil: string;
  festival?: {
    name: string;
  };
}

export function PaymentHistoryTab() {
  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["paymentHistory"],
    queryFn: async () => {
      const res = await fetch("/api/payments/history");
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            No payment history found.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Reference ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(payment.createdAt), "MMM dd, yyyy")}
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(payment.createdAt), "hh:mm a")}
                  </div>
                </TableCell>
                <TableCell>
                  Festival Pass
                  {payment.festival && (
                    <div className="text-xs text-muted-foreground">
                      Used for: {payment.festival.name}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {payment.razorpayOrderId || "-"}
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: payment.currency,
                  }).format(payment.amount / 100)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={payment.status} />
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {payment.razorpayId || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Paid
      </Badge>
    );
  }
  if (status === "PENDING") {
    return (
      <Badge
        variant="outline"
        className="bg-yellow-50 text-yellow-800 border-yellow-200"
      >
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  }
  if (status === "FAILED") {
    return (
      <Badge
        variant="destructive"
        className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200"
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}
