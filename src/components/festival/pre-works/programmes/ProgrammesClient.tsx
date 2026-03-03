"use client";

import { Eye, FileText, Loader2, Pencil, Plus, X } from "lucide-react";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FeatureGate } from "@/components/common/FeatureGate";
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

  const hasFilters =
    categoryFilter !== "ALL" ||
    stageTypeFilter !== "ALL" ||
    typeFilter !== "ALL";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Programmes</h1>
        <div className="flex items-center gap-2">
          <HowItWorksButton
            title="How Programmes work"
            description="Programmes are the events or competitions in your festival."
          >
            <p className="text-sm text-muted-foreground">
              <strong>Type:</strong> Individual = one participant per entry;
              Team = one team per entry (multiple members). <strong>Stage
              type:</strong> Stage or Off-Stage is for organisation only.
            </p>
            <p className="text-sm text-muted-foreground">
              Create categories first, then add programmes. After that, assign
              students or teams from the Assignments page.
            </p>
          </HowItWorksButton>
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
            <>
              <FeatureGate feature="programmeBulkUpload">
                <BulkUploadProgrammesModal festivalId={festivalId} />
              </FeatureGate>
              <ProgrammeDialog
                festivalId={festivalId}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Programme
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="p-3 border-b bg-muted/5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-auto">
              {filteredProgrammes.length} row{filteredProgrammes.length !== 1 ? "s" : ""}
            </span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Team</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageTypeFilter} onValueChange={setStageTypeFilter}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="STAGE">Stage</SelectItem>
                <SelectItem value="NON_STAGE">Off-Stage</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setCategoryFilter("ALL");
                  setStageTypeFilter("ALL");
                  setTypeFilter("ALL");
                }}
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
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Programme type</TableHead>
              <TableHead className="text-muted-foreground font-normal">
                Stage
              </TableHead>
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
                  <Badge
                    variant={programme.type === "GROUP" ? "secondary" : "outline"}
                    className="text-[10px] font-medium"
                  >
                    {programme.type === "GROUP" ? "Team" : "Individual"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] text-muted-foreground">
                    {programme.stageType === "STAGE" ? "Stage" : "Off-Stage"}
                  </span>
                </TableCell>
                <TableCell className="text-xs">
                  {programme.type === "INDIVIDUAL" ? (
                    <span className="text-muted-foreground">
                      Max Entries: {programme.maxParticipantsPerGroup}
                    </span>
                  ) : (
                    <div className="flex flex-col">
                      <span>Max Teams: {programme.maxTeamsPerGroup}</span>
                      <span className="text-muted-foreground">
                        Size: {programme.maxStudentsPerTeam}
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
        </CardContent>
      </Card>
    </div>
  );
}
