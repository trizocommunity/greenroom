"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Settings2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CategoryItem = { id: string; name: string };

interface ChestNumberSetupProps {
  festivalId: string;
  categories: CategoryItem[];
  initialSettings: {
    prefix: string;
    nextSequence?: number;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
    numberingStyle?: "ALPHANUMERIC" | "NUMERIC";
  } | null;
  onGenerated: () => void;
  pendingCount?: number;
}

export function ChestNumberSetup({
  festivalId,
  categories,
  initialSettings,
  onGenerated,
  pendingCount = 0,
}: ChestNumberSetupProps) {
  const queryClient = useQueryClient();

  const invalidateStudentsAndNotify = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.students.list(festivalId) });
    onGenerated();
  };

  const [prefix, setPrefix] = useState(initialSettings?.prefix || "");
  const [categoryStarts, setCategoryStarts] = useState<Record<string, string>>(
    () => {
      const starts: Record<string, string> = {};
      categories.forEach((c: CategoryItem, index: number) => {
        // Default to 100, 200, 300... if not configured
        const defaultStart = ((index + 1) * 100).toString();
        starts[c.id] =
          initialSettings?.categories?.[c.id]?.toString() || defaultStart;
      });
      return starts;
    },
  );

  const [categoryCodes, setCategoryCodes] = useState<Record<string, string>>(
    () => {
      const codes: Record<string, string> = {};
      categories.forEach((c: CategoryItem) => {
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

  // State for Edit Mode (inside Modal)
  const [editCategoryCodes, setEditCategoryCodes] = useState<
    Record<string, string>
  >({});
  const [editCategoryStarts, setEditCategoryStarts] = useState<
    Record<string, string>
  >({});

  const [numberingStyle, setNumberingStyle] = useState<
    "ALPHANUMERIC" | "NUMERIC"
  >(initialSettings?.numberingStyle || "ALPHANUMERIC");

  // Determine if configured based on categories being present in settings, not just prefix
  const isConfigured =
    !!initialSettings &&
    Object.keys(initialSettings.categories || {}).length > 0;

  // Initialize edit state
  const handleOpenEdit = () => {
    setEditPrefix(prefix);
    // Detect style from current settings
    if (!prefix && Object.keys(categoryCodes).every((k) => !categoryCodes[k])) {
      setNumberingStyle("NUMERIC");
    } else {
      setNumberingStyle("ALPHANUMERIC");
    }
    setEditCategoryCodes({ ...categoryCodes });
    setEditCategoryStarts({ ...categoryStarts });
    setIsEditOpen(true);
  };

  // Helper to get preview for EDIT state
  const handleEditCodeChange = (catId: string, val: string) => {
    setEditCategoryCodes((prev) => ({ ...prev, [catId]: val.toUpperCase() }));
  };

  const getEditPreview = (currentPrefix: string) => {
    if (!categories.length) return "No Categories";
    const demoCat = categories[0];
    const start = parseInt(editCategoryStarts[demoCat.id] || "1");
    const formattedStart = String(start).padStart(2, "0");

    if (numberingStyle === "NUMERIC") {
      return `${formattedStart}`;
    }

    const code =
      editCategoryCodes[demoCat.id] || demoCat.name.charAt(0).toUpperCase();

    const safePrefix =
      currentPrefix && currentPrefix.endsWith("-")
        ? currentPrefix
        : currentPrefix
          ? `${currentPrefix}-`
          : "";

    return `${safePrefix}${code}${formattedStart}`;
  };

  const handleSaveAndGenerate = async () => {
    const isNumeric = numberingStyle === "NUMERIC";

    if (!isNumeric) {
      if (!prefix || !prefix.trim()) {
        toast.error("Prefix is required for Alphanumeric style");
        return;
      }
    }

    const categoryConfig: Record<string, number> = {};
    const codeConfig: Record<string, string> = {};

    for (const cat of categories) {
      const startVal = categoryStarts[cat.id];
      const val = parseInt(startVal ?? "", 10);
      if (Number.isNaN(val)) {
        toast.error(`Invalid start number for ${cat.name}`);
        return;
      }
      categoryConfig[cat.id] = val;

      if (!isNumeric) {
        const code = categoryCodes[cat.id];
        if (!code || !code.trim()) {
          toast.error(`Code is required for ${cat.name} (Alphanumeric)`);
          return;
        }
        codeConfig[cat.id] = code;
      }
    }

    try {
      setIsSaving(true);
      await saveChestNumberSettings(festivalId, {
        prefix: isNumeric ? "" : (prefix ?? ""),
        categories: categoryConfig,
        categoryCodes: isNumeric ? {} : codeConfig,
        numberingStyle: numberingStyle,
      });

      setIsSaving(false);
      setIsGenerating(true);
      const result = await generateChestNumbers(festivalId);

      toast.success(result.message);
      invalidateStudentsAndNotify();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to process");
    } finally {
      setIsSaving(false);
      setIsGenerating(false);
    }
  };

  const handleUpdateConfiguration = async () => {
    if (numberingStyle === "ALPHANUMERIC" && !editPrefix) {
      return toast.error("Prefix is required for Alphanumeric style");
    }

    const categoryConfig: Record<string, number> = {};
    for (const cat of categories) {
      // Logic for Numeric: No codes needed
      if (numberingStyle === "ALPHANUMERIC" && !editCategoryCodes[cat.id]) {
        return toast.error(`Code is required for ${cat.name}`);
      }

      const val = parseInt(editCategoryStarts[cat.id]);
      if (Number.isNaN(val)) {
        return toast.error(`Invalid start number for ${cat.name}`);
      }
      categoryConfig[cat.id] = val;
    }

    try {
      setIsUpdatingPrefix(true);

      const codesToSave = numberingStyle === "NUMERIC" ? {} : editCategoryCodes;
      const prefixToSave = numberingStyle === "NUMERIC" ? "" : editPrefix;

      // Ensure empty codes for numeric
      if (numberingStyle === "NUMERIC") {
        // We might need to explicitly clear them in DB if switching modes
        // but updateAllChestNumbers takes codes.
        // Let's rely on init check.
      }

      if (!isConfigured) {
        await saveChestNumberSettings(festivalId, {
          prefix: prefixToSave,
          categories: categoryConfig,
          categoryCodes: codesToSave,
          numberingStyle: numberingStyle,
        });
        const result = await generateChestNumbers(festivalId);
        toast.success(result.message);
      } else {
        await updateAllChestNumbers(
          festivalId,
          prefixToSave,
          codesToSave,
          numberingStyle,
        );
        toast.success("Configuration updated and chest numbers regenerated.");
      }

      setIsEditOpen(false);

      setPrefix(prefixToSave);
      setCategoryCodes(codesToSave);
      setCategoryStarts(editCategoryStarts);

      invalidateStudentsAndNotify();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update configuration",
      );
    } finally {
      setIsUpdatingPrefix(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetChestNumbers(festivalId);
      toast.success("Chest numbers cleared and sequences reset.");

      // Reset local state to defaults
      setPrefix("");

      const defaultStarts: Record<string, string> = {};
      const defaultCodes: Record<string, string> = {};
      categories.forEach((c: CategoryItem, index: number) => {
        defaultStarts[c.id] = ((index + 1) * 100).toString();
        defaultCodes[c.id] = c.name.charAt(0).toUpperCase();
      });
      setCategoryStarts(defaultStarts);
      setCategoryCodes(defaultCodes);

      invalidateStudentsAndNotify();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reset chest numbers",
      );
    } finally {
      setIsResetting(false);
    }
  };

  // Remove Card logic, always return header view
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
              {isConfigured ? (
                <div className="text-xs text-muted-foreground">
                  Configured for {categories.length} categories.
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                    Not Configured
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isConfigured && (
            <Button size="sm" onClick={handleOpenEdit} className="gap-2">
              <Settings2 className="h-4 w-4" />
              Configure Now
            </Button>
          )}

          {isConfigured && (
            <>
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
                    <AlertDialogTitle>
                      Reset all chest numbers?
                    </AlertDialogTitle>
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

              {pendingCount > 0 && (
              <Button
                onClick={handleSaveAndGenerate}
                disabled={isGenerating || pendingCount === 0}
                variant={pendingCount === 0 ? "outline" : "default"}
                size="sm"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Generate ${pendingCount} New
              </Button>
              )}
            </>
          )}
        </div>
      </div>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chest Number Configuration</DialogTitle>
            <DialogDescription>
              Define the format for chest numbers. Choose style and set
              sequences.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-6">
            <Tabs
              value={numberingStyle}
              onValueChange={(v) =>
                setNumberingStyle(v as "ALPHANUMERIC" | "NUMERIC")
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ALPHANUMERIC">
                  Alphanumeric (e.g. FEST-A-01)
                </TabsTrigger>
                <TabsTrigger value="NUMERIC">
                  Numeric Only (e.g. 101)
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Prefix Section - Only for Alphanumeric */}
            {numberingStyle === "ALPHANUMERIC" && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Prefix (e.g. FEST)</Label>
                  <div className="text-xs text-muted-foreground font-mono">
                    Preview: {getEditPreview(editPrefix)}
                  </div>
                </div>
                <Input
                  value={editPrefix}
                  onChange={(e) => setEditPrefix(e.target.value.toUpperCase())}
                  placeholder="Enter prefix"
                />
              </div>
            )}
            {/* Preview for Numeric */}
            {numberingStyle === "NUMERIC" && (
              <div className="text-xs text-muted-foreground font-mono text-center p-2 bg-muted/50 rounded">
                Preview Format: {getEditPreview(editPrefix)}
              </div>
            )}

            {/* Categories Section */}
            <div className="space-y-3">
              <Label>Category Sequences</Label>
              <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                {categories.map((cat: CategoryItem) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 text-sm"
                  >
                    <span className="font-medium">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      {numberingStyle === "ALPHANUMERIC" && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-xs whitespace-nowrap">
                            Code:
                          </span>
                          <Input
                            className="w-16 h-8 font-mono uppercase"
                            value={editCategoryCodes[cat.id] ?? ""}
                            onChange={(e) =>
                              handleEditCodeChange(cat.id, e.target.value)
                            }
                            placeholder={cat.name.charAt(0)}
                            maxLength={3}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          Start:
                        </span>
                        <Input
                          className="w-20 h-8"
                          type="number"
                          value={editCategoryStarts[cat.id] ?? ""}
                          onChange={(e) =>
                            setEditCategoryStarts((prev) => ({
                              ...prev,
                              [cat.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateConfiguration}
              disabled={isUpdatingPrefix}
            >
              {isUpdatingPrefix && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isConfigured ? "Update All" : "Save & Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
