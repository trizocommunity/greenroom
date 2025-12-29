"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGroups } from "@/hooks/useGroups";
import { Eye, Loader2, Pencil, Users } from "lucide-react";
import { GroupDialog } from "./GroupDialog";
import { GroupDetailsDialog } from "./GroupDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/ui/delete-dialog";

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
          const teamLeaders =
            group.members?.filter((m: any) => m.role === "TEAM_LEADER") || [];

          return (
            <Card
              key={group.id}
              className="overflow-hidden border-t-4"
              style={{ borderTopColor: group.color || "#2563eb" }}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold">
                      {group.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: group.color || "#2563eb" }}
                      />
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {group._count?.participants ?? 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="rounded-md bg-muted/40 p-3 flex flex-col gap-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                    <span>Team Leaders ({teamLeaders.length})</span>
                  </div>

                  {teamLeaders.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {teamLeaders.slice(0, 2).map((tl: any) => (
                        <div
                          key={tl.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div
                            className="h-6 w-6 rounded-full bg-background flex items-center justify-center border shadow-sm text-xs font-bold"
                            style={{ color: group.color || "#2563eb" }}
                          >
                            {tl.user.fullName.charAt(0)}
                          </div>
                          <span className="truncate font-medium">
                            {tl.user.fullName}
                          </span>
                        </div>
                      ))}
                      {teamLeaders.length > 2 && (
                        <div className="text-xs text-muted-foreground pl-8">
                          + {teamLeaders.length - 2} others
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic pl-1">
                      No team leaders
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 gap-2">
                  <GroupDialog
                    festivalId={festivalId}
                    group={group}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <GroupDetailsDialog
                    festivalId={festivalId}
                    group={group}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
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
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {groups.length === 0 && (
          <div className="col-span-full flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No groups yet</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
              Create a group to start adding participants and assigning Team
              Leaders.
            </p>
            <GroupDialog festivalId={festivalId} />
          </div>
        )}
      </div>
    </div>
  );
}
