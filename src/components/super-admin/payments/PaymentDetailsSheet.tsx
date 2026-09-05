"use client";

import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Mail,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/core/datetime";
import type { AdminPaymentItem } from "@/features/admin/services/admin.service";
import { PaymentSyncButton } from "./PaymentSyncButton";

interface PaymentDetailsSheetProps {
  payment: AdminPaymentItem;
  trigger?: React.ReactNode;
}

function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status.toLowerCase()) {
    case "paid":
    case "captured":
    case "completed":
    case "success":
      return "success";
    case "failed":
    case "cancelled":
      return "destructive";
    case "pending":
    case "processing":
      return "warning";
    default:
      return "outline";
  }
}

export function PaymentDetailsSheet({
  payment,
  trigger,
}: PaymentDetailsSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isPaid = payment.status === "PAID";
  const isPending = payment.status === "PENDING";

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground touch-manipulation"
            title="View full payment details"
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">View Payment Details</span>
          </Button>
        )}
      </DrawerTrigger>

      <DrawerContent className="max-h-[90vh] sm:max-h-[85vh]">
        <div className="mx-auto w-full max-w-xl">
          <DrawerHeader className="text-left pb-3 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DrawerTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payment Details
                </DrawerTitle>
                <DrawerDescription className="text-xs sm:text-sm font-mono mt-0.5">
                  ID: {payment.id}
                </DrawerDescription>
              </div>
              <Badge
                variant={getStatusBadgeVariant(payment.status)}
                className="font-semibold text-xs uppercase tracking-wide px-2.5 py-0.5"
              >
                {payment.status}
              </Badge>
            </div>
          </DrawerHeader>

          <ScrollArea className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-160px)]">
            <div className="space-y-6">
              {/* Financial Hero Box */}
              <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Total Amount
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
                        isPaid
                          ? "text-success"
                          : isPending
                            ? "text-amber-500"
                            : "text-destructive"
                      }`}
                    >
                      ₹{payment.amount.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {payment.currency || "INR"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Badge
                    variant="outline"
                    className="px-3 py-1 font-semibold text-xs border-primary/30 text-primary"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {payment.tier} PLAN
                  </Badge>
                </div>
              </div>

              {/* Customer Profile Card */}
              <div className="rounded-2xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-primary" />
                    Customer Details
                  </h4>
                  {payment.user?.email && (
                    <a
                      href={`mailto:${payment.user.email}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      Email User
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Name</span>
                    <p className="font-medium text-foreground">
                      {payment.user?.fullName || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Email</span>
                    <p className="font-medium text-foreground break-all">
                      {payment.user?.email || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">User ID</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-muted px-2 py-0.5 rounded text-[11px] font-mono text-foreground">
                      {payment.userId}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(payment.userId, "User ID")}
                    >
                      {copiedKey === "User ID" ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Gateway & Identifiers */}
              <div className="rounded-2xl border border-border p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  Razorpay Gateway Identifiers
                </h4>

                {/* Razorpay Order ID */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60 gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-medium text-muted-foreground block">
                      Razorpay Order ID
                    </span>
                    <code className="text-xs font-mono font-medium text-foreground truncate block">
                      {payment.providerId || "N/A"}
                    </code>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {payment.providerId && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            copyToClipboard(payment.providerId, "Order ID")
                          }
                          title="Copy Order ID"
                        >
                          {copiedKey === "Order ID" ? (
                            <Check className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <a
                          href={`https://dashboard.razorpay.com/app/orders/${payment.providerId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-muted-foreground hover:text-foreground"
                          title="View on Razorpay Dashboard"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Razorpay Payment ID */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60 gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-medium text-muted-foreground block">
                      Razorpay Payment ID
                    </span>
                    <code className="text-xs font-mono font-medium text-foreground truncate block">
                      {payment.referenceId || "Awaiting capture (No ref)"}
                    </code>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {payment.referenceId ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            copyToClipboard(payment.referenceId!, "Payment ID")
                          }
                          title="Copy Payment ID"
                        >
                          {copiedKey === "Payment ID" ? (
                            <Check className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <a
                          href={`https://dashboard.razorpay.com/app/payments/${payment.referenceId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-muted-foreground hover:text-foreground"
                          title="View on Razorpay Dashboard"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </>
                    ) : (
                      <span className="text-[11px] text-amber-500 font-medium px-2 py-0.5">
                        Uncaptured
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Festival Context / Allocation */}
              <div className="rounded-2xl border border-border p-4 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Festival Allocation
                </span>

                {payment.festival ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div>
                      <span className="text-sm font-semibold text-foreground">
                        {payment.festival.name}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Allocated & active festival
                      </p>
                    </div>
                    {payment.festival.slug && (
                      <Link
                        href={`/super-admin/festivals/${payment.festival.slug}`}
                        className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        Manage
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Unclaimed Festival Credit
                    </span>
                    <p className="text-xs text-muted-foreground">
                      User has purchased {payment.tier} Plan credit. They can
                      use this entitlement to create their festival.
                    </p>
                  </div>
                )}
              </div>

              {/* Lifecycle & Timestamps */}
              <div className="rounded-2xl border border-border p-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">
                    Created At
                  </span>
                  <span className="font-medium text-foreground mt-0.5 block">
                    {formatDate(payment.createdAt, { style: "medium" })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">
                    Valid Until
                  </span>
                  <span className="font-medium text-foreground mt-0.5 block">
                    {payment.validUntil
                      ? formatDate(payment.validUntil, { style: "medium" })
                      : "90 days from purchase"}
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DrawerFooter className="pt-2 border-t border-border flex flex-row items-center justify-end gap-2">
            {isPending && payment.providerId && (
              <PaymentSyncButton
                paymentId={payment.id}
                providerId={payment.providerId}
                size="default"
              />
            )}
            <DrawerClose asChild>
              <Button variant="outline" size="default">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
