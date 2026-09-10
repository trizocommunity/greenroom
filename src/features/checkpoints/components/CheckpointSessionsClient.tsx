"use client";

import { format } from "date-fns";
import { CircleStop, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateFilterCombobox } from "@/components/ui/date-filter-combobox";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { toggleSessionStatusAction } from "../actions/checkpoint.actions";
import {
  CheckpointScanner,
  type CheckpointSessionView,
} from "./CheckpointScanner";
import { DeleteSessionDialog } from "./DeleteSessionDialog";
import { StartSessionDialog, type StartedSession } from "./StartSessionDialog";

interface SessionRow {
  id: string;
  name: string;
  sessionDate: string;
  windowStartMin: number | null;
  windowEndMin: number | null;
  status: "OPEN" | "CLOSED";
  scannedCount: number;
  checkpointName: string;
}

interface CheckpointSessionsClientProps {
  festivalId: string;
  basePath: string;
  checkpoint: {
    id: string;
    name: string;
    requiresWindow: boolean;
    isBuiltIn: boolean;
  };
  initialSessions: SessionRow[];
  dates: string[];
  filters: {
    groups: { id: string; name: string }[];
    categories: { id: string; name: string }[];
  };
  todayString: string;
  openSessionId?: string;
}

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

function labelForDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return format(new Date(y, m - 1, d, 12, 0), "MMM d, yyyy");
}

export function CheckpointSessionsClient({
  festivalId,
  basePath,
  checkpoint,
  initialSessions,
  dates,
  filters,
  todayString,
  openSessionId,
}: CheckpointSessionsClientProps) {
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    openSessionId ?? null,
  );
  const [closingId, setClosingId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const availableDates = useMemo(
    () => dates.map((key) => ({ key, label: labelForDate(key) })),
    [dates],
  );

  const selectedKeys = useMemo(
    () => new Set(selectedDates.map((d) => format(d, "yyyy-MM-dd"))),
    [selectedDates],
  );

  const filteredSessions = useMemo(() => {
    if (selectedKeys.size === 0) return sessions;
    return sessions.filter((s) => selectedKeys.has(s.sessionDate));
  }, [sessions, selectedKeys]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const selectedView: CheckpointSessionView | null = selectedSession
    ? {
        id: selectedSession.id,
        name: selectedSession.name,
        checkpointName: selectedSession.checkpointName,
        windowStartMin: selectedSession.windowStartMin,
        windowEndMin: selectedSession.windowEndMin,
        status: selectedSession.status,
        scannedCount: selectedSession.scannedCount,
      }
    : null;

  const handleStarted = (started: StartedSession) => {
    const row: SessionRow = {
      id: started.id,
      name: started.name,
      sessionDate: started.sessionDate,
      windowStartMin: started.windowStartMin,
      windowEndMin: started.windowEndMin,
      status: started.status,
      scannedCount: started.scannedCount,
      checkpointName: checkpoint.name,
    };
    setSessions((prev) => [row, ...prev.filter((s) => s.id !== row.id)]);
    setSelectedSessionId(started.id);
  };

  const handleCloseSession = async (id: string) => {
    setClosingId(id);
    const res = await toggleSessionStatusAction({
      festivalId,
      sessionId: id,
      status: "CLOSED",
    });
    setClosingId(null);
    if (res.success) {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "CLOSED" } : s)),
      );
    }
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (selectedSessionId === id) setSelectedSessionId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-xl font-bold tracking-tight">{checkpoint.name}</h2>
        <div className="flex items-center gap-2">
          <DateFilterCombobox
            value={selectedDates}
            onChange={setSelectedDates}
            availableDates={availableDates}
            placeholder="All dates"
            className="w-1/2 sm:w-[160px]"
          />
          <StartSessionDialog
            festivalId={festivalId}
            basePath={basePath}
            todayString={todayString}
            fixedCheckpointId={checkpoint.id}
            checkpoints={[
              {
                id: checkpoint.id,
                name: checkpoint.name,
                requiresWindow: checkpoint.requiresWindow,
              },
            ]}
            onStarted={handleStarted}
          />
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>No sessions yet. Start one to begin scanning.</p>
        </div>
      ) : (
        <div className="space-y-2 mt-8">
          <hr className="pb-5 sm:hidden" />
          {filteredSessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-1 rounded-lg border bg-card px-2 py-2 transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              <button
                type="button"
                onClick={() => setSelectedSessionId(s.id)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 py-1 text-left"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatWindow(s.windowStartMin, s.windowEndMin)} ·{" "}
                    {labelForDate(s.sessionDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    <span className="font-mono font-medium text-foreground">
                      {s.scannedCount}
                    </span>{" "}
                    scanned
                  </span>
                  <Badge
                    variant={s.status === "OPEN" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {s.status}
                  </Badge>
                </div>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                {s.status === "OPEN" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleCloseSession(s.id)}
                    disabled={closingId === s.id}
                    aria-label={`Close session ${s.name}`}
                    title="Close session"
                  >
                    {closingId === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CircleStop className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <DeleteSessionDialog
                  festivalId={festivalId}
                  session={{
                    id: s.id,
                    name: s.name,
                    scannedCount: s.scannedCount,
                  }}
                  onDeleted={() => handleDeleteSession(s.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={!!selectedSessionId}
        onOpenChange={(open) => !open && setSelectedSessionId(null)}
      >
        <DrawerContent>
          {selectedView && (
            <CheckpointScanner
              festivalId={festivalId}
              session={selectedView}
              filters={filters}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
