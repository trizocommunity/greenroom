"use client";

import { Clock } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/core/utils/cn";

export interface TimePickerProps {
  id?: string;
  value?: string | Date | null; // Supports "HH:mm" string or Date
  onChange?: (value: string) => void; // Emits "HH:mm" string
  onChangeDate?: (date: Date | null) => void; // Emits Date object
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minuteStep?: number; // Minute increments (e.g. 1, 5, 15)
}

function formatTo12Hour(h: number, m: number) {
  const isPM = h >= 12;
  const h12 = h % 12 || 12;
  const hStr = h12.toString().padStart(2, "0");
  const mStr = m.toString().padStart(2, "0");
  const ampm = isPM ? "PM" : "AM";
  return `${hStr}:${mStr} ${ampm}`;
}

export function TimePicker({
  id,
  value,
  onChange,
  onChangeDate,
  placeholder = "Select time",
  disabled,
  className,
  minuteStep = 5,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsedTime = React.useMemo(() => {
    if (!value) return { hour: undefined, minute: undefined, display: "" };
    if (typeof value === "string") {
      const [hStr, mStr] = value.split(":");
      const h = parseInt(hStr || "", 10);
      const m = parseInt(mStr || "", 10);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        return {
          hour: h,
          minute: m,
          display: formatTo12Hour(h, m),
        };
      }
      return { hour: undefined, minute: undefined, display: value };
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const h = value.getHours();
      const m = value.getMinutes();
      return {
        hour: h,
        minute: m,
        display: formatTo12Hour(h, m),
      };
    }
    return { hour: undefined, minute: undefined, display: "" };
  }, [value]);

  const [selectedHour, setSelectedHour] = React.useState<number | undefined>(
    parsedTime.hour,
  );
  const [selectedMinute, setSelectedMinute] = React.useState<
    number | undefined
  >(parsedTime.minute);

  const [selectedAmPm, setSelectedAmPm] = React.useState<"AM" | "PM">(
    parsedTime.hour !== undefined ? (parsedTime.hour >= 12 ? "PM" : "AM") : "AM"
  );

  const hourListRef = React.useRef<HTMLDivElement>(null);
  const minuteListRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setSelectedHour(parsedTime.hour);
    setSelectedMinute(parsedTime.minute);
    if (parsedTime.hour !== undefined) {
      setSelectedAmPm(parsedTime.hour >= 12 ? "PM" : "AM");
    }
  }, [parsedTime.hour, parsedTime.minute]);

  const currentH12 = selectedHour !== undefined ? (selectedHour % 12 || 12) : undefined;

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (hourListRef.current && currentH12 !== undefined) {
          const el = hourListRef.current.querySelector(
            `[data-hour="${currentH12}"]`,
          );
          el?.scrollIntoView({ block: "center", behavior: "instant" });
        }
        if (minuteListRef.current && selectedMinute !== undefined) {
          const el = minuteListRef.current.querySelector(
            `[data-minute="${selectedMinute}"]`,
          );
          el?.scrollIntoView({ block: "center", behavior: "instant" });
        }
      }, 10);
    }
  }, [open, currentH12, selectedMinute]);

  const hours12 = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  const minutes = React.useMemo(() => {
    const list: number[] = [];
    const step = Math.max(1, minuteStep);
    for (let i = 0; i < 60; i += step) {
      list.push(i);
    }
    if (selectedMinute !== undefined && !list.includes(selectedMinute)) {
      list.push(selectedMinute);
      list.sort((a, b) => a - b);
    }
    return list;
  }, [minuteStep, selectedMinute]);

  const handleCommit = (h: number, m: number) => {
    const hStr = h.toString().padStart(2, "0");
    const mStr = m.toString().padStart(2, "0");
    const timeStr = `${hStr}:${mStr}`;
    onChange?.(timeStr);
    if (onChangeDate) {
      const d = value instanceof Date ? new Date(value) : new Date();
      d.setHours(h, m, 0, 0);
      onChangeDate(d);
    }
  };

  const handleHourClick = (h12: number) => {
    let h24 = h12;
    if (selectedAmPm === "PM" && h12 !== 12) h24 += 12;
    if (selectedAmPm === "AM" && h12 === 12) h24 = 0;
    
    setSelectedHour(h24);
    const m = selectedMinute ?? 0;
    setSelectedMinute(m);
    handleCommit(h24, m);
  };

  const handleMinuteClick = (m: number) => {
    setSelectedMinute(m);
    const h = selectedHour ?? 0;
    setSelectedHour(h);
    handleCommit(h, m);
  };

  const handleAmPmClick = (ampm: "AM" | "PM") => {
    setSelectedAmPm(ampm);
    let h24 = selectedHour ?? 0;
    const h12 = h24 % 12 || 12;
    
    if (ampm === "PM" && h12 !== 12) h24 = h12 + 12;
    if (ampm === "AM" && h12 === 12) h24 = 0;
    if (ampm === "AM" && h12 !== 12) h24 = h12;

    setSelectedHour(h24);
    const m = selectedMinute ?? 0;
    setSelectedMinute(m);
    handleCommit(h24, m);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !parsedTime.display && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="mr-2 h-4 w-4 shrink-0" />
          <span>{parsedTime.display || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground">
            <span className="w-16 text-center">Hours</span>
            <span className="w-16 text-center">Minutes</span>
            <span className="w-16 text-center">AM/PM</span>
          </div>
          <div className="flex gap-2">
            <div
              ref={hourListRef}
              className="h-48 w-16 overflow-y-auto rounded-md border border-input p-1 space-y-1 overscroll-contain"
            >
              {hours12.map((h) => {
                const isSelected = currentH12 === h;
                return (
                  <button
                    key={h}
                    type="button"
                    data-hour={h}
                    onClick={() => handleHourClick(h)}
                    className={cn(
                      "flex h-7 w-full items-center justify-center rounded text-xs font-mono transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-accent hover:text-accent-foreground text-foreground",
                    )}
                  >
                    {h.toString().padStart(2, "0")}
                  </button>
                );
              })}
            </div>
            <div
              ref={minuteListRef}
              className="h-48 w-16 overflow-y-auto rounded-md border border-input p-1 space-y-1 overscroll-contain"
            >
              {minutes.map((m) => {
                const isSelected = selectedMinute === m;
                return (
                  <button
                    key={m}
                    type="button"
                    data-minute={m}
                    onClick={() => handleMinuteClick(m)}
                    className={cn(
                      "flex h-7 w-full items-center justify-center rounded text-xs font-mono transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-accent hover:text-accent-foreground text-foreground",
                    )}
                  >
                    {m.toString().padStart(2, "0")}
                  </button>
                );
              })}
            </div>
            <div className="h-48 w-16 rounded-md border border-input p-1 space-y-1">
              {(["AM", "PM"] as const).map((ampm) => {
                const isSelected = selectedAmPm === ampm;
                return (
                  <button
                    key={ampm}
                    type="button"
                    onClick={() => handleAmPmClick(ampm)}
                    className={cn(
                      "flex h-7 w-full items-center justify-center rounded text-xs font-semibold transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground text-foreground",
                    )}
                  >
                    {ampm}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
