"use client";

import { useMemo, useState } from "react";
import {
  ListChecks,
  X,
  Medal,
  Users,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { getGradeBadgeColor } from "@/lib/results-calculator";

const getTeamIdentifier = (assignment: any, type: string) => {
  if (type === "GROUP") {
    const groupName = assignment.group?.name || "No Group";
    const teamNum = assignment.teamNumber || 1;
    return `${groupName}-${teamNum}`;
  }
  return assignment.id;
};

type Programme = {
  id: string;
  name: string;
  type: string;
  category: { id: string; name: string };
  assignments: any[];
};

interface ResultsExploreClientProps {
  festival: { id: string; name: string; slug: string };
  programmes: Programme[];
  categories: { id: string; name: string }[];
}

export function ResultsExploreClient({
  festival,
  programmes,
  categories,
}: ResultsExploreClientProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewProgramme, setViewProgramme] = useState<Programme | null>(null);

  const programmesWithResults = useMemo(() => {
    return programmes.filter((p) =>
      p.assignments.some((a: any) => a.result?.isPublished === true),
    );
  }, [programmes]);

  const filteredProgrammes = useMemo(() => {
    let list = programmesWithResults;
    if (filterCategory !== "all") {
      list = list.filter((p) => p.category.id === filterCategory);
    }
    if (filterType !== "all") {
      list = list.filter((p) => p.type === filterType);
    }
    return list.sort(
      (a, b) =>
        (b.category?.name || "").localeCompare(a.category?.name || "") ||
        a.name.localeCompare(b.name),
    );
  }, [programmesWithResults, filterCategory, filterType]);

  const viewDetailsRows = useMemo(() => {
    if (!viewProgramme) return [];

    if (viewProgramme.type === "GROUP") {
      const teamMap = new Map<string, any>();
      viewProgramme.assignments.forEach((assignment: any) => {
        if (!assignment.result) return;
        const teamId = getTeamIdentifier(assignment, "GROUP");
        if (!teamMap.has(teamId)) {
          const studentAndTeam = `${assignment.student?.name || "Unknown"} and team`;
          const groupName = assignment.group?.name || "";
          teamMap.set(teamId, {
            assignmentId: assignment.id,
            displayName: studentAndTeam,
            subText: groupName,
            chestNumber: "",
            grade: assignment.result.grade,
            points: assignment.result.points,
            position: assignment.result.position || 0,
            remarks: assignment.result.remarks,
          });
        }
      });
      return Array.from(teamMap.values()).sort((a: any, b: any) => {
        if (a.position && b.position) return a.position - b.position;
        return (b.points || 0) - (a.points || 0);
      });
    }

    const details = viewProgramme.assignments
      .filter((a: any) => a.result != null)
      .map((assignment: any) => {
        const result = assignment.result!;
        return {
          assignmentId: assignment.id,
          displayName: assignment.student?.name || "Unknown",
          subText: "",
          chestNumber: assignment.student?.chestNumber
            ? `#${assignment.student.chestNumber}`
            : "",
          grade: result.grade,
          points: result.points,
          position: result.position || 0,
          remarks: result.remarks,
        };
      });
    return details.sort((a: any, b: any) => {
      if (a.position && b.position) return a.position - b.position;
      return (b.points || 0) - (a.points || 0);
    });
  }, [viewProgramme]);

  const hasFilters = filterCategory !== "all" || filterType !== "all";
  const clearFilters = () => {
    setFilterCategory("all");
    setFilterType("all");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Results</h1>
      </div>

      {/* Filters – separate component */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-auto">
              <span className="font-semibold text-foreground">
                {filteredProgrammes.length}
              </span>{" "}
              published programme{filteredProgrammes.length !== 1 ? "s" : ""}
            </span>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={clearFilters}
                title="Clear filters"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results cards – listed outside filter */}
      {filteredProgrammes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ListChecks className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No published programmes found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredProgrammes.map((prog) => (
            <Card
              key={prog.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/40 hover:shadow-md",
                viewProgramme?.id === prog.id && "ring-2 ring-primary",
              )}
              onClick={() => setViewProgramme(prog)}
            >
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                    {prog.name}
                  </h3>
                  <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <Badge variant="outline" className="text-xs font-normal">
                    {prog.category.name}
                  </Badge>
                  {prog.type === "GROUP" && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] gap-0.5"
                    >
                      <Users className="w-3 h-3" />
                      Group
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!viewProgramme}
        onOpenChange={(open) => !open && setViewProgramme(null)}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Medal className="w-5 h-5 text-primary" />
              {viewProgramme?.name}
            </DialogTitle>
            <DialogDescription>
              {viewProgramme?.category.name} · {viewProgramme?.type} programme
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>
                    {viewProgramme?.type === "GROUP" ? "Team" : "Chest & Name"}
                  </TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="text-center">Points</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewDetailsRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No results for this programme.
                    </TableCell>
                  </TableRow>
                ) : (
                  viewDetailsRows.map((row: any) => (
                    <TableRow key={row.assignmentId}>
                      <TableCell className="font-semibold">
                        {row.position > 0 ? (
                          <div className="flex items-center gap-1">
                            {row.position === 1 && (
                              <span className="text-yellow-500">🥇</span>
                            )}
                            {row.position === 2 && (
                              <span className="text-gray-400">🥈</span>
                            )}
                            {row.position === 3 && (
                              <span className="text-amber-700">🥉</span>
                            )}
                            <span>{row.position}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.displayName}</div>
                        {(row.chestNumber || row.subText) && (
                          <div className="text-xs text-muted-foreground">
                            {row.chestNumber} {row.subText}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono font-semibold",
                            getGradeBadgeColor(row.grade),
                          )}
                        >
                          {row.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono font-semibold">
                          {row.points} pts
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {row.remarks || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
