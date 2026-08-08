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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  groupedTimezones,
  labelForTimezone,
  TZ_OPTIONS,
} from "@/core/datetime";
import { cn } from "@/core/utils/cn";

interface TimezoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

function LiveTime({ timezone }: { timezone?: string }) {
  const [time, setTime] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) return <span className="w-10" />; // placeholder width

  return (
    <span className="text-[10px] sm:text-xs text-muted-foreground opacity-70 tabular-nums font-medium mr-1 tracking-tight">
      {time.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timezone || undefined,
      })}
    </span>
  );
}

/**
 * Curated IANA timezone combobox.
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
}: TimezoneSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = value ? labelForTimezone(value) : "Local Time (Browser Default)";
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
              <span className="truncate">{selectedLabel}</span>
            </span>
            <div className="flex items-center shrink-0">
              <LiveTime timezone={value} />
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </div>
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
              
              <CommandGroup heading="System" className="font-medium">
                <CommandItem
                  value="local"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      !value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">Local Time (Browser Default)</span>
                </CommandItem>
              </CommandGroup>

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
    </div>
  );
}

export function listTimezoneValues(): string[] {
  return TZ_OPTIONS.map((opt) => opt.value);
}
