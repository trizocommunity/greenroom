"use client";

import {
  Calendar,
  Search,
  Settings2,
  TableProperties,
  Trash2,
  X,
} from "lucide-react";
import type { CalendarGroupBy } from "@/components/festival/pre-event-works/schedule/ScheduleCalendarView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/core/utils/cn";

export type ScheduleViewMode = "calendar" | "table";

export type ScheduleControlsProps = {
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  groupBy: CalendarGroupBy;
  onGroupByChange: (groupBy: CalendarGroupBy) => void;
  timelineStart: string;
  timelineEnd: string;
  onTimelineStartChange: (value: string) => void;
  onTimelineEndChange: (value: string) => void;
  canClear: boolean;
  isReadOnly: boolean;
  isStageManager: boolean;
  onClearClick: () => void;
};

export function ScheduleControls({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
  groupBy,
  onGroupByChange,
  timelineStart,
  timelineEnd,
  onTimelineStartChange,
  onTimelineEndChange,
  canClear,
  isReadOnly,
  isStageManager,
  onClearClick,
}: ScheduleControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
      <div className="relative w-full md:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search competitions, categories, stages..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-9 h-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onSearchQueryChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <hr className="border-border mt-5 " />

      <div className="flex flex-wrap sm:flex-row items-center gap-2 md:gap-5 lg:gap-10 justify-between">
        {!isStageManager ? (
          <Tabs
            value={viewMode}
            onValueChange={(v) => onViewModeChange(v as ScheduleViewMode)}
          >
            <TabsList className="h-9 ">
              <TabsTrigger value="table" className="gap-1.5 text-xs">
                <TableProperties className="h-3.5 w-3.5" />
                Table
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2 shrink-0">
          {viewMode === "calendar" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Settings2 className="h-3.5 w-3.5" />
                  Layout
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Timeline Layout</p>
                    <p className="text-xs text-muted-foreground">
                      Customize your schedule display.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Group rows by
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onGroupByChange("date")}
                        className={cn(
                          "rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                          groupBy === "date"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted",
                        )}
                      >
                        Date
                        <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                          Stages as rows
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onGroupByChange("stage")}
                        className={cn(
                          "rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                          groupBy === "stage"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted",
                        )}
                      >
                        Stage
                        <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                          Dates as rows
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Start Time
                      </Label>
                      <Input
                        type="time"
                        value={timelineStart}
                        onChange={(e) => onTimelineStartChange(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        End Time
                      </Label>
                      <Input
                        type="time"
                        value={timelineEnd}
                        onChange={(e) => onTimelineEndChange(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {canClear && !isReadOnly && !isStageManager && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={onClearClick}
              disabled={isReadOnly}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
