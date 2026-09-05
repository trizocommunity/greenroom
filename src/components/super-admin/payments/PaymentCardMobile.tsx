"use client";

import { Check, Copy, Eye, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/core/datetime";
import type { AdminPaymentItem } from "@/features/admin/services/admin.service";
import { PaymentDetailsSheet } from "./PaymentDetailsSheet";
import { PaymentSyncButton } from "./PaymentSyncButton";

interface PaymentCardMobileProps {
  payment: AdminPaymentItem;
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

export function PaymentCardMobile({ payment }: PaymentCardMobileProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`Copied ${label}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const isPaid = payment.status === "PAID";
  const isPending = payment.status === "PENDING";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-sm transition-all">
      {/* Header: Amount + Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-mono text-xl font-bold tracking-tight ${
                isPaid
                  ? "text-success"
                  : isPending
                    ? "text-amber-500"
                    : "text-destructive"
              }`}
            >
              ₹{payment.amount.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              {payment.currency || "INR"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge
              variant="outline"
              className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0 border-primary/30 text-primary"
            >
              <Sparkles className="w-2.5 h-2.5 mr-1" />
              {payment.tier}
            </Badge>
          </div>
        </div>

        <Badge
          variant={getStatusBadgeVariant(payment.status)}
          className="font-semibold text-[10px] uppercase tracking-wider px-2.5 h-6 shrink-0"
        >
          {payment.status}
        </Badge>
      </div>

      {/* User Info */}
      <div className="flex flex-col min-w-0 pt-1">
        <span className="text-sm font-semibold text-foreground truncate">
          {payment.user?.fullName || "Unnamed User"}
        </span>
        <span className="text-xs text-muted-foreground break-all">
          {payment.user?.email || "No email recorded"}
        </span>
      </div>

      {/* Context / Festival Allocation */}
      <div className="text-xs">
        {payment.festival ? (
          <div className="flex items-center gap-1.5 text-foreground font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Festival: {payment.festival.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-amber-500/70 shrink-0" />
            <span className="italic">Unclaimed Plan Credit</span>
          </div>
        )}
      </div>

      {/* Gateway Identifiers: Tap to copy */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {payment.providerId && (
          <button
            type="button"
            onClick={() => copyToClipboard(payment.providerId, "Order ID")}
            className="flex items-center gap-1 text-[11px] font-mono bg-muted/60 hover:bg-muted text-muted-foreground px-2 py-1 rounded-lg border border-border/80 transition-colors touch-manipulation max-w-full"
            title="Tap to copy Order ID"
          >
            <span className="truncate">{payment.providerId}</span>
            {copiedKey === "Order ID" ? (
              <Check className="w-3 h-3 text-success shrink-0" />
            ) : (
              <Copy className="w-3 h-3 shrink-0" />
            )}
          </button>
        )}

        {payment.referenceId ? (
          <button
            type="button"
            onClick={() => copyToClipboard(payment.referenceId!, "Payment ID")}
            className="flex items-center gap-1 text-[11px] font-mono bg-muted/60 hover:bg-muted text-muted-foreground px-2 py-1 rounded-lg border border-border/80 transition-colors touch-manipulation max-w-full"
            title="Tap to copy Payment ID"
          >
            <span className="truncate">{payment.referenceId}</span>
            {copiedKey === "Payment ID" ? (
              <Check className="w-3 h-3 text-success shrink-0" />
            ) : (
              <Copy className="w-3 h-3 shrink-0" />
            )}
          </button>
        ) : (
          <span className="text-[10px] text-muted-foreground italic px-1.5 py-1">
            No ref
          </span>
        )}
      </div>

      {/* Date */}
      <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/60 flex items-center justify-between">
        <span>{formatDate(payment.createdAt, { style: "medium" })}</span>
      </div>

      {/* Action Bar (>=44px touch targets) */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <PaymentDetailsSheet
          payment={payment}
          trigger={
            <Button
              variant="outline"
              className="w-full min-h-[44px] text-xs font-medium gap-1.5 rounded-xl border-border bg-card hover:bg-muted touch-manipulation"
            >
              <Eye className="w-4 h-4 text-muted-foreground" />
              View Details
            </Button>
          }
        />

        {isPending && payment.providerId ? (
          <PaymentSyncButton
            paymentId={payment.id}
            providerId={payment.providerId}
            className="w-full min-h-[44px] rounded-xl"
          />
        ) : (
          <Button
            variant="ghost"
            disabled
            className="w-full min-h-[44px] text-xs font-medium text-muted-foreground opacity-60"
          >
            Settled
          </Button>
        )}
      </div>
    </div>
  );
}
