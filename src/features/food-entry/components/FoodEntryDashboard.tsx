"use client";

import { QrCode, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type FoodSlotStatus,
  getFoodSlotStatus,
} from "../services/food-entry.active";
import { FoodEntryConfig } from "./FoodEntryConfig";
import { FoodEntryScanner } from "./FoodEntryScanner";

type FoodSlot = {
  id: string;
  name: string;
  slotOrder: number;
  windowStartMin: number;
  windowEndMin: number;
};

type TodaySession = {
  sessionId: string;
  status: "OPEN" | "CLOSED";
  scannedCount: number;
};

type SlotRow = FoodSlot & {
  sessionId: string | null;
  sessionStatus: "OPEN" | "CLOSED";
  scannedCount: number;
  status: FoodSlotStatus;
};

interface FoodEntryDashboardProps {
  festivalId: string;
  initialData: {
    slots: FoodSlot[];
    todaySessionsBySlotId: Record<string, TodaySession>;
    todayString: string;
    filters: {
      groups: { id: string; name: string }[];
      categories: { id: string; name: string }[];
    };
  };
  role: "ADMIN" | "OWNER" | "VOLUNTEER" | "SUPER_ADMIN";
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

function statusVariant(status: FoodSlotStatus) {
  if (status === "ACTIVE") return "default" as const;
  return "secondary" as const;
}

export function FoodEntryDashboard({
  festivalId,
  initialData,
  role,
}: FoodEntryDashboardProps) {
  const isAdmin = ["ADMIN", "OWNER", "SUPER_ADMIN"].includes(role);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const slotRows: SlotRow[] = initialData.slots
    .map((slot) => {
      const todaySession = initialData.todaySessionsBySlotId[slot.id];
      return {
        ...slot,
        sessionId: todaySession?.sessionId ?? null,
        sessionStatus: todaySession?.status ?? "OPEN",
        scannedCount: todaySession?.scannedCount ?? 0,
        status: getFoodSlotStatus(now, slot),
      };
    })
    .sort((a, b) => {
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
      return a.slotOrder - b.slotOrder;
    });
  const activeSlotId =
    slotRows.find((slot) => slot.status === "ACTIVE")?.id ?? null;
  const selectedSlot = slotRows.find((slot) => slot.id === selectedSlotId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Food Hall Entry</h2>
        {isAdmin && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setConfigOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        )}
      </div>

      <div className="space-y-3 pt-4">
        <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Food Slots
        </h3>

        {slotRows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p>No food slots configured.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-lg border overflow-x-auto bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slot</TableHead>
                    <TableHead>Time Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Scanned Today</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slotRows.map((slot) => (
                    <TableRow
                      key={slot.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedSlotId(slot.id)}
                    >
                      <TableCell className="font-medium">{slot.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatWindow(slot.windowStartMin, slot.windowEndMin)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariant(slot.status)}
                          className="text-[10px]"
                        >
                          {slot.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {slot.scannedCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {slotRows.map((slot) => (
                <button
                  type="button"
                  key={slot.id}
                  className="w-full bg-card rounded-lg border p-4 space-y-3 cursor-pointer text-left hover:bg-muted/50 active:bg-muted/70"
                  onClick={() => setSelectedSlotId(slot.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{slot.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatWindow(slot.windowStartMin, slot.windowEndMin)}
                      </p>
                    </div>
                    <Badge
                      variant={statusVariant(slot.status)}
                      className="text-[10px]"
                    >
                      {slot.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Scanned today:{" "}
                    <span className="font-mono">{slot.scannedCount}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Drawer
        open={!!selectedSlotId}
        onOpenChange={(open) => !open && setSelectedSlotId(null)}
      >
        <DrawerContent>
          {selectedSlot && (
            <div className="flex flex-col h-full overflow-hidden">
              <FoodEntryScanner
                festivalId={festivalId}
                todayString={initialData.todayString}
                slot={selectedSlot}
                activeSlotId={activeSlotId}
                filters={initialData.filters}
              />
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Drawer open={configOpen} onOpenChange={setConfigOpen}>
        <DrawerContent className="max-h-[85vh] sm:max-w-[640px]">
          <FoodEntryConfig
            festivalId={festivalId}
            initialSlots={initialData.slots}
            onSaved={() => {
              setConfigOpen(false);
              window.location.reload();
            }}
            onCancel={() => setConfigOpen(false)}
          />
        </DrawerContent>
      </Drawer>
    </div>
  );
}
