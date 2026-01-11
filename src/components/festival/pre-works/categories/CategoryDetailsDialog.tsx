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

interface CategoryDetailsDialogProps {
  festivalId: string;
  category: {
    id: string;
    name: string;
    description?: string | null;
    type?: "SINGLE" | "GENERAL";
  };
  trigger?: React.ReactNode;
}

export function CategoryDetailsDialog({
  festivalId,
  category,
  trigger,
}: CategoryDetailsDialogProps) {
  const { students, isLoading } = useStudents(festivalId);

  // Logic:
  // INDIVIDUAL -> Filter by categoryId
  // GENERAL -> Show ALL students
  const filteredStudents =
    category.type === "GENERAL"
      ? students
      : students.filter((p: any) => p.categoryId === category.id);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{category.name}</DialogTitle>
            <Badge
              variant={category.type === "GENERAL" ? "default" : "outline"}
            >
              {category.type}
            </Badge>
          </div>
          <DialogDescription>
            {category.description || "No description provided."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students ({filteredStudents.length})
            </h4>
            {category.type === "GENERAL" && (
              <span className="text-xs text-muted-foreground">
                Showing all festival students (General Category)
              </span>
            )}
          </div>

          <ScrollArea className="flex-1 border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>

                    <TableHead>Group</TableHead>
                    {category.type === "GENERAL" && (
                      <TableHead>Category</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>

                      <TableCell>{p.group?.name || "-"}</TableCell>
                      {category.type === "GENERAL" && (
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {p.category?.name}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={category.type === "GENERAL" ? 4 : 3}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No students found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
