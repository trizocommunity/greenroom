"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, User, FileText, Filter } from "lucide-react";

interface ChestNumberTableProps {
  students: any[];
}

export function ChestNumberTable({ students }: ChestNumberTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  // Extract unique options
  const options = useMemo(() => {
    const cats = new Set<string>();
    const grps = new Set<string>();
    students.forEach((s) => {
      if (s.category?.name) cats.add(s.category.name);
      if (s.group?.name) grps.add(s.group.name);
    });
    return {
      categories: Array.from(cats).sort(),
      groups: Array.from(grps).sort(),
    };
  }, [students]);

  // Filter Data
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchCat =
        categoryFilter === "all" || s.category?.name === categoryFilter;
      const matchGrp = groupFilter === "all" || s.group?.name === groupFilter;
      return matchCat && matchGrp;
    });
  }, [students, categoryFilter, groupFilter]);

  const clearFilters = () => {
    setCategoryFilter("all");
    setGroupFilter("all");
  };

  const hasActiveFilters = categoryFilter !== "all" || groupFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-muted/40 p-4 rounded-lg border">
        <div className="w-full md:w-1/2 xl:w-auto flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">
              Total: {filteredStudents.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            View generated chest numbers below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-full md:w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {options.groups.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {options.categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={clearFilters}
              title="Clear Filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chest No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  {student.chestNumber ? (
                    <Badge
                      variant="outline"
                      className="font-mono text-base px-2.5 py-0.5 bg-primary/10 border-primary/20 text-primary"
                    >
                      {student.chestNumber}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">
                      Pending
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-medium">{student.name}</TableCell>
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
              </TableRow>
            ))}
            {filteredStudents.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
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
