import { format } from "date-fns";
import { AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EnrichedScheduleEntry } from "@/features/schedule/actions/schedule.actions";

export type ScheduleConflictsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: Array<[EnrichedScheduleEntry, EnrichedScheduleEntry]>;
  onEdit: (entry: EnrichedScheduleEntry) => void;
  isReadOnly?: boolean;
};

function getEntryLabel(entry: EnrichedScheduleEntry): string {
  if (entry.type === "PROGRAMME" && entry.programme)
    return entry.programme.name;
  if (entry.type === "SESSION") return entry.title || "—";
  return "—";
}

export function ScheduleConflictsDrawer({
  open,
  onOpenChange,
  conflicts,
  onEdit,
  isReadOnly,
}: ScheduleConflictsDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Schedule Conflicts
          </DrawerTitle>
          <DrawerDescription>
            The following schedule entries overlap in time on the same stage.
            Please adjust their timings or assign them to different stages to
            resolve the conflicts.
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 py-8">
          <div className="space-y-4 max-w-4xl mx-auto w-full">
            {conflicts.map(([entryA, entryB], idx) => (
              <div
                key={idx}
                className="border border-destructive/20 rounded-lg p-4 bg-destructive/5 space-y-3"
              >
                <div className="font-medium text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Conflict on {entryA.stage?.name || "Stage"}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Entry A */}
                  <div className="bg-background border rounded p-3 space-y-2">
                    <div className="font-medium">{getEntryLabel(entryA)}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(entryA.startTime), "MMM d, h:mm a")} —{" "}
                      {entryA.endTime
                        ? format(new Date(entryA.endTime), "h:mm a")
                        : "—"}
                    </div>
                    {!isReadOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 mt-2"
                        onClick={() => {
                          onOpenChange(false);
                          onEdit(entryA);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit Entry
                      </Button>
                    )}
                  </div>

                  {/* Entry B */}
                  <div className="bg-background border rounded p-3 space-y-2">
                    <div className="font-medium">{getEntryLabel(entryB)}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(entryB.startTime), "MMM d, h:mm a")} —{" "}
                      {entryB.endTime
                        ? format(new Date(entryB.endTime), "h:mm a")
                        : "—"}
                    </div>
                    {!isReadOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 mt-2"
                        onClick={() => {
                          onOpenChange(false);
                          onEdit(entryB);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit Entry
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
