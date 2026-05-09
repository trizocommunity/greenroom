import { format } from "date-fns";
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
import { parseStoredInstant } from "@/core/utils/date-time";
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
          <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase">
            Payments
          </h2>
          <p className="text-muted-foreground font-medium">
            Financial records and platform transactions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="bg-primary/5 border-primary/20 backdrop-blur-sm">
            <CardContent className="py-2 px-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <IndianRupee className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">
                  Total Rev
                </div>
                <div className="text-lg font-black leading-none">
                  ₹{totalRevenue}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-background/50 backdrop-blur-sm ring-1 ring-border/50 overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-tight uppercase">
                Recent Transactions
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Live logs of all platform payments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <AdminEmptyState
              icon={
                <CreditCard className="h-10 w-10 text-primary animate-pulse" />
              }
              title="No Payments Recorded"
              description="Your financial logs are currently empty. Transactions will automatically appear here as users purchase plans."
            />
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest">
                    Amount
                  </TableHead>
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest">
                    User
                  </TableHead>
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest">
                    Reference
                  </TableHead>
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest">
                    Context
                  </TableHead>
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest">
                    Status
                  </TableHead>
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest text-right">
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
                        <span className="font-mono text-base font-black text-emerald-500 tracking-tighter">
                          ₹{payment.amount}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">
                          INR
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">
                          {payment.user.fullName || "User"}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground opacity-80">
                          {payment.user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-0.5">
                        <code className="text-[10px] font-black tracking-wider text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 w-fit">
                          {payment.providerId}
                        </code>
                        <span className="text-[10px] font-medium text-muted-foreground px-1.5">
                          {payment.referenceId || "No ref"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {payment.festival ? (
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                          <span className="text-xs font-bold">
                            {payment.festival.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-muted-foreground italic">
                          Generic Credit
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant={getPaymentStatusVariant(payment.status)}
                        className="font-black text-[10px] uppercase tracking-wider px-2 h-5"
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <span className="text-xs font-bold text-muted-foreground">
                        {format(parseStoredInstant(payment.createdAt), "MMM d, yyyy")}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
