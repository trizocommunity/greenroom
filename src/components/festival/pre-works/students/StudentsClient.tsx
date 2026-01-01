"use client";

import { format } from "date-fns";
import { Eye, FileText, Filter, Loader2, Pencil, User, X } from "lucide-react";
import { useState } from "react";
import { useFestival } from "@/components/festival/FestivalContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { useStudents } from "@/hooks/useStudents";
import { StudentDetailsDialog } from "./StudentDetailsDialog";
import { StudentDialog } from "./StudentDialog";
import { BulkUploadStudentsModal } from "./BulkUploadStudentsModal";

interface StudentsClientProps {
  festivalId: string;
}

export function StudentsClient({ festivalId }: StudentsClientProps) {
  const { students, isLoading, deleteStudent, isDeleting } =
    useStudents(festivalId);
  const { groups } = useGroups(festivalId);
  const { categories } = useCategories(festivalId);

  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter Logic
  const filteredStudents = students.filter((p: any) => {
    // Group Filter
    if (selectedGroup !== "ALL") {
      if (p.groupId !== selectedGroup && p.group?.id !== selectedGroup)
        return false;
    }

    // Category Filter
    if (selectedCategory !== "ALL") {
      if (
        p.categoryId !== selectedCategory &&
        p.category?.id !== selectedCategory
      )
        return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-muted/40 p-4 rounded-lg border">
        <div className="w-full  md:w-1/2 xl:w-auto flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">
              Total: {filteredStudents.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage your students here.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-full md:w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Groups</SelectItem>
              {groups.map((g: any) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full  md:w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories
                .filter((c: any) => c.type !== "GENERAL")
                .map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {(selectedGroup !== "ALL" || selectedCategory !== "ALL") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                setSelectedGroup("ALL");
                setSelectedCategory("ALL");
              }}
              title="Clear Filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className="flex flex-col items-end gap-2">
            {groups.length === 0 || categories.length === 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button className="w-full md:w-fit" disabled>
                        Add Student
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create groups & categories first.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="flex flex-wrap w-full gap-2">
                <BulkUploadStudentsModal festivalId={festivalId} />
                <StudentDialog
                  festivalId={festivalId}
                  trigger={
                    <Button className="w-full md:w-fit">Add Student</Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student: any) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{student.name}</span>
                    {student.registrationNumber && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {student.registrationNumber}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: student.group?.color || "#2563eb",
                      }}
                    />
                    {student.group?.name || "-"}
                  </div>
                </TableCell>
                <TableCell>{student.category?.name || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(student.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <StudentDetailsDialog
                      festivalId={festivalId}
                      student={student}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <StudentDialog
                      festivalId={festivalId}
                      studentToEdit={student}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DeleteDialog
                      title="Delete Student"
                      description="Are you sure? This will remove the student from all assigned programmes."
                      onDelete={async () => {
                        await deleteStudent(student.id);
                      }}
                      isDeleting={isDeleting}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredStudents.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p>No students found matching filters.</p>
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
