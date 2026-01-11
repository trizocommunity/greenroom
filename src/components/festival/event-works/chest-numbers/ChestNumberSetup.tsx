"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Settings2, Pencil } from "lucide-react";
import {
  generateChestNumbers,
  saveChestNumberSettings,
  updateAllChestNumbers,
  resetChestNumbers,
} from "@/server/actions/chest-number.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChestNumberSetupProps {
  festivalId: string;
  categories: any[];
  initialSettings: {
    prefix: string;
    nextSequence?: number;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
  } | null;
  onGenerated: () => void;
  compact?: boolean;
  pendingCount?: number;
}

export function ChestNumberSetup({
  festivalId,
  categories,
  initialSettings,
  onGenerated,
  compact = false,
  pendingCount = 0,
}: ChestNumberSetupProps) {
  const [prefix, setPrefix] = useState(initialSettings?.prefix || "");
  const [categoryStarts, setCategoryStarts] = useState<Record<string, string>>(
    () => {
      const starts: Record<string, string> = {};
      categories.forEach((c: any) => {
        starts[c.id] = initialSettings?.categories?.[c.id]?.toString() || "1";
      });
      return starts;
    },
  );

  const [categoryCodes, setCategoryCodes] = useState<Record<string, string>>(
    () => {
      const codes: Record<string, string> = {};
      categories.forEach((c: any) => {
        codes[c.id] =
          initialSettings?.categoryCodes?.[c.id] ||
          c.name.charAt(0).toUpperCase();
      });
      return codes;
    },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Edit Prefix State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editPrefix, setEditPrefix] = useState(initialSettings?.prefix || "");
  const [isUpdatingPrefix, setIsUpdatingPrefix] = useState(false);

  const handleStartChange = (catId: string, val: string) => {
    setCategoryStarts((prev) => ({ ...prev, [catId]: val }));
  };

  const handleCodeChange = (catId: string, val: string) => {
    setCategoryCodes((prev) => ({ ...prev, [catId]: val.toUpperCase() }));
  };

  const getPreview = (currentPrefix: string) => {
    if (!categories.length) return "No Categories";
    const demoCat = categories[0];
    const code =
      categoryCodes[demoCat.id] || demoCat.name.charAt(0).toUpperCase();
    const start = parseInt(categoryStarts[demoCat.id] || "1");
    const formattedStart = String(start).padStart(2, "0");

    const safePrefix = currentPrefix.endsWith("-")
      ? currentPrefix
      : `${currentPrefix}-`;

    if (!currentPrefix && !currentPrefix.length) {
      return `<PREFIX>-${code}${formattedStart}`;
    }

    return `${safePrefix}${code}${formattedStart}`;
  };

  const handleSaveAndGenerate = async () => {
    if (!prefix) {
      toast.error("Prefix is required");
      return;
    }

    const categoryConfig: Record<string, number> = {};
    const codeConfig: Record<string, string> = {};

    for (const cat of categories) {
      const val = parseInt(categoryStarts[cat.id]);
      if (Number.isNaN(val)) {
        toast.error(`Invalid start number for ${cat.name}`);
        return;
      }
      categoryConfig[cat.id] = val;

      const code = categoryCodes[cat.id];
      if (!code) {
        toast.error(`Code is required for ${cat.name}`);
        return;
      }
      codeConfig[cat.id] = code;
    }

    try {
      setIsSaving(true);
      await saveChestNumberSettings(festivalId, {
        prefix,
        categories: categoryConfig,
        categoryCodes: codeConfig,
      });

      setIsSaving(false);
      setIsGenerating(true);
      const result = await generateChestNumbers(festivalId);

      toast.success(result.message);
      onGenerated();
    } catch (error: any) {
      toast.error(error.message || "Failed to process");
    } finally {
      setIsSaving(false);
      setIsGenerating(false);
    }
  };

  const handleUpdatePrefix = async () => {
    if (!editPrefix) return toast.error("Prefix is required");
    try {
      setIsUpdatingPrefix(true);
      await updateAllChestNumbers(festivalId, editPrefix);
      toast.success("Prefix updated and chest numbers regenerated.");
      setIsEditOpen(false);
      setPrefix(editPrefix);
      onGenerated();
    } catch (error: any) {
      toast.error(error.message || "Failed to update prefix");
    } finally {
      setIsUpdatingPrefix(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetChestNumbers(festivalId);
      toast.success("Chest numbers cleared and sequences reset.");
      onGenerated();
    } catch (error: any) {
      toast.error("Failed to reset chest numbers");
    } finally {
      setIsResetting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                Chest Number Configuration
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Prefix: <span className="font-mono font-medium">{prefix}</span>
                <span className="text-muted-foreground/50">|</span>
                Example:{" "}
                <span className="font-mono text-xs">{getPreview(prefix)}</span>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="p-1 hover:bg-muted rounded-full"
                  title="Edit Prefix"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {isResetting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Reset All"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all chest numbers?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove chest numbers from ALL students and reset
                    the generation logic. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Reset All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              onClick={handleSaveAndGenerate}
              disabled={isGenerating || pendingCount === 0}
              variant={pendingCount === 0 ? "outline" : "default"}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {pendingCount > 0
                ? `Generate for ${pendingCount} New Students`
                : "No New Students"}
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground ml-12">
          Configured for {categories.length} categories.
        </div>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Prefix</DialogTitle>
              <DialogDescription>
                Changing the prefix will update ALL existing chest numbers to
                match the new prefix.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>New Prefix</Label>
                <Input
                  value={editPrefix}
                  onChange={(e) => setEditPrefix(e.target.value.toUpperCase())}
                  placeholder="Enter new prefix"
                />
              </div>
              <div className="p-3 bg-muted rounded-md text-sm flex items-center gap-2">
                <span className="text-muted-foreground">Preview:</span>
                <span className="font-mono font-medium">
                  {getPreview(editPrefix)}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePrefix} disabled={isUpdatingPrefix}>
                {isUpdatingPrefix && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Chest Number Setup</CardTitle>
        <CardDescription>
          Define the logic for generating chest numbers. Enter a global prefix
          and starting numbers for each category.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Prefix (e.g. FEST)</Label>
            <div className="text-xs text-muted-foreground font-mono">
              Preview: {getPreview(prefix)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            The system will automatically append a hyphen if missing (e.g.
            FEST-).
          </div>
          <Input
            placeholder="Enter prefix"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
          />
        </div>

        <div className="space-y-3">
          <Label>Category Sequences</Label>
          <div className="border rounded-md divide-y">
            {categories.map((cat: any) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 text-sm"
              >
                <span className="font-medium">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      Code:
                    </span>
                    <Input
                      className="w-16 h-8 font-mono uppercase"
                      value={categoryCodes[cat.id]}
                      onChange={(e) => handleCodeChange(cat.id, e.target.value)}
                      placeholder={cat.name.charAt(0)}
                      maxLength={3}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      Start:
                    </span>
                    <Input
                      className="w-20 h-8"
                      type="number"
                      value={categoryStarts[cat.id]}
                      onChange={(e) =>
                        handleStartChange(cat.id, e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-xs">
                No 'Single' type categories found.
              </div>
            )}
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleSaveAndGenerate}
          disabled={isSaving || isGenerating || pendingCount === 0}
        >
          {(isSaving || isGenerating) && (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          )}
          {pendingCount > 0
            ? `Continue & Generate (${pendingCount} students)`
            : "No students to generate"}
        </Button>
      </CardContent>
    </Card>
  );
}
