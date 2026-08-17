"use client";

import { Play, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { Judge, Programme, ReportingDetails } from "./types";
import { ReportingRosterList } from "./ReportingRosterList";

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
  addJudge: () => void;
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
        <DrawerHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <DrawerTitle>
                {wizardKind === "rejudge" ? "Rejudge" : "Start Judgement"}
              </DrawerTitle>
              <DrawerDescription>
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

        <div className="flex-1 overflow-y-auto pb-6">
          <div className="space-y-3 pt-1 sm:space-y-4 sm:pt-2">
            <JudgesSection
              judges={judges}
              selectedJudgeIds={selectedJudgeIds}
              toggleJudge={toggleJudge}
              newJudgeName={newJudgeName}
              setNewJudgeName={setNewJudgeName}
              isAddingJudge={isAddingJudge}
              addJudge={addJudge}
            />

            <JudgingModeSection
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
        <DrawerFooter>
          <Button
            className="h-9 w-full text-xs sm:text-sm"
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

function JudgesSection({
  judges,
  selectedJudgeIds,
  toggleJudge,
  newJudgeName,
  setNewJudgeName,
  isAddingJudge,
  addJudge,
}: {
  judges: Judge[];
  selectedJudgeIds: string[];
  toggleJudge: (id: string) => void;
  newJudgeName: string;
  setNewJudgeName: (v: string) => void;
  isAddingJudge: boolean;
  addJudge: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        Judges ({selectedJudgeIds.length} selected)
      </Label>
      <div className="grid max-h-[170px] gap-1.5 overflow-y-auto rounded-md border p-1.5 sm:max-h-[210px]">
        {judges.map((j) => {
          const selected = selectedJudgeIds.includes(j.id);
          return (
            <label
              key={j.id}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors sm:text-sm ${
                selected ? "border-purple/60 bg-purple/10" : "bg-background"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleJudge(j.id)}
              />
              <span className="font-medium">{j.name}</span>
            </label>
          );
        })}
        {judges.length === 0 ? (
          <p className="px-1 py-1 text-xs text-muted-foreground">
            No judges yet — add one below.
          </p>
        ) : null}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={newJudgeName}
          onChange={(e) => setNewJudgeName(e.target.value)}
          placeholder="New judge name"
          className="h-8 text-xs sm:h-9 sm:text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addJudge();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 text-xs sm:h-9"
          onClick={addJudge}
          disabled={isAddingJudge || !newJudgeName.trim()}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

function JudgingModeSection({
  judgingMode,
  setJudgingMode,
}: {
  judgingMode: "SINGLE" | "GROUP";
  setJudgingMode: (v: "SINGLE" | "GROUP") => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-2.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        Judging mode
      </Label>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${judgingMode === "SINGLE" ? "border-purple/60 bg-purple/10" : "bg-background hover:bg-muted/40"}`}
          onClick={() => setJudgingMode("SINGLE")}
        >
          <p className="font-medium">Single</p>
          <p className="text-xs text-muted-foreground">
            Each judge scores independently.
          </p>
        </button>
        <button
          type="button"
          className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${judgingMode === "GROUP" ? "border-purple/60 bg-purple/10" : "bg-background hover:bg-muted/40"}`}
          onClick={() => setJudgingMode("GROUP")}
        >
          <p className="font-medium">Group</p>
          <p className="text-xs text-muted-foreground">
            Shared screen, all judges at once.
          </p>
        </button>
      </div>
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
    <div className="space-y-4 pt-2">
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground border-b border-border/40 pb-3">
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
