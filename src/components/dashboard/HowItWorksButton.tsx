"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
      <Drawer>
        <Tooltip>
          <TooltipTrigger asChild>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="How it works"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>How it Works</p>
          </TooltipContent>
        </Tooltip>
        <DrawerContent className="text-left">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && (
              <DrawerDescription className="text-left">
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="space-y-4 pb-8 pt-4 text-left overflow-y-auto max-h-[60vh]">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    </TooltipProvider>
  );
}
