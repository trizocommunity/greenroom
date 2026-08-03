"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const ActiveIcon =
    !mounted || theme === "system"
      ? Laptop
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      title={mounted ? `Theme: ${theme}` : "Toggle theme"}
    >
      {mounted ? (
        <ActiveIcon className="h-[1.1rem] w-[1.1rem]" />
      ) : (
        <Sun className="h-[1.1rem] w-[1.1rem]" />
      )}
    </Button>
  );
}
