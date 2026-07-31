"use client";

import { Check, ChevronsUpDown, Globe } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/core/utils/cn";
import {
  getBrowserTimezone,
  groupedTimezones,
  labelForTimezone,
  TZ_OPTIONS,
} from "@/core/datetime";

interface TimezoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  placeholder?: string;
  showAutoDetectedHint?: boolean;
}

/**
 * Curated IANA timezone combobox.
 *
 * - Pre-fills with `getBrowserTimezone()` on mount when `value` is empty.
 * - Shows "Auto-detected: <label>" hint when the selected value matches the
 *   browser-detected timezone.
 *
 * Used by:
 *   - Onboarding forms (Phase 5)
 *   - Profile settings page (Phase 6)
 */
export function TimezoneSelect({
  value,
  onChange,
  disabled,
  id,
  "aria-label": ariaLabel = "Timezone",
  placeholder = "Select timezone",
  showAutoDetectedHint = true,
}: TimezoneSelectProps) {
  const [open, setOpen] = React.useState(false);
  const detected = React.useMemo(() => getBrowserTimezone(), []);
  const initialised = React.useRef(false);

  React.useEffect(() => {
    if (!initialised.current && !value) {
      initialised.current = true;
      onChange(detected);
    }
  }, [value, detected, onChange]);

  const selectedLabel = value ? labelForTimezone(value) : "";
  const isDetected = value === detected;
  const groups = React.useMemo(() => groupedTimezones(), []);

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            disabled={disabled}
            className={cn(
              "w-full justify-between rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground h-10 sm:h-11 px-3 text-xs sm:text-sm font-normal",
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <Globe className="h-4 w-4 shrink-0 opacity-60" />
              <span className="truncate">{selectedLabel || placeholder}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search timezone or city…" />
            <CommandList className="max-h-72">
              <CommandEmpty>No timezone found.</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup
                  key={group.region}
                  heading={group.region}
                  className="font-medium"
                >
                  {group.options.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.value} ${opt.label} ${opt.offset}`}
                      onSelect={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === opt.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex-1 truncate">{opt.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {opt.offset}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {showAutoDetectedHint && isDetected && value !== "" && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Auto-detected: {selectedLabel}
        </p>
      )}
    </div>
  );
}

export function listTimezoneValues(): string[] {
  return TZ_OPTIONS.map((opt) => opt.value);
}
