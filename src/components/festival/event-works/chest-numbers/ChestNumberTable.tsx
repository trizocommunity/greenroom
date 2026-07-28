"use client";

import { FileText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

interface ChestNumberTableProps {
  participants: any[];
}

export function ChestNumberTable({ participants }: ChestNumberTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  // Extract unique options
  const options = useMemo(() => {
    const cats = new Set<string>();
    const grps = new Set<string>();
    participants.forEach((s) => {
      if (s.category?.name) cats.add(s.category.name);
      if (s.group?.name) grps.add(s.group.name);
    });
    return {
      categories: Array.from(cats).sort(),
      groups: Array.from(grps).sort(),
    };
  }, [participants]);

  // Filter Data
  const filteredParticipants = useMemo(() => {
    return participants.filter((s) => {
      const matchCat =
        categoryFilter === "all" || s.category?.name === categoryFilter;
      const matchGrp = groupFilter === "all" || s.group?.name === groupFilter;
      return matchCat && matchGrp;
    });
  }, [participants, categoryFilter, groupFilter]);

  const clearFilters = () => {
    setCategoryFilter("all");
    setGroupFilter("all");
  };

  const hasActiveFilters = categoryFilter !== "all" || groupFilter !== "all";

  return (
    <Card>
      <CardHeader className="p-3 border-b bg-muted/5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-auto">
            {filteredParticipants.length} row
            {filteredParticipants.length !== 1 ? "s" : ""}
          </span>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Group" />
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
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Category" />
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
              className="h-8 w-8"
              onClick={clearFilters}
              title="Clear filters"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
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
            {filteredParticipants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell>
                  {participant.chestNumber ? (
                    <Badge
                      variant="outline"
                      className="font-mono text-base px-2.5 py-0.5 bg-primary/10 border-primary/20 text-primary"
                    >
                      {participant.chestNumber}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">
                      Pending
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {participant.name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: participant.group?.color || "#2563eb",
                      }}
                    />
                    {participant.group?.name || "-"}
                  </div>
                </TableCell>
                <TableCell>{participant.category?.name || "-"}</TableCell>
              </TableRow>
            ))}
            {filteredParticipants.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p>No participants found matching filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
