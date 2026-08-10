import { CreditCard, History, IndianRupee } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { ViewDetailsDialog } from "@/components/admin/ViewDetailsDialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/core/datetime";
import { adminService } from "@/features/admin/services/admin.service";

function getPaymentStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status.toLowerCase()) {
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
    case "refunded":
      return "secondary";
    default:
      return "outline";
  }
}

export default async function AdminPaymentsPage() {
  const payments = await adminService.getPaymentsForAdmin();

  const totalRevenue = payments
    .filter((p) => p.status === "PAID" || (p.status as string) === "captured")
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Payments
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Financial records and platform transactions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="rounded-2xl border-border bg-card w-full md:w-auto">
            <CardContent className="py-2 px-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <IndianRupee className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                  Total revenue
                </div>
                <div className="text-lg font-semibold leading-none tracking-tight">
                  ₹{totalRevenue}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-2xl border-border shadow-premium overflow-hidden">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">
                Recent transactions
              </CardTitle>
              <CardDescription className="text-xs">
                Live logs of all platform payments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <AdminEmptyState
              icon={<CreditCard className="h-8 w-8 text-primary" />}
              title="No payments recorded"
              description="Your financial logs are currently empty. Transactions will automatically appear here as users purchase plans."
            />
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-xl border border-border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-lg font-semibold text-success tracking-tight">
                          ₹{payment.amount}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          INR
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant={getPaymentStatusVariant(payment.status)}
                          className="font-medium text-[10px] uppercase tracking-wide px-2 h-5"
                        >
                          {payment.status}
                        </Badge>
                        <ViewDetailsDialog
                          title="Payment Details"
                          description={`Reference: ${payment.referenceId}`}
                          data={payment}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {payment.user.fullName || "User"}
                      </span>
                      <span className="text-[11px] text-muted-foreground break-all">
                        {payment.user.email}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-[10px] font-medium tracking-wide text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border break-all">
                        {payment.providerId}
                      </code>
                      {payment.festival ? (
                        <span className="text-xs font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                          {payment.festival.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Generic credit
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground border-t border-border pt-2">
                      {formatDate(payment.createdAt, {
                        tz: "UTC",
                        style: "medium",
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        Amount
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        User
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        Reference
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        Context
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">
                        Date
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow
                        key={payment.id}
                        className="group hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-semibold text-success tracking-tight">
                              ₹{payment.amount}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              INR
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {payment.user.fullName || "User"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {payment.user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-0.5">
                            <code className="text-[10px] font-medium tracking-wide text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border w-fit">
                              {payment.providerId}
                            </code>
                            <span className="text-[10px] text-muted-foreground px-1.5">
                              {payment.referenceId || "No ref"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {payment.festival ? (
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                              <span className="text-xs font-medium">
                                {payment.festival.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Generic credit
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant={getPaymentStatusVariant(payment.status)}
                            className="font-medium text-[10px] uppercase tracking-wide px-2 h-5"
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(payment.createdAt, {
                              tz: "UTC",
                              style: "medium",
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <ViewDetailsDialog
                            title="Payment Details"
                            description={`Reference: ${payment.referenceId}`}
                            data={payment}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
