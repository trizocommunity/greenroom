"use client";

import { format } from "date-fns";
import { Crown, Loader2, Users, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { getCallListAssignmentsAction } from "@/features/announcement/actions/announcer.actions";
import type { ActiveReportingProgramme } from "@/features/announcement/services/announcer.service";
import { toast } from "@/lib/toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ActiveReportingProgramme | null;
  festivalId: string;
}

type AssignmentRow = {
  id: string;
  teamNumber: number | null;
  groupName: string | null;
  participantName: string | null;
  chestNumber: string | null;
  isTeamLead: boolean;
};

export function AnnouncerCallListDrawer({
  open,
  onOpenChange,
  item,
  festivalId,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    if (open && item) {
      startTransition(async () => {
        const res = await getCallListAssignmentsAction(festivalId, item.id);
        if (res.success) {
          setAssignments(res.data);
        } else {
          toast.error(
            (res as { error?: string }).error || "Failed to load assignments",
          );
        }
      });
    } else {
      setAssignments([]);
    }
  }, [open, item, festivalId]);

  // Group assignments by assignment ID to handle group items properly
  const groupedAssignments = assignments.reduce(
    (acc, curr) => {
      if (!acc[curr.id]) {
        acc[curr.id] = {
          id: curr.id,
          teamNumber: curr.teamNumber,
          groupName: curr.groupName,
          members: [],
        };
      }
      if (curr.participantName) {
        acc[curr.id].members.push({
          name: curr.participantName,
          chestNumber: curr.chestNumber,
          isTeamLead: curr.isTeamLead,
        });
      }
      return acc;
    },
    {} as Record<
      string,
      {
        id: string;
        teamNumber: number | null;
        groupName: string | null;
        members: {
          name: string;
          chestNumber: string | null;
          isTeamLead: boolean;
        }[];
      }
    >,
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left border-b pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-xl truncate">
                {item?.name}
              </DrawerTitle>
              <DrawerDescription className="mt-1.5 flex items-center gap-2 text-sm flex-wrap">
                <Badge variant="secondary" className="font-normal">
                  {item?.type}
                </Badge>
                {item?.categoryName && <span>{item.categoryName}</span>}
                {item?.stageName && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span>{item.stageName}</span>
                  </>
                )}
              </DrawerDescription>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {item?.startedAt && (
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Called At
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {format(new Date(item.startedAt), "h:mm a")}
                  </div>
                </div>
              )}
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  aria-label="Close call list"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto min-h-[300px]">
          {isPending ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Loading participants...</p>
            </div>
          ) : Object.values(groupedAssignments).length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No participants assigned yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.values(groupedAssignments).map((assignment, index) => (
                <div
                  key={assignment.id}
                  className="border rounded-lg p-4 bg-muted/20"
                >
                  {item?.type === "GROUP" ? (
                    <div className="mb-3 flex items-center justify-between border-b pb-2">
                      <div className="font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {assignment.groupName ||
                          `Team ${assignment.teamNumber || index + 1}`}
                      </div>
                      {assignment.teamNumber && (
                        <Badge variant="outline">
                          Team {assignment.teamNumber}
                        </Badge>
                      )}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {assignment.members.map((member, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          {member.isTeamLead && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              Lead
                            </Badge>
                          )}
                        </div>
                        {member.chestNumber && (
                          <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {member.chestNumber}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DrawerFooter className="border-t pt-4">
          <DrawerClose asChild>
            <Button variant="outline">Close Call List</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
