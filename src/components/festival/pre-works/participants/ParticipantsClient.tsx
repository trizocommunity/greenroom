"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParticipants } from "@/hooks/useParticipants";
import { Eye, FileText, Loader2, Pencil, Trash2, User } from "lucide-react";
import { ParticipantDialog } from "./ParticipantDialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { format } from "date-fns";
import { DeadlinesCard } from "../DeadlinesCard";

interface ParticipantsClientProps {
  festivalId: string;
  userGroup?: {
    id: string;
    name: string;
  };
}

export function ParticipantsClient({
  festivalId,
  userGroup,
}: ParticipantsClientProps) {
  const { participants, isLoading, deleteParticipant, isDeleting } =
    useParticipants(festivalId);

  // Todo: Get counts from festival context or hook if needed for limit display?
  // Passed down props? Or separate hook.

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DeadlinesCard type="participant" />
      <div className="flex justify-between items-center bg-muted/40 p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm">
            Total Participants: {participants.length}
          </span>
          {userGroup && (
            <Badge variant="outline" className="ml-2">
              Your Group: {userGroup.name}
            </Badge>
          )}
        </div>
        <ParticipantDialog festivalId={festivalId} userGroup={userGroup} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((participant: any) => (
              <TableRow key={participant.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{participant.name}</span>
                    {participant.registrationNumber && (
                      <span className="text-xs text-muted-foreground">
                        {participant.registrationNumber}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{participant.group?.name || "-"}</TableCell>
                <TableCell>{participant.category?.name || "-"}</TableCell>
                <TableCell>{participant.email || "-"}</TableCell>
                <TableCell>
                  {format(new Date(participant.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ParticipantDialog
                      festivalId={festivalId}
                      participant={participant}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <ParticipantDialog
                      festivalId={festivalId}
                      participant={participant}
                      readOnly
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DeleteDialog
                      title="Delete Participant"
                      description="Are you sure? This will remove the participant from all assigned programmes."
                      onDelete={async () => {
                        await deleteParticipant(participant.id);
                      }}
                      isDeleting={isDeleting}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {participants.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p>No participants found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
