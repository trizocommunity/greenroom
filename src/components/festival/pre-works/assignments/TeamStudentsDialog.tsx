"use client";

import { Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface TeamStudentRow {
  id: string;
  name: string;
  chestNumber?: string | null;
  categoryName?: string;
}

interface TeamStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programmeName: string;
  teamLabel: string;
  groupName: string;
  students: TeamStudentRow[];
}

export function TeamStudentsDialog({
  open,
  onOpenChange,
  programmeName,
  teamLabel,
  groupName,
  students,
}: TeamStudentsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team members
          </DialogTitle>
          <DialogDescription>
            Students in <span className="font-medium">{teamLabel}</span> for{" "}
            <span className="font-medium">{programmeName}</span> ({groupName})
          </DialogDescription>
        </DialogHeader>
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
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    No students in this team.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((s, idx) => (
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
      </DialogContent>
    </Dialog>
  );
}
