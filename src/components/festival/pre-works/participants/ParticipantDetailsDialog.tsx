"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Loader2, Mail, Phone, Users } from "lucide-react";
import { useParticipants } from "@/hooks/useParticipants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useAssignments } from "@/hooks/useAssignments";

interface ParticipantDetailsDialogProps {
  festivalId: string;
  participant: any;
  trigger?: React.ReactNode;
}

export function ParticipantDetailsDialog({
  festivalId,
  participant,
  trigger,
}: ParticipantDetailsDialogProps) {
  // We might want to fetch fresh details or assignments for this participant
  // Currently, participant object might have some info, but assignments?
  // We can filter assignments by participantId if we have them all, or fetch.
  // Assuming useAssignments loads all assignments for now (which might be heavy but consistent with current app structure).

  const { assignments, isLoading } = useAssignments(festivalId);

  const participantAssignments = assignments.filter(
    (a: any) =>
      a.participantId === participant.id ||
      a.team?.members.some((tm: any) => tm.participantId === participant.id),
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {participant.name}
            <Badge variant="outline" className="ml-2">
              {participant.registrationNumber}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Info Column */}
          <div className="space-y-4 border-r pr-4">
            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase">
                Group
              </span>
              <div className="font-medium flex items-center gap-2 mt-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: participant.group?.color || "#2563eb",
                  }}
                />
                {participant.group?.name}
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase">
                Category
              </span>
              <div className="font-medium mt-1">
                {participant.category?.name}
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase">
                Gender
              </span>
              <div className="font-medium mt-1 capitalize">
                {participant.gender?.toLowerCase() || "-"}
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{participant.email || "No email"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{participant.phone || "No phone"}</span>
              </div>
            </div>
          </div>

          {/* Programmes Column */}
          <div className="md:col-span-2">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              Assigned Programmes
              <Badge variant="secondary">{participantAssignments.length}</Badge>
            </h4>

            <ScrollArea className="h-[300px] border rounded-md">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Programme</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participantAssignments.map((assignment: any) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.programme?.name}
                        </TableCell>
                        <TableCell className="text-xs">
                          {assignment.programme?.type}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {assignment.programme?.code}
                        </TableCell>
                      </TableRow>
                    ))}
                    {participantAssignments.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground h-24"
                        >
                          Not assigned to any programmes.
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
