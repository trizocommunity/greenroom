import { eq } from "drizzle-orm";
import { Shield, UserCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { user } from "@/core/database/schema";
import { countUsers } from "@/features/auth/repositories/user.repository";

export default async function SuperAdminDashboard() {
  const totalUsers = await countUsers();
  const activeUsers = await countUsers(eq(user.isActive, true));
  const superAdmins = await countUsers(eq(user.globalRole, "SUPER_ADMIN"));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your platform statistics
        </p>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">
              {totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered on the platform
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active users
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">
              {activeUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active accounts
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Super admins
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">
              {superAdmins}
            </div>
            <p className="text-xs text-muted-foreground">With full access</p>
          </CardContent>
        </Card>

        {/* Placeholder for future charts/grids */}
        <div className="aspect-video rounded-2xl border border-dashed border-border bg-muted/30 md:col-span-3 min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          Analytics charts placeholder
        </div>
      </div>
    </div>
  );
}
