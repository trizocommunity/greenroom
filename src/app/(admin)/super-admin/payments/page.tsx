import { CreditCard } from "lucide-react";
import { PaymentsTable } from "@/components/super-admin/PaymentsTable";
import { Separator } from "@/components/ui/separator";

export default function PaymentsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Payments
          </h1>
          <p className="text-muted-foreground">
            View and manage all payment transactions on the platform
          </p>
        </div>
      </div>
      <Separator />
      <PaymentsTable />
    </div>
  );
}
