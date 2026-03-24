"use client";

import { Crown, Eye, Loader2, MoreVertical, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGroups } from "@/hooks/useGroups";
import { useFestivalReadOnly } from "@/hooks/useFestivalReadOnly";
import { GroupDetailsDialog } from "./GroupDetailsDialog";
import { GroupDialog } from "./GroupDialog";

interface GroupsClientProps {
  festivalId: string;
  children?: React.ReactNode;
}

export function GroupsClient({ festivalId, children }: GroupsClientProps) {
  const { groups, isLoading, deleteGroup, isDeleting } = useGroups(festivalId);
  const { isReadOnly } = useFestivalReadOnly();
  const [actionGroup, setActionGroup] = useState<{
    group: any;
    action: "view" | "edit" | "delete";
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 pt-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Header row: title (children) + Create button — icon only on mobile */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children}
        <GroupDialog
          festivalId={festivalId}
          trigger={
            <Button size="sm" className="shrink-0" disabled={isReadOnly}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Group</span>
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group: any) => {
          const groupColor = group.color || "#2563eb";
          const teamLeaders = group.students?.filter((p: any) => p.isTeamLeader) ?? [];
          return (
            <div
              key={group.id}
              className="group/card relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20"
            >
              {/* Color accent bar */}
              <div
                className="absolute left-0 top-0 h-full w-1.5 shrink-0 transition-all duration-200 group-hover/card:w-2"
                style={{ backgroundColor: groupColor }}
              />

              <div className="flex flex-1 flex-col pl-5 pr-4 sm:pl-6 sm:pr-5">
                {/* Top: name + student count + actions */}
                <div className="flex items-start justify-between gap-3 pt-5 pb-3 sm:pt-6">
                  <div className="min-w-0 flex-1">
                    <h3
                      className="font-semibold text-base leading-tight text-foreground line-clamp-2"
                      title={group.name}
                    >
                      {group.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        <span className="font-medium text-foreground">
                          {group._count?.students ?? 0}
                        </span>
                        {" "}student{(group._count?.students ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onSelect={() => setActionGroup({ group, action: "view" })}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      {!isReadOnly && (
                        <>
                          <DropdownMenuItem
                            onSelect={() => setActionGroup({ group, action: "edit" })}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setActionGroup({ group, action: "delete" })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Team leaders */}
                {teamLeaders.length > 0 && (
                  <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Crown className="h-3 w-3 shrink-0 text-amber-500" />
                      Team Leaders
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {teamLeaders.map((p: any) => (
                        <Badge
                          key={p.id}
                          variant="secondary"
                          className="text-xs font-normal bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/30"
                        >
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spacer so footer stays at bottom */}
                <div className="flex-1 min-h-2" />
              </div>
            </div>
          );
        })}
        {groups.length === 0 && (
          <div className="col-span-full flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 p-8 text-center">
            <div className="rounded-full bg-muted/50 p-4">
              <Users className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No groups yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create a group to start adding students (e.g. school or college).
            </p>
            <div className="mt-6">
              <GroupDialog
                festivalId={festivalId}
                trigger={
                  <Button disabled={isReadOnly}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Group
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Controlled dialogs opened from dropdown */}
      {actionGroup?.action === "view" && actionGroup.group && (
        <GroupDetailsDialog
          festivalId={festivalId}
          group={actionGroup.group}
          open={true}
          onOpenChange={(open) => !open && setActionGroup(null)}
        />
      )}
      {!isReadOnly && actionGroup?.action === "edit" && actionGroup.group && (
        <GroupDialog
          festivalId={festivalId}
          group={actionGroup.group}
          open={true}
          onOpenChange={(open) => !open && setActionGroup(null)}
        />
      )}
      {!isReadOnly && actionGroup?.action === "delete" && actionGroup.group && (
        <DeleteDialog
          title="Delete Group"
          description="Are you sure you want to delete this group? This will also delete all students in this group."
          onDelete={async () => {
            await deleteGroup(actionGroup.group.id);
            setActionGroup(null);
          }}
          isDeleting={isDeleting}
          open={true}
          onOpenChange={(open) => !open && setActionGroup(null)}
        />
      )}
    </div>
  );
}
