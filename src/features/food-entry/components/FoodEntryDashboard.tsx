"use client";

import { QrCode, Settings } from "lucide-react";
import { useState } from "react";
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
import { FoodEntryConfig } from "./FoodEntryConfig";
import { FoodEntryScanner } from "./FoodEntryScanner";

interface FoodEntryDashboardProps {
  festivalId: string;
  initialData: {
    slots: any[];
    sessions: any[];
    activeSessionId: string | null;
    todayString: string;
    recentEntries?: any[];
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

export function FoodEntryDashboard({
  festivalId,
  initialData,
  role,
}: FoodEntryDashboardProps) {
  const isAdmin = ["ADMIN", "OWNER", "SUPER_ADMIN"].includes(role);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [configOpen, setConfigOpen] = useState(false);

  const selectedSession = initialData.sessions.find(
    (s) => s.id === selectedSessionId,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Food Hall Entry</h2>
        {isAdmin && (
          <Button variant="outline" onClick={() => setConfigOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        )}
      </div>

      {/* Slots table */}
      <div className="space-y-3 pt-4">
        <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Today&apos;s Sessions
        </h3>

        {initialData.sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p>No food sessions configured for today.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg border overflow-x-auto bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Time Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Scanned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.sessions.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedSessionId(s.id)}
                    >
                      <TableCell className="font-medium">
                        {s.slotName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatWindow(s.windowStartMin, s.windowEndMin)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === "OPEN" ? "default" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {s.status}
                        </Badge>
                        {s.id === initialData.activeSessionId && (
                          <Badge variant="outline" className="text-[10px] ml-2">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {s.scannedCount ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {initialData.sessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50 active:bg-muted/70"
                  onClick={() => setSelectedSessionId(s.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{s.slotName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatWindow(s.windowStartMin, s.windowEndMin)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={s.status === "OPEN" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {s.status}
                      </Badge>
                      {s.id === initialData.activeSessionId && (
                        <Badge variant="outline" className="text-[10px]">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Scanned:{" "}
                      <span className="font-mono">{s.scannedCount ?? 0}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Session drawer */}
      <Drawer
        open={!!selectedSessionId}
        onOpenChange={(open) => !open && setSelectedSessionId(null)}
      >
        <DrawerContent>
          {selectedSession && (
            <div className="flex flex-col h-full overflow-hidden">
              <FoodEntryScanner
                festivalId={festivalId}
                session={selectedSession}
                activeSessionId={initialData.activeSessionId}
                filters={initialData.filters}
              />
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Config drawer */}
      <Drawer open={configOpen} onOpenChange={setConfigOpen}>
        <DrawerContent>
          <div className="flex flex-col h-full overflow-hidden">
            <DrawerHeader className="shrink-0 text-left items-start !text-left">
              <DrawerTitle>Food Sessions Configuration</DrawerTitle>
              <DrawerDescription>
                Define the daily food sessions and their active time windows.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto min-h-0">
              <FoodEntryConfig
                festivalId={festivalId}
                initialSlots={initialData.slots}
                onSaved={() => setConfigOpen(false)}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
