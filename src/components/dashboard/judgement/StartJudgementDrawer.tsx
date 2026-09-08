"use client";

import {
  Check,
  ChevronsUpDown,
  Loader2,
  Play,
  Plus,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/core/utils/cn";
import { ReportingRosterList } from "./ReportingRosterList";
import type { Judge, Programme, ReportingDetails } from "./types";

export type StartJudgementDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programme: Programme | null;
  wizardKind: "create" | "rejudge";
  judges: Judge[];
  selectedJudgeIds: string[];
  toggleJudge: (id: string) => void;
  judgingMode: "SINGLE" | "GROUP";
  setJudgingMode: (v: "SINGLE" | "GROUP") => void;
  newJudgeName: string;
  setNewJudgeName: (v: string) => void;
  isAddingJudge: boolean;
  addJudge: (overrideName?: string) => void;
  isPending: boolean;
  canStart: boolean;
  onStart: () => void;
  formatCardDateTime: (v: string | Date) => string;
};

/**
 * The start-judgement drawer. Driven by `useJudgementWizard`; this component
 * just renders the form. The roster section reuses `ReportingRosterList` so
 * the "teamlead & party" naming stays in one place.
 */
export function StartJudgementDrawer({
  open,
  onOpenChange,
  programme,
  wizardKind,
  judges,
  selectedJudgeIds,
  toggleJudge,
  judgingMode,
  setJudgingMode,
  newJudgeName,
  setNewJudgeName,
  isAddingJudge,
  addJudge,
  isPending,
  canStart,
  onStart,
  formatCardDateTime,
}: StartJudgementDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
      }}
    >
      <DrawerContent className="flex flex-col">
        <DrawerHeader className="pb-2 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-1 w-full">
            <div className="space-y-1 text-center sm:text-left w-full">
              <DrawerTitle className="text-center sm:text-left text-lg font-semibold tracking-tight">
                {wizardKind === "rejudge" ? "Rejudge" : "Start Judgement"}
              </DrawerTitle>
              <DrawerDescription className="text-center sm:text-left text-xs sm:text-sm">
                {programme ? (
                  <>
                    <span className="font-medium text-foreground">
                      {programme.name}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {programme.status}
                    </span>
                  </>
                ) : (
                  "Select judges, then start."
                )}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto pb-4 sm:pb-6 overscroll-contain">
          <div className="space-y-3 pt-1 sm:space-y-4 sm:pt-2">
            <JudgesAndModeSection
              judges={judges}
              selectedJudgeIds={selectedJudgeIds}
              toggleJudge={toggleJudge}
              newJudgeName={newJudgeName}
              setNewJudgeName={setNewJudgeName}
              isAddingJudge={isAddingJudge}
              addJudge={addJudge}
              judgingMode={judgingMode}
              setJudgingMode={setJudgingMode}
            />

            {programme?.reportingDetails ? (
              <ProgrammePreview
                programme={programme}
                details={programme.reportingDetails}
                formatCardDateTime={formatCardDateTime}
              />
            ) : null}
          </div>
        </div>
        <DrawerFooter className="pt-2">
          <Button
            className="h-10 sm:h-9 w-full text-xs sm:text-sm font-medium shadow-sm touch-manipulation"
            type="button"
            onClick={onStart}
            disabled={!canStart || isPending}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {isPending
              ? "Starting…"
              : wizardKind === "rejudge"
                ? "Restart judgement"
                : "Start judgement"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function JudgesAndModeSection({
  judges,
  selectedJudgeIds,
  toggleJudge,
  isAddingJudge,
  addJudge,
  judgingMode,
  setJudgingMode,
}: {
  judges: Judge[];
  selectedJudgeIds: string[];
  toggleJudge: (id: string) => void;
  newJudgeName?: string;
  setNewJudgeName?: (v: string) => void;
  isAddingJudge: boolean;
  addJudge: (overrideName?: string) => void;
  judgingMode: "SINGLE" | "GROUP";
  setJudgingMode: (v: "SINGLE" | "GROUP") => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleCreateOrSelectJudge = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = judges.find(
      (j) => j.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      if (!selectedJudgeIds.includes(existing.id)) {
        toggleJudge(existing.id);
      }
    } else {
      addJudge(trimmed);
    }
    setSearch("");
  };

  const selectedJudges = useMemo(() => {
    const map = new Map(judges.map((j) => [j.id, j]));
    return selectedJudgeIds
      .map((id) => map.get(id))
      .filter((j): j is Judge => Boolean(j));
  }, [judges, selectedJudgeIds]);

  return (
    <div className="space-y-2">
      {/* Side-by-side row: Judges combobox + Judging mode switch */}
      <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-2.5 items-end">
        {/* Judges Combobox column */}
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Judges
            {selectedJudgeIds.length > 0 ? ` (${selectedJudgeIds.length})` : ""}
          </Label>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                disabled={isAddingJudge}
                className="w-full justify-between h-9 px-3 font-normal text-xs sm:text-sm bg-background touch-manipulation"
              >
                <span className="truncate">
                  {selectedJudgeIds.length === 0
                    ? "Select judges..."
                    : `${selectedJudgeIds.length} judge${
                        selectedJudgeIds.length === 1 ? "" : "s"
                      } selected`}
                </span>
                {isAddingJudge ? (
                  <Loader2 className="ml-1.5 h-3.5 w-3.5 shrink-0 animate-spin opacity-50" />
                ) : (
                  <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] min-w-[260px] max-w-[calc(100vw-2rem)] p-0"
              align="start"
            >
              <Command>
                <CommandInput
                  placeholder="Search or type to add judge..."
                  value={search}
                  onValueChange={setSearch}
                  className="text-xs sm:text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (search.trim()) {
                        handleCreateOrSelectJudge(search);
                      }
                    }
                  }}
                />
                <CommandList>
                  <CommandEmpty className="p-2 text-center text-sm">
                    {search.trim() ? (
                      <button
                        type="button"
                        onClick={() => handleCreateOrSelectJudge(search)}
                        className="w-full flex items-center gap-2 p-2.5 text-xs sm:text-sm text-left hover:bg-muted rounded-sm transition-colors text-primary font-medium touch-manipulation"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          Add &ldquo;{search.trim()}&rdquo;
                        </span>
                      </button>
                    ) : (
                      "No judges found."
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {judges.map((j) => {
                      const isSelected = selectedJudgeIds.includes(j.id);
                      return (
                        <CommandItem
                          key={j.id}
                          value={j.name}
                          onSelect={() => {
                            toggleJudge(j.id);
                          }}
                          className="flex items-center justify-between text-xs sm:text-sm cursor-pointer py-2 touch-manipulation"
                        >
                          <span className="truncate">{j.name}</span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </CommandItem>
                      );
                    })}
                    {search.trim() &&
                      !judges.some(
                        (j) =>
                          j.name.toLowerCase() === search.trim().toLowerCase(),
                      ) && (
                        <CommandItem
                          value={`add-new-judge-${search.trim()}`}
                          onSelect={() => handleCreateOrSelectJudge(search)}
                          className="text-primary font-medium flex items-center gap-2 cursor-pointer text-xs sm:text-sm py-2 touch-manipulation"
                        >
                          <Plus className="w-4 h-4 shrink-0" />
                          <span>Add &ldquo;{search.trim()}&rdquo;</span>
                        </CommandItem>
                      )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Mode Switch column */}
        <div className="space-y-1.5 shrink-0">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Mode
          </Label>
          <div
            className="flex items-center h-9 px-2 sm:px-2.5 rounded-md border border-input bg-background gap-1.5 sm:gap-2 select-none"
            title={
              judgingMode === "GROUP"
                ? "Group mode: shared screen, all judges at once"
                : "Single mode: each judge scores independently"
            }
          >
            <button
              type="button"
              onClick={() => setJudgingMode("SINGLE")}
              className={cn(
                "text-xs transition-colors cursor-pointer py-1 px-1 rounded touch-manipulation",
                judgingMode === "SINGLE"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Single
            </button>
            <Switch
              checked={judgingMode === "GROUP"}
              onCheckedChange={(checked) =>
                setJudgingMode(checked ? "GROUP" : "SINGLE")
              }
              className="shrink-0"
              aria-label="Toggle judging mode between single and group"
            />
            <button
              type="button"
              onClick={() => setJudgingMode("GROUP")}
              className={cn(
                "text-xs transition-colors cursor-pointer py-1 px-1 rounded touch-manipulation",
                judgingMode === "GROUP"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Group
            </button>
          </div>
        </div>
      </div>

      {/* Selected judge badges */}
      {selectedJudges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {selectedJudges.map((j) => (
            <div
              key={j.id}
              className="inline-flex items-center gap-1.5 py-1 pl-2 pr-1 text-xs font-medium rounded-md border border-primary/30 bg-primary/10 dark:bg-primary/20 text-primary shadow-xs transition-colors"
            >
              <User className="h-3 w-3 shrink-0 opacity-70" />
              <span className="max-w-[150px] xs:max-w-[180px] sm:max-w-[220px] truncate">
                {j.name}
              </span>
              <button
                type="button"
                onClick={() => toggleJudge(j.id)}
                className="rounded-full p-0.5 text-primary/70 hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer touch-manipulation ml-0.5"
                aria-label={`Remove ${j.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgrammePreview({
  programme,
  details,
  formatCardDateTime,
}: {
  programme: Programme;
  details: ReportingDetails;
  formatCardDateTime: (v: string | Date) => string;
}) {
  return (
    <div className="space-y-3 sm:space-y-4 pt-1 sm:pt-2">
      <div className="flex items-center justify-center sm:justify-start flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground border-b border-border/40 pb-3">
        <span className="font-medium text-foreground">
          {details.stageName ?? "No stage"}
        </span>
        <span>·</span>
        <span>
          {details.scheduleStart
            ? formatCardDateTime(details.scheduleStart)
            : "Unscheduled"}
        </span>
        <span>·</span>
        <Badge variant="outline" className="text-[10px] uppercase">
          {programme.programmeType}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-background shadow-none border">
          <CardContent className="p-2 sm:p-3 flex flex-col justify-center items-center text-center">
            <span className="text-lg font-bold text-foreground">
              {details.assignedCount}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
              Assigned
            </span>
          </CardContent>
        </Card>
        <Card className="bg-background shadow-none border">
          <CardContent className="p-2 sm:p-3 flex flex-col justify-center items-center text-center">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-500">
              {details.reportedCount}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
              Reported
            </span>
          </CardContent>
        </Card>
        <Card className="bg-background shadow-none border">
          <CardContent className="p-2 sm:p-3 flex flex-col justify-center items-center text-center">
            <span className="text-lg font-bold text-rose-600 dark:text-rose-500">
              {details.absentCount}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
              Absent
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground flex justify-between items-center">
          <span>Participant Roster</span>
          <span className="font-normal lowercase text-[10px]">
            {details.reportedEntries.length} items
          </span>
        </Label>
        <ReportingRosterList programme={programme} details={details} />
      </div>
    </div>
  );
}
