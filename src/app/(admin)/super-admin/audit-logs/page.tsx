import { format } from "date-fns";
import { Activity, ShieldCheck, Terminal } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AuditLogSearch } from "@/components/admin/AuditLogSearch";
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
import { getAuditLogs } from "@/server/services/audit-log.service";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams?.q || "";
  const logs = await getAuditLogs({ search: query });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase">
            Audit Logs
          </h2>
          <p className="text-muted-foreground font-medium">
            System activity and security trail
          </p>
        </div>
        <div className="flex items-center gap-4">
          <AuditLogSearch />
          <div className="p-3 bg-primary/5 rounded-2xl border border-primary/20 backdrop-blur-sm">
            <ShieldCheck className="w-8 h-8 text-primary opacity-60" />
          </div>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-background/50 backdrop-blur-sm ring-1 ring-border/50 overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Terminal className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-tight uppercase">
                System Logs
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Immutable record of governance actions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <AdminEmptyState
              icon={
                <Activity className="h-10 w-10 text-primary animate-pulse" />
              }
              title="No Logs Available"
              description="Your audit trail is currently empty. All administrative actions are logged here for security and accountability."
            />
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest">
                    Time
                  </TableHead>
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest">
                    Action
                  </TableHead>
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest">
                    Target
                  </TableHead>
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest">
                    Actor
                  </TableHead>
                  <TableHead className="py-4 font-black text-xs uppercase tracking-widest">
                    Metadata
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="group hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-foreground">
                          {format(log.createdAt, "MMM d, yyyy")}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground opacity-60">
                          {format(log.createdAt, "HH:mm:ss")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className="font-black text-[10px] uppercase tracking-wider px-2 h-5 border-primary/20 bg-primary/5 text-primary"
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-foreground">
                          {log.targetType}
                        </span>
                        <span
                          className="text-[10px] font-medium text-muted-foreground font-mono opacity-60 truncate w-32"
                          title={log.targetId}
                        >
                          {log.targetId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                          {log.actorRole}
                        </span>
                        {log.actor ? (
                          <>
                            <span
                              className="text-xs font-bold text-foreground truncate w-32"
                              title={log.actor.fullName || ""}
                            >
                              {log.actor.fullName || "Unnamed User"}
                            </span>
                            <span
                              className="text-[10px] font-medium text-muted-foreground font-mono opacity-60 truncate w-32"
                              title={log.actor.email}
                            >
                              {log.actor.email}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground font-mono opacity-60 truncate w-24">
                            {log.actorId}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="max-w-[250px] truncate rounded bg-muted/50 px-2 py-1 border border-border/50 text-[10px] font-mono text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
