"use client";

import {
  Eye,
  FileText,
  Loader2,
  Mic2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCategories } from "@/api/client/categories";
import {
  useDeleteProgramme,
  useProgrammesPaginated,
} from "@/api/client/programmes";
import { FeatureGate } from "@/components/common/FeatureGate";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import {
  ProgrammeStatusBadge,
  STATUS_LABELS,
} from "@/components/festival/ProgrammeStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  getAssignmentProgressLabel,
  getExpectedAssignmentsTotal,
} from "@/features/programmes/services/programme-assignment-progress";
import { BulkUploadProgrammesModal } from "./BulkUploadProgrammesModal";
import { ProgrammeDialog } from "./ProgrammeDialog";

interface ProgrammesClientProps {
  festivalId: string;
  festivalTier?: string | null;
  groupCount: number;
  children?: React.ReactNode;
}

export function ProgrammesClient({
  festivalId,
  festivalTier: _festivalTier,
  groupCount,
  children,
}: ProgrammesClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const { data: categories = [] } = useCategories(festivalId);
  const deleteProgramme = useDeleteProgramme();

  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [stageTypeFilter, setStageTypeFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionProgramme, setActionProgramme] = useState<{
    programme: any;
    action: "view" | "edit" | "delete";
  } | null>(null);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });

  const { data: paginatedData, isLoading } = useProgrammesPaginated(
    festivalId,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      categoryId: categoryFilter === "ALL" ? undefined : categoryFilter,
      search: searchQuery || undefined,
      type: typeFilter === "ALL" ? undefined : typeFilter,
      stageType: stageTypeFilter === "ALL" ? undefined : stageTypeFilter,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    },
  );

  const programmes = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const pageCount = Math.ceil(totalItems / pagination.pageSize);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [categoryFilter, stageTypeFilter, typeFilter, statusFilter, searchQuery]);

  if (isLoading && programmes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasFilters =
    categoryFilter !== "ALL" ||
    stageTypeFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    searchQuery.trim() !== "";

  function getProgressMeta(programme: any) {
    const assignedCount = programme?._count?.assignments ?? 0;
    const expectedCount = getExpectedAssignmentsTotal({
      programmeType: programme.type,
      groupCount,
      maxParticipantsPerGroup: programme.maxParticipantsPerGroup,
      maxTeamsPerGroup: programme.maxTeamsPerGroup,
      maxParticipantsPerTeam: programme.maxParticipantsPerTeam,
    });
    return {
      label: getAssignmentProgressLabel({ assignedCount, expectedCount }),
      isFullyAssigned: expectedCount > 0 && assignedCount >= expectedCount,
    };
  }

  return (
    <div className="space-y-6">
      {/* Header row: title (children) + Create — icon only on mobile */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children ?? (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Programmes
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Create programmes (events) and assign participants or teams.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How Programmes work"
            description="Programmes are the events or competitions in your festival."
          >
            <p className="text-sm text-muted-foreground">
              <strong>Type:</strong> Individual = one participant per entry;
              Team = one team per entry (multiple members).{" "}
              <strong>Stage type:</strong> Stage or Off-Stage is for
              organisation only.
            </p>
            <p className="text-sm text-muted-foreground">
              Create categories first, then add programmes. After that, assign
              participants or teams from the Assignments page.
            </p>
          </HowItWorksButton>
          {categories.length === 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button size="sm" disabled>
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add Programme</span>
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create a category first.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              {!isReadOnly && (
                <FeatureGate feature="programmeBulkUpload">
                  <BulkUploadProgrammesModal festivalId={festivalId} />
                </FeatureGate>
              )}
              <ProgrammeDialog
                festivalId={festivalId}
                trigger={
                  <Button size="sm" disabled={isReadOnly}>
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Programme</span>
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-4 border-b bg-muted/5">
          {/* Filters: mobile = flex-col w-full, desktop = row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="relative w-full sm:w-auto sm:min-w-[140px] sm:max-w-[200px] order-first">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full pl-8 text-xs sm:w-[180px]"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Team</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
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
              <SelectTrigger className="h-8 w-full sm:w-[110px] text-xs">
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
                size="sm"
                className="h-8 w-full sm:w-8 shrink-0"
                onClick={() => {
                  setCategoryFilter("ALL");
                  setStageTypeFilter("ALL");
                  setTypeFilter("ALL");
                  setStatusFilter("ALL");
                  setSearchQuery("");
                }}
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5 sm:mr-0" />
                <span className="sm:hidden">Clear filters</span>
              </Button>
            )}
            <span className="text-xs text-muted-foreground sm:ml-auto">
              {totalItems} row
              {totalItems !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="block md:hidden p-3 sm:p-4 space-y-3">
            {programmes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center text-muted-foreground rounded-xl border border-dashed bg-muted/20">
                <FileText className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium">No programmes found</p>
                <p className="text-sm">
                  Try changing your filters or add a new programme.
                </p>
              </div>
            ) : (
              programmes.map((programme: any) => (
                <div
                  key={programme.id}
                  className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm transition-all active:scale-[0.99] hover:shadow-md hover:border-primary/25"
                >
                  {/* Card header: name + actions */}
                  <div className="flex items-start justify-between gap-3 p-4 pb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2">
                        {programme.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">
                          {programme.category?.name || "No category"}
                        </p>
                        {programme.status && (
                          <ProgrammeStatusBadge
                            status={programme.status as ProgrammeStatus}
                            className="text-xs"
                          />
                        )}
                        <Badge
                          variant={
                            getProgressMeta(programme).isFullyAssigned
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {getProgressMeta(programme).label}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onSelect={() =>
                            setActionProgramme({ programme, action: "view" })
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {!isReadOnly && (
                          <>
                            <DropdownMenuItem
                              onSelect={() =>
                                setActionProgramme({
                                  programme,
                                  action: "edit",
                                })
                              }
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() =>
                                setActionProgramme({
                                  programme,
                                  action: "delete",
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Details strip: labeled, scannable */}
                  <div className="px-4 pb-4 pt-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        {programme.type === "GROUP" ? (
                          <Users className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                        ) : (
                          <User className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                        )}
                        <span>
                          {programme.type === "GROUP" ? "Team" : "Individual"}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Mic2 className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {programme.stageType === "STAGE"
                            ? "On stage"
                            : "Off stage"}
                        </span>
                      </span>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      {programme.type === "INDIVIDUAL" ? (
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {programme.maxParticipantsPerGroup}
                          </span>{" "}
                          max entries per group
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {programme.maxTeamsPerGroup}
                          </span>{" "}
                          teams per group,{" "}
                          <span className="font-medium text-foreground">
                            {programme.maxParticipantsPerTeam}
                          </span>{" "}
                          members per team
                        </span>
                      )}
                    </div>
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
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Programme type</TableHead>
                  <TableHead className="text-muted-foreground font-normal">
                    Stage
                  </TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programmes.map((programme: any) => (
                  <TableRow key={programme.id}>
                    <TableCell className="font-medium">
                      {programme.name}
                    </TableCell>
                    <TableCell>
                      {programme.category?.name || "No Category"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {programme.status ? (
                          <ProgrammeStatusBadge
                            status={programme.status as ProgrammeStatus}
                            className="text-[10px]"
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                        <Badge
                          variant={
                            getProgressMeta(programme).isFullyAssigned
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {getProgressMeta(programme).label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          programme.type === "GROUP" ? "secondary" : "outline"
                        }
                        className="text-[10px] font-medium"
                      >
                        {programme.type === "GROUP" ? "Team" : "Individual"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] text-muted-foreground">
                        {programme.stageType === "STAGE"
                          ? "Stage"
                          : "Off-Stage"}
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
                            Size: {programme.maxParticipantsPerTeam}
                          </span>
                        </div>
                      )}
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
                            onSelect={() =>
                              setActionProgramme({
                                programme,
                                action: "view",
                              })
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {!isReadOnly && (
                            <>
                              <DropdownMenuItem
                                onSelect={() =>
                                  setActionProgramme({
                                    programme,
                                    action: "edit",
                                  })
                                }
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() =>
                                  setActionProgramme({
                                    programme,
                                    action: "delete",
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {programmes.length === 0 && (
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

          {pageCount > 1 && (
            <div className="p-4 border-t">
              <DataTablePagination
                pageIndex={pagination.pageIndex}
                pageCount={pageCount}
                onPageChange={(page) => setPagination((p) => ({ ...p, pageIndex: page }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controlled dialogs opened from dropdown */}
      {actionProgramme?.action === "view" && actionProgramme.programme && (
        <ProgrammeDialog
          festivalId={festivalId}
          programme={actionProgramme.programme}
          readOnly
          open={true}
          onOpenChange={(open) => !open && setActionProgramme(null)}
        />
      )}
      {!isReadOnly &&
        actionProgramme?.action === "edit" &&
        actionProgramme.programme && (
          <ProgrammeDialog
            festivalId={festivalId}
            programme={actionProgramme.programme}
            open={true}
            onOpenChange={(open) => !open && setActionProgramme(null)}
          />
        )}
      {!isReadOnly &&
        actionProgramme?.action === "delete" &&
        actionProgramme.programme && (
          <DeleteDialog
            title="Delete Programme"
            description="Are you sure? This will delete all assignments associated with this programme."
            onDelete={async () => {
              await deleteProgramme.mutateAsync({
                festivalId,
                programmeId: actionProgramme.programme.id,
              });
              setActionProgramme(null);
            }}
            isDeleting={deleteProgramme.isPending}
            open={true}
            onOpenChange={(open) => !open && setActionProgramme(null)}
          />
        )}
    </div>
  );
}
