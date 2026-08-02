"use client";

import {
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Hash,
  Receipt,
  Tag,
  XCircle,
} from "lucide-react";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, parseInstant } from "@/core/datetime";

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any; // Using any for now to match the implicit type in BillingTab
}

export function PaymentDetailsModal({
  isOpen,
  onClose,
  payment,
}: PaymentDetailsModalProps) {
  const displayTz = useDisplayTimezone();
  if (!payment) return null;
  const createdAt = payment.createdAt ? parseInstant(payment.createdAt) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden gap-0 rounded-2xl shadow-premium-lg">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-heading">
            <Receipt className="w-5 h-5 text-primary" />
            Payment details
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col items-center justify-center py-6 bg-muted/30 rounded-2xl border border-border">
            <h3 className="text-3xl font-semibold tracking-tight text-heading">
              {payment.amount?.toLocaleString() || 0} {payment.currency}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant={payment.status === "PAID" ? "default" : "secondary"}
                className={`flex items-center gap-1 font-medium ${
                  payment.status === "PAID"
                    ? "bg-success hover:bg-success/90"
                    : payment.status === "FAILED"
                      ? "bg-destructive hover:bg-destructive/90"
                      : ""
                }`}
              >
                {payment.status === "PAID" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : payment.status === "FAILED" ? (
                  <XCircle className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                {payment.status}
              </Badge>
              {payment.used && (
                <Badge variant="outline" className="text-xs font-medium">
                  Redeemed
                </Badge>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" />
                  Date
                </div>
                <p className="font-medium text-sm text-heading">
                  {createdAt
                    ? formatDateTime(createdAt, {
                        tz: displayTz,
                        dateStyle: "long",
                        timeStyle: "short",
                      })
                    : "N/A"}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5" />
                  Plan
                </div>
                <p className="font-medium text-sm text-heading capitalize">
                  {payment.tier || "Standard"} plan
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                <CreditCard className="w-3.5 h-3.5" />
                Transaction ID (ref)
              </div>
              <p className="font-mono text-xs bg-muted/50 p-2 rounded-lg break-all">
                {payment.referenceId || "N/A"}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                <Hash className="w-3.5 h-3.5" />
                Order ID
              </div>
              <p className="font-mono text-xs bg-muted/50 p-2 rounded-lg break-all">
                {payment.providerId || "N/A"}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                <Hash className="w-3.5 h-3.5" />
                Payment ID (internal)
              </div>
              <p className="font-mono text-xs bg-muted/50 p-2 rounded-lg text-muted-foreground">
                {payment.id}
              </p>
            </div>

            {payment.festival && (
              <div className="space-y-1 pt-2 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  <Box className="w-3.5 h-3.5" />
                  Linked festival
                </div>
                <p className="font-medium text-primary">
                  {payment.festival.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
