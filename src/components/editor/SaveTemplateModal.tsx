"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SaveTemplateModal({
  open,
  onOpenChange,
  defaultName,
  templateLabel,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  templateLabel: string;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-serif text-xl">
            Save template
          </DrawerTitle>
        </DrawerHeader>
        <p className="text-sm text-muted-foreground">
          Save this {templateLabel} design to your template library. You can
          reload it from the Templates tab.
        </p>
        <div className="space-y-2">
          <Label
            htmlFor="template-name"
            className="text-xs font-bold uppercase"
          >
            Template name
          </Label>
          <Input
            id="template-name"
            placeholder="e.g. Kalolsavam 2025 Poster"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onSave(name.trim());
                onOpenChange(false);
              }
            }}
          />
        </div>
        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onSave(name.trim());
              onOpenChange(false);
            }}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
