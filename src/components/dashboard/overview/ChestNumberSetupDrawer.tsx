"use client";

import { Hash } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ChestNumberSetupDrawerProps {
  festivalSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChestNumberSetupDrawer({
  festivalSlug,
  open,
  onOpenChange,
}: ChestNumberSetupDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Chest Number Setup
          </SheetTitle>
          <SheetDescription>
            Generate and assign chest numbers to all registered participants to
            identify them easily on event day.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6">
          <div className="bg-muted p-4 rounded-md">
            <h4 className="text-sm font-semibold mb-2">How it works</h4>
            <p className="text-sm text-muted-foreground">
              Chest numbers are typically auto-generated once all participants
              are registered. You can configure prefixes or grouping rules
              before generation.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link
                href={`/dashboard/${festivalSlug}/pre-event-works/participants`}
              >
                Go to Participants
              </Link>
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
