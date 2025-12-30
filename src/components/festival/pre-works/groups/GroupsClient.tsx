"use client";

import { Eye, Loader2, Pencil, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useGroups } from "@/hooks/useGroups";
import { GroupDetailsDialog } from "./GroupDetailsDialog";
import { GroupDialog } from "./GroupDialog";

interface GroupsClientProps {
  festivalId: string;
}

export function GroupsClient({ festivalId }: GroupsClientProps) {
  const { groups, isLoading, deleteGroup, isDeleting } = useGroups(festivalId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <GroupDialog festivalId={festivalId} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group: any) => {
          return (
            <div
              key={group.id}
              className="relative group overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
            >
              {/* Left Color Border */}
              <div
                className="absolute top-0 left-0 w-1.5 h-full transition-all group-hover:w-2"
                style={{ backgroundColor: group.color || "#2563eb" }}
              />

              <div className="p-5 pl-6 flex flex-col gap-4 flex-1">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3
                      className="font-bold text-lg leading-tight line-clamp-1"
                      title={group.name}
                    >
                      {group.name}
                    </h3>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 bg-muted/50 text-muted-foreground font-mono text-xs"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {group._count?.participants ?? 0}
                  </Badge>
                </div>

                {/* Team Leaders Section */}
                {group.participants?.some((p: any) => p.isTeamLeader) && (
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Team Leaders
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {group.participants
                        .filter((p: any) => p.isTeamLeader)
                        .map((p: any) => (
                          <Badge
                            key={p.id}
                            variant="outline"
                            className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0 h-5"
                          >
                            {p.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-1 pt-4 border-t mt-auto">
                  <GroupDetailsDialog
                    festivalId={festivalId}
                    group={group}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-medium text-muted-foreground hover:text-primary"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Button>
                    }
                  />
                  <GroupDialog
                    festivalId={festivalId}
                    group={group}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-medium text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                    }
                  />
                  <DeleteDialog
                    title="Delete Group"
                    description="Are you sure you want to delete this group? This will also delete all participants in this group."
                    onDelete={async () => {
                      await deleteGroup(group.id);
                    }}
                    isDeleting={isDeleting}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-medium text-red-500/70 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        Delete
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
        {groups.length === 0 && (
          <div className="col-span-full flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No groups yet</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
              Create a group to start adding participants.
            </p>
            <GroupDialog festivalId={festivalId} />
          </div>
        )}
      </div>
    </div>
  );
}
