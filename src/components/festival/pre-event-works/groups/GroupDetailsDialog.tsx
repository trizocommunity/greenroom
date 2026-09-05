"use client";

import { Eye, Loader2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useParticipants } from "@/api/client/participants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFeature } from "@/features/plan-features/hooks/use-feature";

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface Member {
  id: string;
  role: string;
  user: User;
}

interface Participant {
  id: string;
  name: string | null;
  chestNumber?: string | null;
  category?: { name: string } | null;
  email?: string | null;
  group?: { id: string; name: string } | null;
  groupId?: string | null;
}

interface Group {
  id: string;
  name: string;
  color?: string;
  members: Member[];
}

interface GroupDetailsDialogProps {
  festivalId: string;
  group: Group;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GroupDetailsDialog({
  festivalId,
  group,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: GroupDetailsDialogProps) {
  const { data: participants = [], isLoading } = useParticipants(festivalId);
  const canAssignTeamLeaders = useFeature("members");

  const groupParticipants = participants.filter(
    (p: Participant) => p.group?.id === group.id || p.groupId === group.id,
  );

  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of groupParticipants) {
      if (p.category?.name) {
        map.set(p.category.name, p.category.name);
      }
    }
    return Array.from(map.values()).sort();
  }, [groupParticipants]);

  const displayedParticipants = useMemo(() => {
    if (filterCategory === "ALL") return groupParticipants;
    return groupParticipants.filter(
      (p: Participant) => p.category?.name === filterCategory,
    );
  }, [groupParticipants, filterCategory]);

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DrawerTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerHeader className="pr-8 sm:pr-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <DrawerTitle className="text-lg sm:text-xl truncate">
                {group.name}
              </DrawerTitle>
            </div>
          </div>
          <DrawerDescription>
            {groupParticipants.length} Participants
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden mt-4 min-h-0">
          <div className="flex flex-col gap-3 overflow-hidden h-full">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                Participants ({displayedParticipants.length})
              </h4>
              {categories.length > 0 && (
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-7 text-xs border rounded-md px-2 py-0.5 bg-background text-foreground"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Mobile: list of cards */}
                  <div className="block md:hidden divide-y">
                    {displayedParticipants.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-sm">
                        No participants found in this group.
                      </div>
                    ) : (
                      displayedParticipants.map((p: Participant) => (
                        <div
                          key={p.id}
                          className="p-3 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.chestNumber || "—"} · {p.category?.name || "—"}
                            </p>
                          </div>
                          {canAssignTeamLeaders && (p as any).isTeamLeader && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] shrink-0 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200"
                            >
                              Leader
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {/* Desktop: table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Chest No</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedParticipants.map((p: Participant) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              {p.chestNumber || "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {p.name}
                                {canAssignTeamLeaders &&
                                  (p as any).isTeamLeader && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] h-5 px-1.5 font-normal bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200"
                                    >
                                      Team Leader
                                    </Badge>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {p.category?.name || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {displayedParticipants.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="h-24 text-center text-muted-foreground"
                            >
                              No participants found in this group.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </ScrollArea>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
