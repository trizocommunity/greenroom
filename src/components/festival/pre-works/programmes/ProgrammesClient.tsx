"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useCategories } from "@/hooks/useCategories";
import { Eye, FileText, Loader2, Pencil, Filter } from "lucide-react";
import { ProgrammeDialog } from "./ProgrammeDialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ProgrammesClientProps {
  festivalId: string;
}

export function ProgrammesClient({ festivalId }: ProgrammesClientProps) {
  const { programmes, isLoading, deleteProgramme, isDeleting } =
    useProgrammes(festivalId);
  const { categories } = useCategories(festivalId);

  const [individualCategoryFilter, setIndividualCategoryFilter] =
    useState<string>("ALL");
  const [generalStageFilter, setGeneralStageFilter] = useState<string>("ALL");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Split programmes based on Category Type (not just programme type, but category drives it)
  // Usually Programme.category.type
  const individualProgrammes = programmes.filter(
    (p: any) => p.category?.type === "INDIVIDUAL" || !p.category,
  );
  const generalProgrammes = programmes.filter(
    (p: any) => p.category?.type === "GENERAL",
  );

  // Apply filters
  const filteredIndividual = individualProgrammes.filter((p: any) =>
    individualCategoryFilter === "ALL"
      ? true
      : p.category?.id === individualCategoryFilter,
  );

  const filteredGeneral = generalProgrammes.filter((p: any) =>
    generalStageFilter === "ALL" ? true : p.stageType === generalStageFilter,
  );

  const renderTable = (
    data: any[],
    type: "INDIVIDUAL" | "GENERAL",
    emptyMsg: string,
  ) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Stage Type</TableHead>
            <TableHead>
              {type === "INDIVIDUAL"
                ? "Max Entries (per Group)"
                : "Limits (Teams x Size)"}
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((programme: any) => (
            <TableRow key={programme.id}>
              <TableCell className="font-medium">{programme.name}</TableCell>
              <TableCell>{programme.category?.name || "No Category"}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    programme.stageType === "STAGE" ? "default" : "secondary"
                  }
                >
                  {programme.stageType === "STAGE" ? "Stage" : "Off-Stage"}
                </Badge>
              </TableCell>
              <TableCell>
                {programme.type === "INDIVIDUAL" ? (
                  <span className="text-muted-foreground">
                    Max: {programme.maxEntries}
                  </span>
                ) : (
                  <div className="flex flex-col text-xs">
                    <span>Teams: {programme.maxEntries}</span>
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
          {data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                  <p>{emptyMsg}</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toolbar Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Programmes</h2>
          <p className="text-sm text-muted-foreground">
            Manage individual and group programmes.
          </p>
        </div>
        <ProgrammeDialog festivalId={festivalId} />
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* INDIVIDUAL SECTION */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 p-3 rounded-md border text-sm">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-primary">Individual</h3>
              <Badge variant="secondary" className="px-1.5 py-0 h-5">
                {filteredIndividual.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={individualCategoryFilter}
                onValueChange={setIndividualCategoryFilter}
              >
                <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs bg-background">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="h-3 w-3" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories
                    ?.filter((c: any) => c.type === "INDIVIDUAL")
                    .map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {renderTable(
            filteredIndividual,
            "INDIVIDUAL",
            "No individual programmes found.",
          )}
        </div>

        {/* GENERAL SECTION */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 p-3 rounded-md border text-sm">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-orange-600 dark:text-orange-400">
                General / Group
              </h3>
              <Badge variant="secondary" className="px-1.5 py-0 h-5">
                {filteredGeneral.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={generalStageFilter}
                onValueChange={setGeneralStageFilter}
              >
                <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs bg-background">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="h-3 w-3" />
                    <SelectValue placeholder="Stage Type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="STAGE">Stage</SelectItem>
                  <SelectItem value="NON_STAGE">Off-Stage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {renderTable(
            filteredGeneral,
            "GENERAL",
            "No general programmes found.",
          )}
        </div>
      </div>
    </div>
  );
}
