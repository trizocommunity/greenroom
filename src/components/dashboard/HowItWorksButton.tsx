"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HowItWorksButtonProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function HowItWorksButton({
  title,
  description,
  children,
}: HowItWorksButtonProps) {
  return (
    <TooltipProvider>
      <Dialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="How it works"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>How it Works</p>
          </TooltipContent>
        </Tooltip>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">{children}</div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
