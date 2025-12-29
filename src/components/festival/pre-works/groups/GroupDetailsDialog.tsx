"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  Loader2,
  Mail,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useParticipants } from "@/hooks/useParticipants";
import { TeamLeaderDialog } from "./TeamLeaderDialog";
import { useGroups } from "@/hooks/useGroups";
import { DeleteDialog } from "@/components/ui/delete-dialog";

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
  name: string;
  registrationNumber?: string | null;
  email?: string | null;
  group?: { id: string };
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
}

export function GroupDetailsDialog({
  festivalId,
  group,
  trigger,
}: GroupDetailsDialogProps) {
  const { participants, isLoading } = useParticipants(festivalId);
  const { removeTeamLeader, isRemovingTeamLeader } = useGroups(festivalId);

  // Filter participants for this group
  const groupParticipants = participants.filter(
    (p: Participant) => p.group?.id === group.id || p.groupId === group.id,
  );

  const teamLeaders =
    group.members?.filter((m: Member) => m.role === "TEAM_LEADER") || [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between mr-8">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl">{group.name}</DialogTitle>
            </div>
          </div>
          <DialogDescription>
            {groupParticipants.length} Participants • {teamLeaders.length} Team
            Leaders
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Team Leaders Section (Left Column) */}
          <div className="md:col-span-1 flex flex-col gap-4 border-r pr-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Leaders
              </h4>
              <TeamLeaderDialog
                festivalId={festivalId}
                groupId={group.id}
                trigger={
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <UserPlus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                }
              />
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {teamLeaders.map((tl: Member) => (
                  <div
                    key={tl.id}
                    className="p-3 bg-muted/30 rounded-lg border text-sm space-y-2 group relative"
                  >
                    <div className="font-medium pr-6">{tl.user.fullName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {tl.user.email}
                    </div>

                    <div className="flex items-center gap-1 pt-2">
                      <TeamLeaderDialog
                        festivalId={festivalId}
                        groupId={group.id}
                        memberId={tl.id}
                        initialData={{
                          fullName: tl.user.fullName,
                          email: tl.user.email,
                        }}
                        trigger={
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                          >
                            <Pencil className="mr-1 h-3 w-3" /> Edit
                          </Button>
                        }
                      />
                      <DeleteDialog
                        title="Remove Team Leader"
                        description={`Are you sure you want to remove ${tl.user.fullName}? They will lose access to this group.`}
                        onDelete={async () => {
                          await removeTeamLeader(tl.id);
                        }}
                        isDeleting={isRemovingTeamLeader}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive absolute top-2 right-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ))}

                {teamLeaders.length === 0 && (
                  <div className="text-sm text-center py-6 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                    No Team Leaders assigned.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Participants Section (Right 2 Columns) */}
          <div className="md:col-span-2 flex flex-col gap-4 overflow-hidden">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({groupParticipants.length})
            </h4>

            <ScrollArea className="flex-1 border rounded-md">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Reg. No</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupParticipants.map((p: Participant, i: number) => (
                      <TableRow key={p.id}>
                        <TableCell className="w-10 text-muted-foreground text-xs">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.registrationNumber || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.email || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {groupParticipants.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No participants found in this group.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
