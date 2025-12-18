import { UsersTable } from "@/components/super-admin/UsersTable";
import { Separator } from "@/components/ui/separator";

export default function UsersPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage all registered users on the platform
          </p>
        </div>
      </div>
      <Separator />
      <UsersTable />
    </div>
  );
}
