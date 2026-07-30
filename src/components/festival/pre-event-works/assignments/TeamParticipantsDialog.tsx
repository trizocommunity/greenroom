"use client";

import { Users } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface TeamParticipantRow {
  id: string;
  name: string;
  chestNumber?: string | null;
  categoryName?: string;
}

interface TeamParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programmeName: string;
  teamLabel: string;
  groupName: string;
  participants: TeamParticipantRow[];
}

export function TeamParticipantsDialog({
  open,
  onOpenChange,
  programmeName,
  teamLabel,
  groupName,
  participants,
}: TeamParticipantsDialogProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team members
          </DrawerTitle>
          <DrawerDescription>
            Participants in <span className="font-medium">{teamLabel}</span> for{" "}
            <span className="font-medium">{programmeName}</span> ({groupName})
          </DrawerDescription>
        </DrawerHeader>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Chest</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-6"
                  >
                    No participants in this team.
                  </TableCell>
                </TableRow>
              ) : (
                participants.map((s, idx) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground font-mono">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {s.chestNumber ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
