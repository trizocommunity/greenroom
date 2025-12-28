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
import { Eye, Loader2, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { GroupDialog } from "./GroupDialog";
import { TeamLeaderDialog } from "./TeamLeaderDialog";
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
          const teamLeader = group.members?.find(
            (m: any) => m.role === "TEAM_LEADER",
          );

          return (
            <Card key={group.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {group.name}
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {group.type?.toLowerCase()}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {group.participants?.length || 0} Participants
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="rounded-md border p-3">
                  <div className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Team Leader
                  </div>
                  {teamLeader ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="grid gap-0.5 text-sm">
                        <span className="font-medium">
                          {teamLeader.user.fullName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {teamLeader.user.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Not assigned
                      </span>
                      <TeamLeaderDialog
                        festivalId={festivalId}
                        groupId={group.id}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-primary"
                          >
                            <UserPlus className="mr-2 h-3 w-3" />
                            Assign
                          </Button>
                        }
                      />
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
                  <GroupDialog
                    festivalId={festivalId}
                    group={group}
                    readOnly
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
