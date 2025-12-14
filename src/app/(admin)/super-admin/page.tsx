import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Shield } from "lucide-react";

export default async function SuperAdminDashboard() {
  // Fetch real analytics
  const totalUsers = await prisma.user.count();
  
  const activeUsers = await prisma.user.count({
      where: { isActive: true }
  });

  const superAdmins = await prisma.user.count({
      where: { globalRole: "SUPER_ADMIN" }
  });

  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered on the platform</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently active accounts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{superAdmins}</div>
            <p className="text-xs text-muted-foreground">With full access</p>
        </CardContent>
      </Card>

      {/* Placeholder for future charts/grids */}
      <div className="aspect-video rounded-xl bg-muted/50 md:col-span-3 min-h-[300px] flex items-center justify-center text-muted-foreground">
          Analytics Charts Placeholder
      </div>
    </div>
  );
}
