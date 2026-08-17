"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Stage + category + type filters that don't fit in the top bar. Each control
 * owns its own onChange; the parent decides what to reset (pages) on each
 * update.
 */
export function FilterSheet({
  open,
  onOpenChange,
  stages,
  effectiveStageId,
  onStageChange,
  filterCategory,
  onCategoryChange,
  filterType,
  onTypeChange,
  availableCategories,
  hideStageFilter,
  onReset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stages: Array<{ id: string; name: string }>;
  effectiveStageId: string;
  onStageChange: (v: string) => void;
  filterCategory: string;
  onCategoryChange: (v: string) => void;
  filterType: string;
  onTypeChange: (v: string) => void;
  availableCategories: string[];
  hideStageFilter: boolean;
  onReset: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4">
        <SheetHeader className="text-left">
          <SheetTitle>Filter programmes</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto">
          {!hideStageFilter && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Stage</p>
              <Select
                value={effectiveStageId === "" ? "__all__" : effectiveStageId}
                onValueChange={(v) => onStageChange(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="font-normal" value="__all__">
                    All stages
                  </SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Category
            </p>
            <Select value={filterCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="NONE">Uncategorized</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Type</p>
            <Select value={filterType} onValueChange={onTypeChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="flex-row gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={onReset}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
          <Button
            type="button"
            className="flex-1 sm:flex-none"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
