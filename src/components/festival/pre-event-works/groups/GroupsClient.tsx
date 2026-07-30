"use client";

import {
  Crown,
  Eye,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useDeleteGroup, useGroups } from "@/api/client/groups";
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
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { GroupDetailsDialog } from "./GroupDetailsDialog";
import { GroupDialog } from "./GroupDialog";

interface GroupsClientProps {
  festivalId: string;
  children?: React.ReactNode;
}

export function GroupsClient({ festivalId, children }: GroupsClientProps) {
  const { data: groups = [], isLoading } = useGroups(festivalId);
  const deleteGroup = useDeleteGroup();
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
          const teamLeaders =
            group.participants?.filter((p: any) => p.isTeamLeader) ?? [];
          return (
            <div
              key={group.id}
              className="group/card relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20"
            >
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                {/* Top: name + actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: groupColor }} />
                    <h3
                      className="font-semibold text-base leading-tight text-foreground line-clamp-2"
                      title={group.name}
                    >
                      {group.name}
                    </h3>
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
                        onSelect={() =>
                          setActionGroup({ group, action: "view" })
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      {!isReadOnly && (
                        <>
                          <DropdownMenuItem
                            onSelect={() =>
                              setActionGroup({ group, action: "edit" })
                            }
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() =>
                              setActionGroup({ group, action: "delete" })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Spacer so footer stays at bottom */}
                <div className="flex-1 min-h-2" />

                {/* Team leaders */}
                {teamLeaders.length > 0 && (
                  <div className="mt-4 rounded-lg bg-muted/20 px-3 py-2.5 border border-border/50">
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

                {/* Stats strip */}
                <div className="mt-4 flex items-center gap-4 rounded-lg bg-muted/40 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground">
                        {group._count?.participants ?? 0}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        participant
                        {(group._count?.participants ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </span>
                  </div>
                </div>
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
              Create a group to start adding participants (e.g. school or
              college).
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
          description="Are you sure you want to delete this group? This will also delete all participants in this group."
          onDelete={async () => {
            await deleteGroup.mutateAsync({
              festivalId,
              groupId: actionGroup.group.id,
            });
            setActionGroup(null);
          }}
          isDeleting={deleteGroup.isPending}
          open={true}
          onOpenChange={(open) => !open && setActionGroup(null)}
        />
      )}
    </div>
  );
}
