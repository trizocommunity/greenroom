import { format } from "date-fns";
import { ViewDetailsDialog } from "@/components/admin/ViewDetailsDialog";
import { Badge } from "@/components/ui/badge";
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

export default async function AdminUsersPage() {
  const users = await adminService.getUsersForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Users</h2>
        <p className="text-muted-foreground">View all registered users</p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Festival</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {user.fullName || user.displayName || "N/A"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      user.globalRole === "SUPER_ADMIN"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {user.globalRole}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.festivals && user.festivals.length > 0 ? (
                    user.festivals[0].name
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {format(parseStoredInstant(user.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ViewDetailsDialog
                    title="User Details"
                    description={`User ID: ${user.id}`}
                    data={user}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
