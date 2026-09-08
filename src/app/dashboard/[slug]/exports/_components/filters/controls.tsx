"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/core/utils/cn";

export function SegmentedControl<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label?: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </Label>
          {hint && (
            <span className="text-[10px] text-muted-foreground/80">{hint}</span>
          )}
        </div>
      )}
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
              value === opt.value
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Small section eyebrow — visually separates filter groups without boxes. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 first:pt-0">
      {children}
    </p>
  );
}

/**
 * Visual grid picker. Each option shows a tiny swatch of the actual layout
 * (e.g. "2x4" draws 2 columns × 4 rows of cells). Selected option is
 * highlighted; AUTO is shown as a sparkle-style fallback swatch.
 */
export function GridPicker({
  value,
  orientation = "PORTRAIT",
  onChange,
}: {
  value: string;
  orientation?: "PORTRAIT" | "LANDSCAPE";
  onChange: (v: string) => void;
}) {
  const options =
    orientation === "LANDSCAPE"
      ? LANDSCAPE_GRID_OPTIONS
      : PORTRAIT_GRID_OPTIONS;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={
              opt.value === "AUTO"
                ? "Auto (orientation-driven)"
                : `${opt.cols} cols × ${opt.rows} rows (${opt.cols * opt.rows} per page)`
            }
            className={cn(
              "flex flex-col aspect-square items-center justify-between p-1 rounded-md border transition-all overflow-hidden",
              selected
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "bg-background hover:border-primary/40 hover:shadow-sm",
            )}
          >
            <div className="flex flex-1 w-full items-center justify-center overflow-hidden">
              {opt.value === "AUTO" ? (
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-tight",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  Auto
                </span>
              ) : (
                <GridSwatch cols={opt.cols} rows={opt.rows} active={selected} />
              )}
            </div>
            <span
              className={cn(
                "text-[9px] tabular-nums font-medium",
                selected ? "text-primary" : "text-muted-foreground",
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function GridSwatch({
  cols,
  rows,
  active,
}: {
  cols: number;
  rows: number;
  active: boolean;
}) {
  return (
    <div
      className="flex h-full w-full flex-col gap-[1.5px] p-1 justify-center"
      style={{ aspectRatio: `${Math.max(1, cols)} / ${Math.max(1, rows)}` }}
    >
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex flex-1 gap-[1.5px]">
          {Array.from({ length: cols }).map((__, c) => (
            <span
              key={c}
              className={cn(
                "flex-1 rounded-[1px] border min-w-0 min-h-0",
                active
                  ? "border-primary/40 bg-primary/30"
                  : "border-muted-foreground/30 bg-muted-foreground/15",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
        <div>
          <span className="text-sm font-medium">{label}</span>
          {hint && (
            <p className="text-[10px] text-muted-foreground/80">{hint}</p>
          )}
        </div>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

export function CheckList({
  label,
  hint,
  options,
  selected,
  onToggle,
  emptyLabel = "No options found.",
}: {
  label: string;
  hint?: string;
  options: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string, value: boolean) => void;
  emptyLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedCount = selected.length;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {hint && <p className="text-[10px] text-muted-foreground/80">{hint}</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCount > 0
              ? `${selectedCount} selected`
              : `Select ${label.toLowerCase()}...`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.includes(option.id);
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.name}
                      onSelect={() => {
                        onToggle(option.id, !isSelected);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {option.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

import { Eye, X } from "lucide-react";
import { PosterExportCanvas } from "@/components/festival/posters/PosterExportCanvas";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExportTemplateOption } from "@/features/exports/actions/export-template.actions";

export function TemplatePicker({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: ExportTemplateOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const previewOpt = options.find((o) => o.id === previewId);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
          No published templates found. Create and publish one in the poster
          editor first.
        </p>
      ) : (
        <div className="space-y-1.5 rounded-md border bg-muted/20 p-2 max-h-44 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.id}
              className={cn(
                "flex w-full items-center justify-between rounded-md border text-sm transition-all overflow-hidden",
                selectedId === opt.id
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "bg-background hover:border-primary/40 hover:shadow-sm",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(opt.id)}
                className="flex-1 px-3 py-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{opt.name}</span>
                  {selectedId === opt.id && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground/80 mt-0.5 tabular-nums">
                  {opt.width} × {opt.height}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPreviewId(opt.id)}
                className="p-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 border-l transition-colors"
                title="Preview template"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Preview Dialog */}
      <Dialog
        open={!!previewId}
        onOpenChange={(open) => !open && setPreviewId(null)}
      >
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <div className="p-4 border-b">
            <DialogTitle>Template Preview</DialogTitle>
          </div>
          <div className="p-6 bg-muted/10 flex items-center justify-center min-h-[300px]">
            {previewOpt && (
              <div className="rounded-md overflow-hidden border shadow-sm bg-background">
                <PosterExportCanvas
                  doc={previewOpt.doc}
                  bindings={{}}
                  inline
                  scale={Math.min(
                    1,
                    480 / previewOpt.width,
                    500 / previewOpt.height,
                  )}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const QUALITY_OPTIONS = [
  { value: "SCREEN" as const, label: "Screen" },
  { value: "STANDARD" as const, label: "Standard" },
  { value: "PRINT" as const, label: "Print" },
];

export const PRINT_LAYOUT_OPTIONS = [
  { value: "ONE_PER_PAGE" as const, label: "Single" },
  { value: "MULTIPLE_PER_PAGE" as const, label: "Multi" },
];

export const PAGE_SIZE_OPTIONS = [
  { value: "A3" as const, label: "A3" },
  { value: "A4" as const, label: "A4" },
  { value: "A5" as const, label: "A5" },
  { value: "LETTER" as const, label: "Letter" },
  { value: "LEGAL" as const, label: "Legal" },
  { value: "13X19" as const, label: "13×19" },
];

export const BADGE_PAGE_SIZE_OPTIONS = [
  { value: "A3" as const, label: "A3" },
  { value: "A4" as const, label: "A4" },
  { value: "13X19" as const, label: "13×19" },
];

export const CERTIFICATE_PAGE_SIZE_OPTIONS = [
  { value: "A3" as const, label: "A3" },
  { value: "A4" as const, label: "A4" },
];

export const FIT_OPTIONS = [
  { value: "FIT" as const, label: "Margin" },
  { value: "FILL" as const, label: "Full" },
];

/**
 * Multi-per-page grid presets filtered by page orientation.
 * Portrait page -> grids optimized for tall aspect ratios (cols <= rows).
 * Landscape page -> grids optimized for wide aspect ratios (cols >= rows).
 */
export const PORTRAIT_GRID_OPTIONS = [
  { value: "AUTO", cols: 0, rows: 0, label: "Auto" },
  { value: "1x2", cols: 1, rows: 2, label: "1×2" },
  { value: "2x2", cols: 2, rows: 2, label: "2×2" },
  { value: "2x3", cols: 2, rows: 3, label: "2×3" },
  { value: "2x4", cols: 2, rows: 4, label: "2×4" },
  { value: "2x5", cols: 2, rows: 5, label: "2×5" },
  { value: "3x3", cols: 3, rows: 3, label: "3×3" },
  { value: "3x4", cols: 3, rows: 4, label: "3×4" },
  { value: "3x5", cols: 3, rows: 5, label: "3×5" },
] as const;

export const LANDSCAPE_GRID_OPTIONS = [
  { value: "AUTO", cols: 0, rows: 0, label: "Auto" },
  { value: "2x1", cols: 2, rows: 1, label: "2×1" },
  { value: "2x2", cols: 2, rows: 2, label: "2×2" },
  { value: "3x2", cols: 3, rows: 2, label: "3×2" },
  { value: "4x2", cols: 4, rows: 2, label: "4×2" },
  { value: "5x2", cols: 5, rows: 2, label: "5×2" },
  { value: "3x3", cols: 3, rows: 3, label: "3×3" },
  { value: "4x3", cols: 4, rows: 3, label: "4×3" },
  { value: "5x3", cols: 5, rows: 3, label: "5×3" },
] as const;

export const MULTI_GRID_OPTIONS = [
  ...PORTRAIT_GRID_OPTIONS,
  ...LANDSCAPE_GRID_OPTIONS.filter(
    (l) => !PORTRAIT_GRID_OPTIONS.some((p) => p.value === l.value),
  ),
] as const;

export const PAGE_ORIENTATION_OPTIONS = [
  { value: "PORTRAIT" as const, label: "Portrait" },
  { value: "LANDSCAPE" as const, label: "Landscape" },
];

export const GENDER_OPTIONS = [
  { value: "ALL" as const, label: "All" },
  { value: "MALE" as const, label: "Male" },
  { value: "FEMALE" as const, label: "Female" },
];

export const PAGE_LAYOUT_OPTIONS = [
  { value: "SINGLE_PER_PAGE" as const, label: "Single per page" },
  { value: "CONTINUOUS_GRID" as const, label: "Continuous" },
];

export const TIME_DISPLAY_OPTIONS = [
  { value: "START_AND_END" as const, label: "Start & End Time" },
  { value: "START_ONLY" as const, label: "Start Time Only" },
];

export function toggleId(list: string[], id: string, value: boolean): string[] {
  return value ? [...list, id] : list.filter((x) => x !== id);
}

/** Light wrapper that lays out child controls in N equal columns. */
export function FieldGrid({
  cols,
  children,
}: {
  cols: 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        cols === 3 ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"
      }
    >
      {children}
    </div>
  );
}

export function NumberInput({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-stretch overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/40">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="w-full bg-transparent px-3 py-1.5 text-sm tabular-nums outline-none"
        />
        {unit && (
          <span className="flex items-center bg-muted/40 px-2 text-[10px] font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}
