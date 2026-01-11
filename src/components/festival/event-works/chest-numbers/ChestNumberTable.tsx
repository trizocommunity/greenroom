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
import { X } from "lucide-react";

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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-[200px]">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Category" />
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
        </div>
        <div className="w-[200px]">
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Group" />
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
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}

        <div className="ml-auto text-sm text-muted-foreground">
          Showing {filteredStudents.length} of {students.length} students
        </div>
      </div>

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
                      className="font-mono text-lg px-3 py-1 bg-primary/5 border-primary/20 text-primary"
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
                <TableCell>{student.group?.name || "-"}</TableCell>
                <TableCell>{student.category?.name || "-"}</TableCell>
              </TableRow>
            ))}
            {filteredStudents.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No students found matching filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
