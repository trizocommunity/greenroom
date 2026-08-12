"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TeamCountModal({
  open,
  onOpenChange,
  onConfirm,
  onBack,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (count: number) => void;
  onBack: () => void;
}) {
  const [count, setCount] = useState(8);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-serif text-xl">
            Team Points Poster
          </DrawerTitle>
        </DrawerHeader>
        <p className="text-sm text-muted-foreground">
          How many teams should appear on the poster? A row with team name and
          points will be created for each team.
        </p>
        <div className="space-y-2">
          <Label htmlFor="team-count" className="text-xs font-bold uppercase">
            Number of teams
          </Label>
          <Input
            id="team-count"
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onBack}>
            ‹ Back
          </Button>
          <Button
            onClick={() => {
              onConfirm(Math.min(20, Math.max(1, count)));
              onOpenChange(false);
            }}
          >
            + Create
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
