"use client";

import { format } from "date-fns";
import { Eye, FileText, Loader2, MoreVertical, Pencil, Plus, Search, Trash2, User, X } from "lucide-react";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { BulkUploadStudentsModal } from "./BulkUploadStudentsModal";
import { StudentDetailsDialog } from "./StudentDetailsDialog";
import { StudentDialog } from "./StudentDialog";
import { FeatureGate } from "@/components/common/FeatureGate";
import { ChestNumberSetup } from "@/components/festival/event-works/chest-numbers/ChestNumberSetup";

interface StudentsClientProps {
  festivalId: string;
  festivalSlug: string;
  initialChestSettings: {
    prefix: string;
    nextSequence?: number;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
    numberingStyle?: "ALPHANUMERIC" | "NUMERIC";
  } | null;
  onChestRevalidate: () => void;
  children?: React.ReactNode;
}

export function StudentsClient({
  festivalId,
  initialChestSettings,
  onChestRevalidate,
  children,
}: StudentsClientProps) {
  const { students, isLoading, deleteStudent, isDeleting } =
    useStudents(festivalId);
  const { groups } = useGroups(festivalId);
  const { categories } = useCategories(festivalId);

  const singleCategories = (categories ?? []).filter(
    (c: any) => c.type === "SINGLE",
  );
  const pendingChestCount = (students ?? []).filter(
    (s: any) =>
      !s.chestNumber &&
      s.category?.type === "SINGLE",
  ).length;

  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionStudent, setActionStudent] = useState<{ student: any; action: "view" | "edit" | "delete" } | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter Logic (group, category, search)
  const filteredStudents = students.filter((p: any) => {
    if (selectedGroup !== "ALL") {
      if (p.groupId !== selectedGroup && p.group?.id !== selectedGroup)
        return false;
    }
    if (selectedCategory !== "ALL") {
      if (p.categoryId !== selectedCategory && p.category?.id !== selectedCategory)
        return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (p.name || "").toLowerCase();
      const chest = (p.chestNumber || "").toLowerCase();
      if (!name.includes(q) && !chest.includes(q)) return false;
    }
    return true;
  });

  const hasFilters = selectedGroup !== "ALL" || selectedCategory !== "ALL" || searchQuery.trim() !== "";

  return (
    <div className="space-y-4 pt-2">
      {/* Header row: title (children) + actions — Create icon only on mobile */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children ?? (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Students</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Add students, assign groups and categories, manage chest numbers.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How Students work"
            description="Students and chest numbers."
          >
            <p className="text-sm text-muted-foreground">
              <strong>Configure chest numbers first</strong> (prefix, category
              codes, numbering style) at the top of this page, then add
              students. New students get a chest number automatically when
              config is valid.
            </p>
            <p className="text-sm text-muted-foreground">
              Add students and assign them to a <strong>group</strong> and{" "}
              <strong>category</strong>. Groups represent schools or teams;
              categories define competition segments. You need at least one group
              and one category before adding students.
            </p>
            <p className="text-sm text-muted-foreground">
              For existing data you can <strong>reset</strong> (clear all
              numbers and config), <strong>reconfigure</strong>, then{" "}
              <strong>generate</strong> again for all students.
            </p>
            <p className="text-sm text-muted-foreground">
              Use bulk upload to add many students at once. Then assign them to
              programmes from the Assignments page.
            </p>
          </HowItWorksButton>
          {groups.length === 0 || categories.length === 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button size="sm" disabled>
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add Student</span>
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create groups & categories first.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              <FeatureGate feature="studentBulkUpload">
                <BulkUploadStudentsModal festivalId={festivalId} />
              </FeatureGate>
              <StudentDialog
                festivalId={festivalId}
                trigger={
                  <Button size="sm">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Student</span>
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>

      <ChestNumberSetup
        festivalId={festivalId}
        categories={singleCategories}
        initialSettings={initialChestSettings}
        onGenerated={onChestRevalidate}
        pendingCount={pendingChestCount}
      />

      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-4 border-b bg-muted/5">
          {/* Filters: mobile = flex-col w-full, desktop = row with search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="relative w-full sm:w-auto sm:min-w-[140px] sm:max-w-[200px] order-first">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search name or chest no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full pl-8 text-xs sm:w-[180px]"
              />
            </div>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All groups</SelectItem>
                {groups.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories
                  .filter((c: any) => c.type !== "GENERAL")
                  .map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full sm:w-8 shrink-0"
                onClick={() => {
                  setSelectedGroup("ALL");
                  setSelectedCategory("ALL");
                  setSearchQuery("");
                }}
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5 sm:mr-0" />
                <span className="sm:hidden">Clear filters</span>
              </Button>
            )}
            <span className="text-xs text-muted-foreground sm:ml-auto">
              {filteredStudents.length} row{filteredStudents.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: beautiful student cards */}
          <div className="block md:hidden p-3 sm:p-4 space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center text-muted-foreground rounded-xl border border-dashed bg-muted/10">
                <User className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium">No students found</p>
                <p className="text-sm">Try changing filters or search, or add a student.</p>
              </div>
            ) : (
              filteredStudents.map((student: any) => (
                <div
                  key={student.id}
                  className="rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[15px] leading-snug text-foreground line-clamp-1">
                        {student.name}
                      </h3>
                      <div className="mt-2.5 rounded-lg bg-muted/40 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {student.chestNumber ? (
                            <span className="font-mono font-medium text-primary">
                              {student.chestNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/80">—</span>
                          )}
                          <span>{student.group?.name || "—"}</span>
                          <span>{student.category?.name || "—"}</span>
                          <span className="text-muted-foreground/80">
                            {format(new Date(student.createdAt), "MMM d")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onSelect={() => setActionStudent({ student, action: "view" })}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setActionStudent({ student, action: "edit" })}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setActionStudent({ student, action: "delete" })}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Chest No</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student: any) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>
                      {student.chestNumber ? (
                        <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                          {student.chestNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onSelect={() => setActionStudent({ student, action: "view" })}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setActionStudent({ student, action: "edit" })}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setActionStudent({ student, action: "delete" })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
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
        </CardContent>
      </Card>

      {/* Controlled dialogs opened from dropdown */}
      {actionStudent?.action === "view" && actionStudent.student && (
        <StudentDetailsDialog
          festivalId={festivalId}
          student={actionStudent.student}
          open={true}
          onOpenChange={(open) => !open && setActionStudent(null)}
        />
      )}
      {actionStudent?.action === "edit" && actionStudent.student && (
        <StudentDialog
          festivalId={festivalId}
          studentToEdit={actionStudent.student}
          open={true}
          onOpenChange={(open) => !open && setActionStudent(null)}
        />
      )}
      {actionStudent?.action === "delete" && actionStudent.student && (
        <DeleteDialog
          title="Delete Student"
          description="Are you sure? This will remove the student from all assigned programmes."
          onDelete={async () => {
            await deleteStudent(actionStudent.student.id);
            setActionStudent(null);
          }}
          isDeleting={isDeleting}
          open={true}
          onOpenChange={(open) => !open && setActionStudent(null)}
        />
      )}
    </div>
  );
}
