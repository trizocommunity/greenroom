"use client";

import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BillingHistorySkeleton } from "@/components/ui/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { parseStoredInstant } from "@/core/utils/date-time";
import { useBillingHistory } from "@/features/billing/hooks/use-billing-history";
import { PaymentDetailsModal } from "../modals/PaymentDetailsModal";

export function BillingTab() {
  const { data: payments = [], isLoading } = useBillingHistory();
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="space-y-2">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Card className="border-none shadow-2xl bg-background/50 backdrop-blur-sm ring-1 ring-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BillingHistorySkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter">
            Billing & <span className="text-primary">Invoices</span>
          </h2>
          <p className="text-muted-foreground">
            Manage your seasonal festival payments and view your transaction
            history.
          </p>
        </div>

        <Card className="border-none shadow-2xl bg-background/50 backdrop-blur-sm ring-1 ring-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Transaction History</CardTitle>
                <CardDescription>
                  A detailed log of all your festival creation payments.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {payments.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    No payments records found.
                  </p>
                </div>
              ) : (
                payments.map((payment) => {
                  const createdAt = parseStoredInstant(payment.createdAt);
                  return (
                    <div
                      key={payment.id}
                      className="group relative flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl transition-all duration-300 hover:bg-muted/50 border border-transparent hover:border-border/50"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-2xl shadow-sm ${
                            payment.status === "PAID"
                              ? "bg-green-500/10 text-green-600"
                              : payment.status === "FAILED"
                                ? "bg-red-500/10 text-red-600"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {payment.status === "PAID" ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : payment.status === "FAILED" ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black tracking-tight">
                              {payment.amount?.toLocaleString() || 0}{" "}
                              {payment.currency}
                            </span>
                            {payment.used && (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-black tracking-widest bg-background/50"
                              >
                                Redeemed
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2 mt-0.5">
                            {payment.createdAt
                              ? format(createdAt, "PPP")
                              : "Unknown Date"}
                            <span className="w-1 h-1 rounded-full bg-border" />
                            {payment.tier || "Standard"} Plan
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 mt-4 md:mt-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs font-black text-muted-foreground uppercase tracking-tighter">
                            Status
                          </div>
                          <Badge
                            variant={
                              payment.status === "PAID"
                                ? "default"
                                : "secondary"
                            }
                            className={`mt-1 font-bold ${payment.status === "PAID" ? "bg-green-500 hover:bg-green-600" : ""}`}
                          >
                            {payment.status}
                          </Badge>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="p-6 rounded-3xl bg-linear-to-br from-primary/10 via-background to-background border border-primary/20 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
            <CreditCard className="w-32 h-32 text-primary" />
          </div>
          <div className="relative z-10 max-w-xl space-y-4">
            <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none px-3 py-1">
              Secure Payments
            </Badge>
            <h3 className="text-2xl font-black tracking-tight">
              Need help with your <span className="text-primary">billing</span>?
            </h3>
            <p className="text-muted-foreground font-medium">
              All our payments are handled securely via Razorpay. If you face
              any issues with your credits or redemption, please contact our
              support team immediately.
            </p>
            <Button
              variant="link"
              className="p-0 h-auto font-bold text-primary flex items-center gap-2 group"
            >
              Visit Help Center{" "}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>

      <PaymentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        payment={selectedPayment}
      />
    </>
  );
}
