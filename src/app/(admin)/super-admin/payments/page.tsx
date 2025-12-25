import { adminService } from "@/server/services/admin.service";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
        <p className="text-muted-foreground">
          Financial records and transactions
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <span className="font-mono text-base font-bold text-emerald-500 tracking-tight">
                    {payment.currency} {payment.amount}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{payment.user.email}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-xs">
                    <span>{payment.providerId}</span>
                    <span className="text-muted-foreground">
                      {payment.referenceId}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    {payment.festival && (
                      <span>Fest: {payment.festival.name}</span>
                    )}
                    {payment.edition && (
                      <span>
                        Edt:{" "}
                        {payment.edition.name ||
                          `No. ${payment.edition.number}`}
                      </span>
                    )}
                    {!payment.festival && !payment.edition && (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getPaymentStatusVariant(payment.status)}>
                    {payment.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(payment.createdAt, "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
