"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/core/datetime";
import type { AdminPaymentItem } from "@/features/admin/services/admin.service";
import { PaymentDetailsSheet } from "./PaymentDetailsSheet";
import { PaymentSyncButton } from "./PaymentSyncButton";

interface PaymentTableDesktopProps {
  payments: AdminPaymentItem[];
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

export function PaymentTableDesktop({ payments }: PaymentTableDesktopProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`Copied ${label}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Amount
            </TableHead>
            <TableHead className="py-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Plan
            </TableHead>
            <TableHead className="py-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              User
            </TableHead>
            <TableHead className="py-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Gateway Reference
            </TableHead>
            <TableHead className="py-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Context
            </TableHead>
            <TableHead className="py-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="py-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">
              Date
            </TableHead>
            <TableHead className="w-[120px] text-right py-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => {
            const isPaid = payment.status === "PAID";
            const isPending = payment.status === "PENDING";

            return (
              <TableRow
                key={payment.id}
                className="group hover:bg-muted/20 transition-colors"
              >
                {/* 1. Amount */}
                <TableCell className="py-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono text-base font-bold tracking-tight ${
                        isPaid
                          ? "text-success"
                          : isPending
                            ? "text-amber-500"
                            : "text-destructive"
                      }`}
                    >
                      ₹{payment.amount.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {payment.currency || "INR"}
                    </span>
                  </div>
                </TableCell>

                {/* 2. Plan Tier */}
                <TableCell className="py-4">
                  <Badge
                    variant="outline"
                    className="font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 border-primary/30 text-primary"
                  >
                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                    {payment.tier}
                  </Badge>
                </TableCell>

                {/* 3. User Details */}
                <TableCell className="py-4">
                  <div className="flex flex-col max-w-[200px]">
                    <span className="text-sm font-medium text-foreground truncate">
                      {payment.user?.fullName || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {payment.user?.email || "Unknown"}
                    </span>
                  </div>
                </TableCell>

                {/* 4. Gateway Identifiers (Click to copy) */}
                <TableCell className="py-4">
                  <div className="flex flex-col gap-1 items-start">
                    {payment.providerId && (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(payment.providerId, "Order ID")
                        }
                        className="group/chip flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/40 hover:bg-muted px-1.5 py-0.5 rounded border border-border/80 transition-colors"
                        title="Click to copy Order ID"
                      >
                        <span className="truncate max-w-[150px]">
                          {payment.providerId}
                        </span>
                        {copiedKey === "Order ID" ? (
                          <Check className="w-3 h-3 text-success shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60 group-hover/chip:opacity-100 shrink-0" />
                        )}
                      </button>
                    )}

                    {payment.referenceId ? (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(payment.referenceId!, "Payment ID")
                        }
                        className="group/chip flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/40 hover:bg-muted px-1.5 py-0.5 rounded border border-border/80 transition-colors"
                        title="Click to copy Payment ID"
                      >
                        <span className="truncate max-w-[150px]">
                          {payment.referenceId}
                        </span>
                        {copiedKey === "Payment ID" ? (
                          <Check className="w-3 h-3 text-success shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60 group-hover/chip:opacity-100 shrink-0" />
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground px-1 italic">
                        No ref
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* 5. Context */}
                <TableCell className="py-4">
                  {payment.festival ? (
                    <div className="flex items-center gap-1.5 max-w-[180px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">
                        {payment.festival.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500/70 shrink-0" />
                      Unclaimed Credit
                    </span>
                  )}
                </TableCell>

                {/* 6. Status */}
                <TableCell className="py-4">
                  <Badge
                    variant={getStatusBadgeVariant(payment.status)}
                    className="font-semibold text-[10px] uppercase tracking-wider px-2 h-5"
                  >
                    {payment.status}
                  </Badge>
                </TableCell>

                {/* 7. Date */}
                <TableCell className="py-4 text-right">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(payment.createdAt, { style: "medium" })}
                  </span>
                </TableCell>

                {/* 8. Actions */}
                <TableCell className="py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isPending && payment.providerId && (
                      <PaymentSyncButton
                        paymentId={payment.id}
                        providerId={payment.providerId}
                        size="sm"
                        showText={false}
                      />
                    )}
                    <PaymentDetailsSheet payment={payment} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
