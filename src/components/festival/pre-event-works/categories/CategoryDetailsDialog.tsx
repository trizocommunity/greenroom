"use client";

import { Eye, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { useStudents } from "@/api/client/students";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CategoryDetailsDialogProps {
  festivalId: string;
  category: {
    id: string;
    name: string;
    description?: string | null;
    type?: "SINGLE" | "GENERAL";
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CategoryDetailsDialog({
  festivalId,
  category,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CategoryDetailsDialogProps) {
  const { data: students = [], isLoading } = useStudents(festivalId);

  const filteredStudents =
    category.type === "GENERAL"
      ? students
      : students.filter((p: any) => p.categoryId === category.id);

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DrawerTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerHeader className="pr-8 sm:pr-0 text-left shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <DrawerTitle className="text-lg sm:text-xl text-left">
              {category.name}
            </DrawerTitle>
            <Badge
              variant={category.type === "GENERAL" ? "default" : "outline"}
            >
              {category.type}
            </Badge>
          </div>
          <DrawerDescription className="text-left">
            {category.description || "No description provided."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 flex flex-col gap-4 mt-4 min-h-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-left shrink-0">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              Students ({filteredStudents.length})
            </h4>
            {category.type === "GENERAL" && (
              <span className="text-xs text-muted-foreground text-left">
                Showing all festival students (General Category)
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 border rounded-md overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Mobile: list of cards */}
                <div className="block md:hidden divide-y text-left">
                  {filteredStudents.length === 0 ? (
                    <div className="py-8 text-muted-foreground text-sm text-left">
                      No students found.
                    </div>
                  ) : (
                    filteredStudents.map((p: any) => (
                      <div key={p.id} className="p-3 text-left">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 text-left">
                          {p.group?.name || "—"}
                          {category.type === "GENERAL" &&
                            p.category?.name &&
                            ` · ${p.category.name}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {/* Desktop: table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">Name</TableHead>
                        <TableHead className="text-left">Group</TableHead>
                        {category.type === "GENERAL" && (
                          <TableHead className="text-left">Category</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-left">
                            {p.name}
                          </TableCell>
                          <TableCell className="text-left">
                            {p.group?.name || "-"}
                          </TableCell>
                          {category.type === "GENERAL" && (
                            <TableCell className="text-left">
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
                            className="h-24 text-muted-foreground text-left"
                          >
                            No students found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
