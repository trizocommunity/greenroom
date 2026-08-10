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
import { getAuditLogs } from "@/features/auth/services/audit-log.service";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q || "";
  const logs = await getAuditLogs({ search: query });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Audit logs
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            System activity and security trail
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex-1 md:flex-none">
            <AuditLogSearch />
          </div>
          <div className="hidden sm:block p-3 rounded-2xl border border-border bg-card shrink-0">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border-border shadow-premium overflow-hidden">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Terminal className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">
                System logs
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable record of governance actions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <AdminEmptyState
              icon={<Activity className="h-8 w-8 text-primary" />}
              title="No logs available"
              description="Your audit trail is currently empty. All administrative actions are logged here for security and accountability."
            />
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="font-medium text-[10px] uppercase tracking-wide px-2 h-5 border-primary/20 bg-primary/5 text-primary"
                      >
                        {log.action}
                      </Badge>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {format(log.createdAt, "MMM d, HH:mm")}
                        </span>
                        <ViewDetailsDialog
                          title="Audit Log Details"
                          description={`Action: ${log.action} | Time: ${format(log.createdAt, "PPpp")}`}
                          data={log}
                          type="audit"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Target
                        </span>
                        <span className="font-medium text-foreground">
                          {log.targetType}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate">
                          {log.targetId}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Actor
                        </span>
                        {log.actor ? (
                          <>
                            <span className="font-medium text-foreground truncate">
                              {(log.actor as { fullName?: string | null })
                                .fullName || "Unnamed User"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              {(log.actor as { email?: string | null }).email}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono truncate">
                            {log.actorId}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="truncate rounded-md bg-muted/50 px-2 py-1 border border-border text-[10px] font-mono text-muted-foreground">
                      {JSON.stringify(log.metadata)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        Time
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        Action
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        Target
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        Actor
                      </TableHead>
                      <TableHead className="py-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
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
                            <span className="text-xs font-medium text-foreground">
                              {format(log.createdAt, "MMM d, yyyy")}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(log.createdAt, "HH:mm:ss")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className="font-medium text-[10px] uppercase tracking-wide px-2 h-5 border-primary/20 bg-primary/5 text-primary"
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-foreground">
                              {log.targetType}
                            </span>
                            <span
                              className="text-[10px] text-muted-foreground font-mono truncate w-32"
                              title={log.targetId}
                            >
                              {log.targetId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {log.actorRole}
                            </span>
                            {log.actor ? (
                              <>
                                <span
                                  className="text-xs font-medium text-foreground truncate w-32"
                                  title={
                                    (log.actor as { fullName?: string | null })
                                      .fullName || ""
                                  }
                                >
                                  {(log.actor as { fullName?: string | null })
                                    .fullName || "Unnamed User"}
                                </span>
                                <span
                                  className="text-[10px] text-muted-foreground font-mono truncate w-32"
                                  title={
                                    (log.actor as { email?: string | null })
                                      .email || ""
                                  }
                                >
                                  {
                                    (log.actor as { email?: string | null })
                                      .email
                                  }
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-mono truncate w-24">
                                {log.actorId}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="max-w-[250px] truncate rounded-md bg-muted/50 px-2 py-1 border border-border text-[10px] font-mono text-muted-foreground">
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
