"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { usePaymentHistory } from "@/api/client";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
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
import { formatDate, parseInstant } from "@/core/datetime";
import { PaymentDetailsModal } from "../modals/PaymentDetailsModal";

export function BillingTab() {
  const { data, isLoading } = usePaymentHistory();
  const payments = data?.history ?? [];
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const displayTz = useDisplayTimezone();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="space-y-2">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Card className="border border-border rounded-2xl bg-card shadow-premium">
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
          <h2 className="text-3xl font-semibold tracking-tight text-heading">
            Billing & invoices
          </h2>
          <p className="text-muted-foreground">
            Manage your seasonal festival payments and view your transaction
            history.
          </p>
        </div>

        <Card className="border border-border rounded-2xl bg-card shadow-premium">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/8 text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight text-heading">
                  Transaction history
                </CardTitle>
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
                    No payment records found.
                  </p>
                </div>
              ) : (
                payments.map((payment) => {
                  const createdAt = parseInstant(payment.createdAt);
                  return (
                    <div
                      key={payment.id}
                      className="group relative flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl transition-colors duration-300 hover:bg-muted/50 border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-2xl ${
                            payment.status === "PAID"
                              ? "bg-success/10 text-success"
                              : payment.status === "FAILED"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary/8 text-primary"
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
                            <span className="text-lg font-semibold tracking-tight text-heading">
                              {payment.amount?.toLocaleString() || 0}{" "}
                              {payment.currency}
                            </span>
                            {payment.used && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium bg-background/50"
                              >
                                Redeemed
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            {payment.createdAt
                              ? formatDate(createdAt, {
                                  tz: displayTz,
                                  style: "long",
                                })
                              : "Unknown date"}
                            <span className="w-1 h-1 rounded-full bg-border" />
                            {payment.tier || "Standard"} plan
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 mt-4 md:mt-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-muted-foreground">
                            Status
                          </div>
                          <Badge
                            variant={
                              payment.status === "PAID"
                                ? "default"
                                : "secondary"
                            }
                            className={`mt-1 font-medium ${payment.status === "PAID" ? "bg-success hover:bg-success/90" : ""}`}
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

        <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-br from-primary/8 via-card to-card border border-primary/15 shadow-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.08] rotate-12">
            <CreditCard className="w-32 h-32 text-primary" />
          </div>
          <div className="relative z-10 max-w-xl space-y-3">
            <p className="text-eyebrow">Secure payments</p>
            <h3 className="text-2xl font-semibold tracking-tight text-heading">
              Need help with your{" "}
              <span className="font-display italic font-normal text-primary">
                billing
              </span>
              ?
            </h3>
            <p className="text-muted-foreground">
              All payments are handled securely via Razorpay. If you face any
              issues with your credits or redemption, please contact our support
              team.
            </p>
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-primary flex items-center gap-2 group"
            >
              Visit help center{" "}
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
