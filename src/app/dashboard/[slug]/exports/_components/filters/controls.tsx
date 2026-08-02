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
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              value === opt.value
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:border-primary/40",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
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
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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

export function TemplatePicker({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: { id: string; name: string; width: number; height: number }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
          No published templates found. Create and publish one in the poster
          editor first.
        </p>
      ) : (
        <div className="space-y-1.5 rounded-md border p-2 max-h-44 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                selectedId === opt.id
                  ? "border-primary bg-primary/10"
                  : "hover:border-primary/40",
              )}
            >
              <span className="font-medium">{opt.name}</span>
              <span className="text-xs text-muted-foreground">
                {opt.width}×{opt.height}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const QUALITY_OPTIONS = [
  { value: "SCREEN" as const, label: "Screen" },
  { value: "STANDARD" as const, label: "Standard" },
  { value: "PRINT" as const, label: "Print" },
];

export const PRINT_LAYOUT_OPTIONS = [
  { value: "ONE_PER_PAGE" as const, label: "One per page" },
  { value: "MULTIPLE_PER_PAGE" as const, label: "Multiple per page" },
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

export function toggleId(list: string[], id: string, value: boolean): string[] {
  return value ? [...list, id] : list.filter((x) => x !== id);
}
