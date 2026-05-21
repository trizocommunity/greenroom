"use client";

import type { ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { editorBtnIcon } from "./editor-chrome";

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded bg-neutral-700 px-1.5 py-0.5 font-sans text-[10px] text-neutral-100">
      {children}
    </kbd>
  );
}

export function EditorPresentButton({
  onPresent,
  disabled,
}: {
  onPresent: () => void;
  disabled?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`${editorBtnIcon} pointer-events-auto h-8 w-8 rounded-lg border-border bg-card shadow-md`}
            disabled={disabled}
            aria-label="Present full screen"
            onClick={onPresent}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="border-0 bg-neutral-900 px-3 py-2 text-white"
        >
          <p className="text-xs font-medium">Present full screen</p>
          <div className="mt-1.5 flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>Alt</Kbd>
            <Kbd>P</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
