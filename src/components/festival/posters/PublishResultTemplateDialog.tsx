"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PublishResultTemplateDialog({
  open,
  onOpenChange,
  publishedCodes,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publishedCodes: string[];
  onConfirm: (templateCode: string) => void;
  loading?: boolean;
}) {
  const [code, setCode] = useState(publishedCodes[0] ?? "RESULT-A");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose result poster</DialogTitle>
          <DialogDescription>
            Select which published template to use as the default for this
            programme.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Template code</Label>
          <Select value={code} onValueChange={setCode}>
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {publishedCodes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={loading || !code} onClick={() => onConfirm(code)}>
            Publish results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
