"use client";

import { format } from "date-fns";
import { AlertCircle, Camera, Loader2, Lock, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QrScanner } from "@/components/festival/event-works/programme-reporting/QrScanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/core/utils/cn";
import { useLiveChannel } from "@/hooks/use-live-channel";
import {
  getRosterAction,
  getSessionScansAction,
  getSessionStatusAction,
  scanCheckpointAction,
} from "../actions/checkpoint.actions";

export interface CheckpointSessionView {
  id: string;
  name: string;
  checkpointName: string;
  windowStartMin: number | null;
  windowEndMin: number | null;
  status: "OPEN" | "CLOSED";
  scannedCount: number;
}

interface Filters {
  groups: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

interface CheckpointScannerProps {
  festivalId: string;
  session: CheckpointSessionView;
  filters: Filters;
}

type Scan = {
  id: string;
  chestNumber: string;
  scannedAt: string;
  scannedByName: string | null;
  participantName: string;
  groupName: string | null;
  categoryName: string | null;
};

type RosterRow = {
  participantId: string;
  participantName: string;
  chestNumber: string | null;
  groupName: string | null;
  categoryName: string | null;
  present: boolean;
};

function fmtMin(min: number) {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatWindow(start: number | null, end: number | null) {
  if (start == null) return "Not timed";
  if (end == null) return `from ${fmtMin(start)}`;
  return `${fmtMin(start)} – ${fmtMin(end)}`;
}

function formatScannedAt(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return format(d, "MMM d, hh:mm a");
}

export function CheckpointScanner({
  festivalId,
  session,
  filters,
}: CheckpointScannerProps) {
  const router = useRouter();
  const [view, setView] = useState<"scanned" | "absent">("scanned");
  const [scans, setScans] = useState<Scan[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupId, setGroupId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [status, setStatus] = useState<"OPEN" | "CLOSED">(session.status);
  const [cameraOpen, setCameraOpen] = useState(false);

  const isScannable = status === "OPEN";

  useEffect(() => {
    setStatus(session.status);
  }, [session.status]);

  // Closing the session must also close the camera.
  useEffect(() => {
    if (!isScannable) setCameraOpen(false);
  }, [isScannable]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const filterArgs = {
      groupId: groupId !== "all" ? groupId : undefined,
      categoryId: categoryId !== "all" ? categoryId : undefined,
    };
    if (view === "scanned") {
      const res = await getSessionScansAction({
        sessionId: session.id,
        ...filterArgs,
      });
      if (res.success) setScans(res.scans);
    } else {
      const res = await getRosterAction({
        festivalId,
        sessionId: session.id,
        ...filterArgs,
      });
      if (res.success) setRoster(res.roster);
    }
    setLoading(false);
  }, [festivalId, session.id, view, groupId, categoryId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Live scan feed for this session; refetch the current view on every event.
  const { data: liveEvent, status: liveStatus } = useLiveChannel<{
    chestNumber: string;
    scannedAt: string;
  }>({
    url: `/api/v1/checkpoints/${session.id}/events/stream`,
  });

  useEffect(() => {
    if (!liveEvent) return;
    void fetchData();
  }, [liveEvent, fetchData]);

  // Polling fallback for connections that can't hold the stream open.
  useEffect(() => {
    if (liveStatus === "open") return;
    const id = window.setInterval(() => void fetchData(), 30_000);
    return () => window.clearInterval(id);
  }, [fetchData, liveStatus]);

  const handleProcessScan = async (chestNumber: string) => {
    if (!isScannable) {
      return { success: false, error: "This session is closed." };
    }
    const res = await scanCheckpointAction({
      festivalId,
      sessionId: session.id,
      chestNumber: chestNumber.trim(),
    });
    if (res.success) {
      router.refresh();
      void fetchData();
      return {
        success: true,
        message: `Scanned for ${session.checkpointName}.`,
        participant: res.participant,
      };
    }
    return { success: false, error: res.error || "Failed to scan." };
  };

  // Reflect an unattended server auto-close: while OPEN, poll the session
  // status so the drawer disables the camera and shows the closed note without
  // needing a manual refresh.
  useEffect(() => {
    if (status !== "OPEN") return;
    const id = window.setInterval(async () => {
      const res = await getSessionStatusAction({
        festivalId,
        sessionId: session.id,
      });
      if (res.success && res.status === "CLOSED") setStatus("CLOSED");
    }, 60_000);
    return () => window.clearInterval(id);
  }, [festivalId, session.id, status]);

  const absentList = roster.filter((r) => !r.present);
  const presentCount = roster.length - absentList.length;

  const filterControls = (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select value={groupId} onValueChange={setGroupId}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All groups" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All groups</SelectItem>
          {filters.groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {filters.categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(groupId !== "all" || categoryId !== "all") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setGroupId("all");
            setCategoryId("all");
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DrawerHeader className="shrink-0 text-left">
        <div className="flex items-start justify-between gap-2">
          <DrawerTitle className="flex items-center gap-2 min-w-0">
            <ScanLine className="h-5 w-5 shrink-0" />
            <span className="truncate">
              {session.checkpointName} · {session.name}
            </span>
          </DrawerTitle>
          {isScannable && (
            <Button
              size="sm"
              variant={cameraOpen ? "secondary" : "default"}
              className="shrink-0"
              onClick={() => setCameraOpen((v) => !v)}
            >
              <Camera className="mr-2 h-4 w-4" />
              {cameraOpen ? "Close camera" : "Open camera"}
            </Button>
          )}
        </div>
        <DrawerDescription className="flex items-center gap-2 flex-wrap">
          {formatWindow(session.windowStartMin, session.windowEndMin)}
          <Badge
            variant={status === "OPEN" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {status}
          </Badge>
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex-1 overflow-y-auto space-y-4 py-4">
        {cameraOpen && isScannable ? (
          <QrScanner
            festivalId={festivalId}
            processAction={handleProcessScan}
            mode="camera"
            variant="embedded"
            autoStart
          />
        ) : !isScannable ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium">Session closed</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              This session is closed. Start a new session from the checkpoint
              page to scan again. You can still review who was scanned and who
              is absent below.
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          {/* Scanned / absent toggle — full-width on mobile, inline with the
              group/category filters on desktop. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-full rounded-lg border bg-muted p-0.5 sm:w-auto">
              <button
                type="button"
                onClick={() => setView("scanned")}
                className={cn(
                  "flex-1 rounded-md px-4 py-1.5 text-sm transition-colors sm:flex-none",
                  view === "scanned"
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Scanned
              </button>
              <button
                type="button"
                onClick={() => setView("absent")}
                className={cn(
                  "flex-1 rounded-md px-4 py-1.5 text-sm transition-colors sm:flex-none",
                  view === "absent"
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Absent
              </button>
            </div>

            <div className="sm:ml-auto">{filterControls}</div>
          </div>

          {view === "absent" && !loading && roster.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{presentCount}</span>{" "}
              present ·{" "}
              <span className="font-medium text-foreground">
                {absentList.length}
              </span>{" "}
              absent
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : view === "scanned" ? (
            scans.length === 0 ? (
              <EmptyState label="No scans match the selected filters." />
            ) : (
              <>
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chest #</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Scanned At</TableHead>
                        <TableHead>Scanned By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scans.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-sm">
                            {s.chestNumber}
                          </TableCell>
                          <TableCell className="font-medium">
                            {s.participantName}
                          </TableCell>
                          <TableCell>{s.groupName ?? "—"}</TableCell>
                          <TableCell>{s.categoryName ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {formatScannedAt(s.scannedAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.scannedByName ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden space-y-3">
                  {scans.map((s) => (
                    <div key={s.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">
                          {s.chestNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatScannedAt(s.scannedAt)}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{s.participantName}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Group: {s.groupName ?? "—"}</span>
                        <span>Category: {s.categoryName ?? "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : absentList.length === 0 ? (
            <EmptyState
              label={
                roster.length === 0
                  ? "No participants match the selected filters."
                  : "Everyone in this filter has been scanned."
              }
            />
          ) : (
            <>
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chest #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absentList.map((r) => (
                      <TableRow key={r.participantId}>
                        <TableCell className="font-mono text-sm">
                          {r.chestNumber ?? "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.participantName}
                        </TableCell>
                        <TableCell>{r.groupName ?? "—"}</TableCell>
                        <TableCell>{r.categoryName ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {absentList.map((r) => (
                  <div
                    key={r.participantId}
                    className="rounded-lg border p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">
                        {r.chestNumber ?? "—"}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{r.participantName}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Group: {r.groupName ?? "—"}</span>
                      <span>Category: {r.categoryName ?? "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
