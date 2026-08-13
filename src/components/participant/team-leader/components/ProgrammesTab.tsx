import { Search, Plus, ChevronRight, ShieldAlert, Mail, Phone } from "lucide-react";
import { AppEmptyState, StatusPill } from "@/components/app/AppSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/core/utils/cn";
import type { ProgrammeForAssignment } from "../types";
import type { CategoryType, StageType } from "@/core/types/app-enums";

function stageTypeLabel(stageType?: StageType | null): string {
  return stageType === "NON_STAGE" ? "Off stage" : "On stage";
}

interface ProgrammesTabProps {
  isUnconfigured: boolean;
  runtimeIsReadOnly: boolean;
  isUpcoming: boolean;
  tlHasAccess: boolean;
  canAssign: boolean;
  canAdd: boolean;
  canDelete: boolean;
  startLabel: string | null;
  deadlineLabel: string | null;
  managerName?: string | null;
  managerEmail?: string | null;
  managerPhone?: string | null;
  
  programmeSearch: string;
  setProgrammeSearch: (val: string) => void;
  selectedProgrammeCategoryId: string;
  setSelectedProgrammeCategoryId: (val: string) => void;
  programmeCategoryOptions: { id: string; name: string; type: CategoryType | null }[];
  selectedProgrammeType: string;
  setSelectedProgrammeType: (val: "ALL" | "GROUP" | "INDIVIDUAL") => void;
  assignmentStatusFilter: string;
  setAssignmentStatusFilter: (val: "ALL" | "COMPLETED" | "NOT_COMPLETED") => void;
  
  setAssignmentModalOpen: (open: boolean) => void;
  
  eligibleProgrammes: ProgrammeForAssignment[];
  assignPageIndex: number;
  setAssignPageIndex: (page: number | ((p: number) => number)) => void;
  pageSize: number;
  
  groupCapacityByProgrammeId: Map<string, { used: number; total: number; isFull: boolean }>;
  openAssignDrawer: (programmeId: string) => void;
}

export function ProgrammesTab({
  isUnconfigured,
  runtimeIsReadOnly,
  isUpcoming,
  tlHasAccess,
  canAssign,
  canAdd,
  canDelete,
  startLabel,
  deadlineLabel,
  managerName,
  managerEmail,
  managerPhone,
  
  programmeSearch,
  setProgrammeSearch,
  selectedProgrammeCategoryId,
  setSelectedProgrammeCategoryId,
  programmeCategoryOptions,
  selectedProgrammeType,
  setSelectedProgrammeType,
  assignmentStatusFilter,
  setAssignmentStatusFilter,
  
  setAssignmentModalOpen,
  
  eligibleProgrammes,
  assignPageIndex,
  setAssignPageIndex,
  pageSize,
  
  groupCapacityByProgrammeId,
  openAssignDrawer,
}: ProgrammesTabProps) {
  return (
    <div className="flex flex-col">
      {isUnconfigured && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/[0.06] px-4 py-3 text-sm text-blue-600">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            The festival manager hasn't set an assignment window yet — reach
            out to them to enable new assignments.
          </p>
        </div>
      )}

      {!isUnconfigured && runtimeIsReadOnly && (
        <div
          className={cn(
            "mt-4 rounded-2xl border p-4 sm:p-5",
            isUpcoming
              ? "border-amber-500/30 bg-amber-500/[0.06]"
              : "border-destructive/30 bg-destructive/[0.06]",
          )}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                isUpcoming ? "text-amber-600" : "text-destructive",
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[15px] font-medium",
                  isUpcoming ? "text-amber-600" : "text-destructive",
                )}
              >
                {isUpcoming
                  ? "Assignments haven't opened yet"
                  : "Assignments are closed"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {isUpcoming ? (
                  <>
                    {startLabel
                      ? `Assignments open on ${startLabel}`
                      : "Assignments haven't opened yet"}
                    {deadlineLabel ? ` and close on ${deadlineLabel}.` : "."}{" "}
                    You can look around in the meantime. Contact the festival
                    manager if you need it opened sooner.
                  </>
                ) : (
                  <>
                    {deadlineLabel
                      ? `The assignment deadline passed on ${deadlineLabel}.`
                      : "The assignment deadline has passed."}{" "}
                    You can still review everything already assigned. Contact
                    the festival manager if something needs to change.
                  </>
                )}
              </p>

              {(managerName || managerEmail || managerPhone) && (
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                  {managerName && (
                    <span className="text-muted-foreground">
                      {managerName}
                    </span>
                  )}
                  {managerEmail && (
                    <a
                      href={`mailto:${managerEmail}`}
                      className="inline-flex items-center gap-1.5 font-medium text-primary hover:opacity-70"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {managerEmail}
                    </a>
                  )}
                  {managerPhone && (
                    <a
                      href={`tel:${managerPhone}`}
                      className="inline-flex items-center gap-1.5 font-medium text-primary hover:opacity-70"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {managerPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tlHasAccess && !canAdd && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-600">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            The festival manager has disabled assigning programmes. You can
            still review what's already assigned.
          </p>
        </div>
      )}
      {tlHasAccess && !canDelete && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-600">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            The festival manager has disabled removing assignments. Contact
            them if something needs to change.
          </p>
        </div>
      )}

      <div>
        <div className="mb-3 sm:mb-5 flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search programmes..."
              value={programmeSearch}
              onChange={(e) => setProgrammeSearch(e.target.value)}
              className="h-10 w-full rounded-full pl-9"
            />
          </div>
          <div className="flex flex-wrap lg:flex-row items-center gap-2">
            <div className="w-full grid grid-cols-3 gap-2 lg:w-auto">
              <Select
                value={selectedProgrammeCategoryId}
                onValueChange={setSelectedProgrammeCategoryId}
              >
                <SelectTrigger className="h-9 rounded-full text-sm w-auto">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {programmeCategoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedProgrammeType}
                onValueChange={(v) =>
                  setSelectedProgrammeType(
                    v as "ALL" | "GROUP" | "INDIVIDUAL",
                  )
                }
              >
                <SelectTrigger className="h-9 rounded-full text-sm w-auto">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="GROUP">Group</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={assignmentStatusFilter}
                onValueChange={(v) =>
                  setAssignmentStatusFilter(
                    v as "ALL" | "COMPLETED" | "NOT_COMPLETED",
                  )
                }
              >
                <SelectTrigger className="h-9 rounded-full text-sm w-auto">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="NOT_COMPLETED">Uncompleted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canAssign && (
              <Button
                size="sm"
                className="h-9 w-full lg:w-auto rounded-full xl:ml-2"
                onClick={() => setAssignmentModalOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New assignment
              </Button>
            )}
          </div>
        </div>

        {eligibleProgrammes.length === 0 ? (
          <AppEmptyState
            title="No programmes"
            description="Nothing matches these filters."
          />
        ) : (
          <>
            <ul className="divide-y divide-border border-y border-border">
              {eligibleProgrammes
                .slice(
                  assignPageIndex * pageSize,
                  (assignPageIndex + 1) * pageSize,
                )
                .map((p) => {
                  const capacity = groupCapacityByProgrammeId.get(p.id);
                  const isFull = capacity?.isFull ?? false;

                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => openAssignDrawer(p.id)}
                        className="group flex w-full items-center gap-4 py-4 text-left transition-opacity hover:opacity-80"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[15px] font-medium text-heading">
                              {p.name}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {p.category.name} · {stageTypeLabel(p.stageType)}{" "}
                            ·{" "}
                            {p.type === "GROUP"
                              ? `Team · ${p.maxTeamsPerGroup} teams of ${p.maxParticipantsPerTeam}`
                              : `Individual · max ${p.maxParticipantsPerGroup}`}
                            {p.category.type === "GENERAL"
                              ? " · open to all categories"
                              : ""}
                          </p>
                        </div>

                        <StatusPill
                          tone={isFull ? "live" : "muted"}
                          className="shrink-0 tabular-nums"
                        >
                          {isFull
                            ? "Completed"
                            : capacity
                              ? `${capacity.used}/${capacity.total} Assigned`
                              : "—"}
                        </StatusPill>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </li>
                  );
                })}
            </ul>

            {eligibleProgrammes.length > pageSize && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationFirst
                      onClick={(e) => {
                        e.preventDefault();
                        setAssignPageIndex(0);
                      }}
                      className={
                        assignPageIndex === 0
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={(e) => {
                        e.preventDefault();
                        if (assignPageIndex > 0)
                          setAssignPageIndex((p) => p - 1);
                      }}
                      className={
                        assignPageIndex === 0
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>

                  {[
                    ...Array(Math.ceil(eligibleProgrammes.length / pageSize)),
                  ].map((_, i) => {
                    const targetPage = i;
                    const totalPages = Math.ceil(
                      eligibleProgrammes.length / pageSize,
                    );

                    if (
                      targetPage === 0 ||
                      targetPage === totalPages - 1 ||
                      (targetPage >= assignPageIndex - 1 &&
                        targetPage <= assignPageIndex + 1)
                    ) {
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={assignPageIndex === targetPage}
                            onClick={(e) => {
                              e.preventDefault();
                              setAssignPageIndex(targetPage);
                            }}
                          >
                            {targetPage + 1}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }

                    if (
                      targetPage === assignPageIndex - 2 ||
                      targetPage === assignPageIndex + 2
                    ) {
                      return (
                        <PaginationItem key={i}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={(e) => {
                        e.preventDefault();
                        if (
                          (assignPageIndex + 1) * pageSize <
                          eligibleProgrammes.length
                        )
                          setAssignPageIndex((p) => p + 1);
                      }}
                      className={
                        (assignPageIndex + 1) * pageSize >=
                        eligibleProgrammes.length
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLast
                      onClick={(e) => {
                        e.preventDefault();
                        setAssignPageIndex(
                          Math.ceil(eligibleProgrammes.length / pageSize) - 1,
                        );
                      }}
                      className={
                        (assignPageIndex + 1) * pageSize >=
                        eligibleProgrammes.length
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </div>
  );
}
