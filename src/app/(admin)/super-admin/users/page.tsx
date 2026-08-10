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
import { formatDate } from "@/core/datetime";
import { adminService } from "@/features/admin/services/admin.service";

export default async function AdminUsersPage() {
  const users = await adminService.getUsersForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Users
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          View all registered users
        </p>
      </div>

      {/* Mobile: stacked cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-2xl border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">
                  {user.fullName || user.displayName || "N/A"}
                </span>
                <span className="text-xs text-muted-foreground break-all">
                  {user.email}
                </span>
              </div>
              <div className="shrink-0">
                <ViewDetailsDialog
                  title="User Details"
                  description={`User ID: ${user.id}`}
                  data={user}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  user.globalRole === "SUPER_ADMIN" ? "destructive" : "outline"
                }
              >
                {user.globalRole}
              </Badge>
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-muted-foreground">Festival</span>
                <span className="font-medium truncate">
                  {user.festivals && user.festivals.length > 0
                    ? user.festivals[0].name
                    : "-"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">
                  {formatDate(user.createdAt, { tz: "UTC", style: "medium" })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
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
                <TableCell className="whitespace-nowrap">
                  {formatDate(user.createdAt, { tz: "UTC", style: "medium" })}
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
