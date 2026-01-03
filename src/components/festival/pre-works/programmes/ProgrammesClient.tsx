"use client";

import { Eye, FileText, Filter, Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Label } from "@/components/ui/label";
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
import { useProgrammes } from "@/hooks/useProgrammes";
import { BulkUploadProgrammesModal } from "./BulkUploadProgrammesModal";
import { ProgrammeDialog } from "./ProgrammeDialog";

interface ProgrammesClientProps {
  festivalId: string;
}

export function ProgrammesClient({ festivalId }: ProgrammesClientProps) {
  const { programmes, isLoading, deleteProgramme, isDeleting } =
    useProgrammes(festivalId);
  const { categories } = useCategories(festivalId);

  // Unified Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [stageTypeFilter, setStageTypeFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter Logic
  const filteredProgrammes = programmes.filter((p: any) => {
    // Category Filter
    if (categoryFilter !== "ALL" && p.category?.id !== categoryFilter) {
      return false;
    }
    // Stage Type Filter
    if (stageTypeFilter !== "ALL" && p.stageType !== stageTypeFilter) {
      return false;
    }
    // Type Filter (Individual/Group)
    if (typeFilter !== "ALL" && p.type !== typeFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 bg-background p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Programmes</h2>
              <Badge variant="secondary">{filteredProgrammes.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage all festival programmes.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {categories.length === 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button disabled>Add Programme</Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create a category first.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="flex gap-2">
                <BulkUploadProgrammesModal festivalId={festivalId} />
                <ProgrammeDialog
                  festivalId={festivalId}
                  trigger={<Button>Add Programme</Button>}
                />
              </div>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-3 w-3" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="GROUP">Group</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stageTypeFilter} onValueChange={setStageTypeFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stages</SelectItem>
              <SelectItem value="STAGE">Stage</SelectItem>
              <SelectItem value="NON_STAGE">Off-Stage</SelectItem>
            </SelectContent>
          </Select>

          {(categoryFilter !== "ALL" ||
            stageTypeFilter !== "ALL" ||
            typeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                setCategoryFilter("ALL");
                setStageTypeFilter("ALL");
                setTypeFilter("ALL");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Stage Type</TableHead>
              <TableHead>Limits</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProgrammes.map((programme: any) => (
              <TableRow key={programme.id}>
                <TableCell className="font-medium">{programme.name}</TableCell>
                <TableCell>
                  {programme.category?.name || "No Category"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {programme.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      programme.stageType === "STAGE" ? "default" : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {programme.stageType === "STAGE" ? "Stage" : "Off-Stage"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {programme.type === "INDIVIDUAL" ? (
                    <span className="text-muted-foreground">
                      Max Entries: {programme.maxEntries}
                    </span>
                  ) : (
                    <div className="flex flex-col">
                      <span>Max Teams: {programme.maxEntries}</span>
                      <span className="text-muted-foreground">
                        Size: {programme.maxTeamSize}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ProgrammeDialog
                      festivalId={festivalId}
                      programme={programme}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <ProgrammeDialog
                      festivalId={festivalId}
                      programme={programme}
                      readOnly
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DeleteDialog
                      title="Delete Programme"
                      description="Are you sure? This will delete all assignments associated with this programme."
                      onDelete={async () => {
                        await deleteProgramme(programme.id);
                      }}
                      isDeleting={isDeleting}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredProgrammes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p>No programmes found matching filters.</p>
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
