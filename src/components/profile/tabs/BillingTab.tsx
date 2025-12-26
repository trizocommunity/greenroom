"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBillingHistory } from "@/server/actions/billing.actions";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export function BillingTab() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBillingHistory().then((data) => {
      setPayments(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin h-8 w-8 text-neutral-400" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.length === 0 ? (
            <p className="text-neutral-500">No payments found.</p>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div>
                  <div className="font-medium">
                    {payment.amount} {payment.currency}
                  </div>
                  <div className="text-sm text-neutral-400">
                    {format(new Date(payment.createdAt), "PPP")}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Purpose: {payment.purpose}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={
                      payment.status === "PAID"
                        ? "default"
                        : payment.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {payment.status}
                  </Badge>
                  {payment.used && (
                    <Badge variant="outline" className="text-xs">
                      Redeemed
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
