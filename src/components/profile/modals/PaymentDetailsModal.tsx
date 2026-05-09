"use client";

import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseStoredInstant } from "@/core/utils/date-time";

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
  if (!payment) return null;
  const createdAt = payment.createdAt
    ? parseStoredInstant(payment.createdAt)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/50 p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Receipt className="w-5 h-5 text-primary" />
            Payment Details
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col items-center justify-center py-6 bg-muted/30 rounded-2xl border border-border/50">
            <h3 className="text-3xl font-black tracking-tighter">
              {payment.amount?.toLocaleString() || 0} {payment.currency}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant={payment.status === "PAID" ? "default" : "secondary"}
                className={`flex items-center gap-1 ${
                  payment.status === "PAID"
                    ? "bg-green-500 hover:bg-green-600"
                    : payment.status === "FAILED"
                      ? "bg-red-500 hover:bg-red-600"
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
                <Badge variant="outline" className="text-xs">
                  REDEEMED
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
                <p className="font-semibold text-sm">
                  {createdAt ? format(createdAt, "PPP p") : "N/A"}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5" />
                  Plan
                </div>
                <p className="font-semibold text-sm capitalize">
                  {payment.tier || "Standard"} Plan
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                <CreditCard className="w-3.5 h-3.5" />
                Transaction ID (Ref)
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
                Payment ID (Internal)
              </div>
              <p className="font-mono text-xs bg-muted/50 p-2 rounded-lg text-muted-foreground">
                {payment.id}
              </p>
            </div>

            {payment.festival && (
              <div className="space-y-1 pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  <Box className="w-3.5 h-3.5" />
                  Linked Festival
                </div>
                <p className="font-semibold text-primary">
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
