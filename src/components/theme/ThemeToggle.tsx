"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/core/utils/cn";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ActiveIcon =
    !mounted || theme === "system"
      ? Laptop
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Toggle theme"
        >
          {mounted ? (
            <ActiveIcon className="h-[1.1rem] w-[1.1rem]" />
          ) : (
            <Sun className="h-[1.1rem] w-[1.1rem]" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              mounted && theme === value && "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1 text-left">{label}</span>
            {mounted && theme === value && <Check className="h-4 w-4" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
