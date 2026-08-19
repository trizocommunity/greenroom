"use client";

import { format } from "date-fns";
import { AlertCircle, Loader2, Lock, ScanLine, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QrScanner } from "@/components/festival/event-works/programme-reporting/QrScanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useLiveChannel } from "@/hooks/use-live-channel";
import {
  getFilteredEntriesAction,
  scanFoodEntryAction,
} from "../actions/food-entry.actions";

interface FoodEntryScannerProps {
  festivalId: string;
  todayString: string;
  slot: {
    id: string;
    name: string;
    windowStartMin: number;
    windowEndMin: number;
    sessionId: string | null;
    sessionStatus: "OPEN" | "CLOSED";
    scannedCount: number;
  };
  activeSlotId: string | null;
  filters: {
    groups: { id: string; name: string }[];
    categories: { id: string; name: string }[];
  };
}

function formatWindow(startMin: number, endMin: number) {
  const fmt = (min: number) => {
    const h = Math.floor(min / 60)
      .toString()
      .padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };
  return `${fmt(startMin)} - ${fmt(endMin)}`;
}

function formatScannedAt(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return format(d, "MMM d, hh:mm a");
}

export function FoodEntryScanner({
  festivalId,
  todayString,
  slot,
  activeSlotId,
  filters,
}: FoodEntryScannerProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [groupId, setGroupId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [date, setDate] = useState<Date>(
    () => new Date(`${todayString}T12:00:00`),
  );
  const [sessionStatus, setSessionStatus] = useState<"OPEN" | "CLOSED">(
    slot.sessionStatus,
  );

  const isScannable =
    slot.id === activeSlotId &&
    slot.sessionId !== null &&
    sessionStatus === "OPEN";

  useEffect(() => {
    setSessionStatus(slot.sessionStatus);
  }, [slot.sessionStatus]);

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true);
    const res = await getFilteredEntriesAction({
      festivalId,
      slotId: slot.id,
      date: format(date, "yyyy-MM-dd"),
      groupId: groupId !== "all" ? groupId : undefined,
      categoryId: categoryId !== "all" ? categoryId : undefined,
    });
    if (res.success) {
      setEntries(res.entries);
    }
    setLoadingEntries(false);
  }, [festivalId, slot.id, date, groupId, categoryId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  /* UC9 — food-hall per-slot channel. Other scanners (or the same one
     after a `scanFoodEntryAction` race) push a delta here; refresh the
     entries table on every event so the operator sees scans happen in
     near-real-time without manual reloads. */
  const { data: slotEvent } = useLiveChannel<{
    slotId: string;
    scannedAt: string;
  }>({
    url: `/api/v1/food-hall/${slot.id}/events/stream`,
  });

  useEffect(() => {
    if (!slotEvent) return;
    void fetchEntries();
  }, [slotEvent, fetchEntries]);

  const handleProcessScan = async (chestNumber: string) => {
    if (!slot.sessionId || !isScannable) {
      return {
        success: false,
        error: "Scanning is unavailable for this food slot.",
      };
    }

    const res = await scanFoodEntryAction({
      festivalId,
      sessionId: slot.sessionId,
      chestNumber: chestNumber.trim(),
    });

    if (res.success) {
      router.refresh();
      void fetchEntries();
      return {
        success: true,
        message: "Participant checked in for food successfully!",
        participant: res.entry?.participantId
          ? {
              id: res.entry.participantId,
              name: res.entry.participantName || "Unknown",
              chestNumber: res.entry.chestNumber || chestNumber,
            }
          : undefined,
      };
    } else {
      return {
        success: false,
        error: res.error || "Failed to check in participant.",
      };
    }
  };

  const clearFilters = () => {
    setGroupId("all");
    setCategoryId("all");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DrawerHeader className="shrink-0 text-left items-start">
        <DrawerTitle className="flex items-center gap-2">
          <ScanLine className="h-5 w-5" />
          {slot.name}
        </DrawerTitle>
        <DrawerDescription>
          {formatWindow(slot.windowStartMin, slot.windowEndMin)} ·{" "}
          <Badge
            variant={sessionStatus === "OPEN" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {sessionStatus}
          </Badge>
          {slot.id === activeSlotId && (
            <Badge variant="outline" className="text-[10px] ml-2">
              Active
            </Badge>
          )}
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex-1 overflow-y-auto space-y-4 py-6">
        {!isScannable ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium">Scanner Locked</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Scanning is available only during this slot&apos;s active time.
              Use the filters below to review scanned participants.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Scan Participant</h3>
              <p className="text-sm text-muted-foreground">
                {slot.scannedCount} scanned today · camera opens automatically
              </p>
            </div>
            <QrScanner
              festivalId={festivalId}
              processAction={handleProcessScan}
              mode="camera"
              variant="embedded"
              autoStart
            />
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Recent Scans
          </h3>
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

            <DatePicker
              date={date}
              onChange={(d) => d && setDate(d)}
              className="w-full sm:w-[180px]"
            />

            {(groupId !== "all" || categoryId !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>

          {loadingEntries ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No entries match the selected filters.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
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
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-sm">
                          {entry.chestNumber}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.participantName}
                        </TableCell>
                        <TableCell>{entry.groupName ?? "—"}</TableCell>
                        <TableCell>{entry.categoryName ?? "—"}</TableCell>
                        <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                          {formatScannedAt(entry.scannedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.scannedByName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">
                        {entry.chestNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatScannedAt(entry.scannedAt)}
                      </span>
                    </div>
                    <p className="font-medium text-sm">
                      {entry.participantName}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Group: {entry.groupName ?? "—"}</span>
                      <span>Category: {entry.categoryName ?? "—"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scanned by: {entry.scannedByName ?? "—"}
                    </p>
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
