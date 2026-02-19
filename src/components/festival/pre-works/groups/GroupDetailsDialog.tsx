"use client";

import { Eye, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStudents } from "@/hooks/useStudents";

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

interface Student {
  id: string;
  name: string;
  chestNumber?: string | null;
  category?: { name: string } | null;
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
  const { students, isLoading } = useStudents(festivalId);

  // Filter students for this group
  const groupStudents = students.filter(
    (p: Student) => p.group?.id === group.id || p.groupId === group.id,
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
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between mr-8">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl">{group.name}</DialogTitle>
            </div>
          </div>
          <DialogDescription>{groupStudents.length} Students</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden mt-4">
          <div className="flex flex-col gap-4 overflow-hidden h-full">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students ({groupStudents.length})
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
                      <TableHead>Chest No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupStudents.map((p: Student) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.chestNumber || "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {p.name}
                            {(p as any).isTeamLeader && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5 px-1.5 font-normal bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200"
                              >
                                Team Leader
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {p.category?.name || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {groupStudents.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No students found in this group.
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
