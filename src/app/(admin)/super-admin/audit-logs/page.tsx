import { getAuditLogs } from "@/server/services/audit-log.service";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ViewDetailsDialog } from "@/components/admin/ViewDetailsDialog";

export default async function AdminAuditLogsPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">
          Record of all super admin actions
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Metadata</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {format(log.createdAt, "MMM d, yyyy HH:mm:ss")}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{log.action}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{log.targetType}</span>
                    <span
                      className="text-xs text-muted-foreground truncate w-32"
                      title={log.targetId}
                    >
                      {log.targetId}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">{log.actorRole}</span>
                    <span className="text-xs text-muted-foreground truncate w-24">
                      {log.actorId}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[300px] truncate text-xs font-mono text-muted-foreground">
                    {JSON.stringify(log.metadata)}
                  </div>
                </TableCell>
                <TableCell>
                  <ViewDetailsDialog
                    title="Audit Log Details"
                    description={`Action: ${log.action} | Time: ${format(log.createdAt, "PPpp")}`}
                    data={log}
                    type="audit"
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
