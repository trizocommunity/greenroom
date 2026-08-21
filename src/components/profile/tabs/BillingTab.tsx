"use client";

import { CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react";
import { useState } from "react";
import { usePaymentHistory } from "@/api/client";
import {
  AppEmptyState,
  AppPageHeader,
  AppSectionHeading,
  StatusPill,
  type StatusTone,
} from "@/components/app/AppSection";
import { BillingHistorySkeleton } from "@/components/ui/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, parseInstant } from "@/core/datetime";
import { PaymentDetailsModal } from "../modals/PaymentDetailsModal";

const STATUS_META: Record<
  string,
  { tone: StatusTone; icon: typeof CheckCircle2 }
> = {
  PAID: { tone: "live", icon: CheckCircle2 },
  FAILED: { tone: "danger", icon: XCircle },
};

export function BillingTab() {
  const { data, isLoading } = usePaymentHistory();
  const payments = data?.history ?? [];
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-in fade-in space-y-8 duration-500">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <BillingHistorySkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="animate-in fade-in space-y-10 duration-500">
        <AppPageHeader
          eyebrow="Billing"
          title="Payments & invoices"
          description="Every festival payment on your account, newest first."
        />

        <section>
          <AppSectionHeading title="Transaction history" />

          {payments.length === 0 ? (
            <AppEmptyState
              icon={CreditCard}
              title="No payments yet"
              description="Payments appear here as soon as you buy a festival plan."
            />
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {payments.map((payment) => {
                const createdAt = parseInstant(payment.createdAt);
                const meta = STATUS_META[payment.status ?? ""] ?? {
                  tone: "warning" as StatusTone,
                  icon: Clock,
                };

                return (
                  <li key={payment.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setIsDetailsOpen(true);
                      }}
                      className="group flex w-full items-center gap-4 py-4 text-left transition-opacity hover:opacity-80"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium tabular-nums text-heading">
                          {payment.amount?.toLocaleString() || 0}{" "}
                          {payment.currency}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[
                            payment.createdAt
                              ? formatDate(createdAt, {
                                  style: "long",
                                })
                              : "Unknown date",
                            `${payment.tier || "Standard"} plan`,
                            payment.used ? "Redeemed" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      <StatusPill
                        tone={meta.tone}
                        icon={meta.icon}
                        className="shrink-0"
                      >
                        {payment.status}
                      </StatusPill>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="border-t border-border pt-8">
          <h2 className="text-lg font-semibold tracking-tight text-heading">
            Need help with a payment?
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Payments are handled securely through Razorpay — we never see your
            card details. If a credit has not appeared or a redemption failed,
            get in touch and we will sort it.
          </p>
          <a
            href="/contact"
            className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-70"
          >
            Contact support
          </a>
        </section>
      </div>

      <PaymentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        payment={selectedPayment}
      />
    </>
  );
}
