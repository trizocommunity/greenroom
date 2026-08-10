"use client";

import { Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Shown below `lg` (1024px). Poster editor requires desktop canvas + keyboard.
 */
export function EditorMobileGate() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center lg:hidden"
      role="alert"
      aria-live="polite"
    >
      <div className="flex max-w-sm flex-col items-center gap-5">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Monitor className="h-8 w-8 text-primary" aria-hidden />
          <Smartphone
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-background bg-destructive p-0.5 text-destructive-foreground"
            aria-hidden
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Desktop only
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The poster template editor needs a larger screen, mouse, and
            keyboard. Open this page on a laptop or desktop (1024px width or
            wider).
          </p>
        </div>
        <Button asChild variant="default" size="sm" className="w-full max-w-xs">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
