"use client";

import { format } from "date-fns";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

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
import { usePaymentHistory } from "@/features/payments/hooks/use-payment-history";
import { usePaymentStatus } from "@/features/payments/hooks/use-payment-status";
import { parseStoredInstant } from "@/core/utils/date-time";
import { Skeleton } from "../ui/skeleton";

export function BillingTab() {
  const { data: paymentStatus, isLoading: isStatusLoading } =
    usePaymentStatus();
  const { data: payments, isLoading: isHistoryLoading } = usePaymentHistory();

  if (isStatusLoading || isHistoryLoading) {
    return (
      <div className="w-full flex justify-center p-8">
        <div className="flex justify-center">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Status */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <div className="font-medium">Festival Creation Access</div>
              <div className="text-sm text-muted-foreground mt-1">
                {paymentStatus?.canCreateFestival
                  ? "You have active access to create festivals."
                  : "You need to purchase a pass to create festivals."}
              </div>
            </div>
            <Badge
              variant={
                paymentStatus?.canCreateFestival ? "default" : "secondary"
              }
              className={
                paymentStatus?.canCreateFestival
                  ? "bg-green-500 hover:bg-green-700"
                  : ""
              }
            >
              {paymentStatus?.canCreateFestival ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              No payment history found.
            </div>
          ) : (
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
                {payments.map((payment) => {
                  const createdAt = parseStoredInstant(payment.createdAt);
                  return (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(createdAt, "MMM dd, yyyy")}
                      <div className="text-xs text-muted-foreground">
                        {format(createdAt, "hh:mm a")}
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <Badge className="bg-green-100 text-green-500 hover:bg-green-200 border-green-200">
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
