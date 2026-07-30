"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { queryKeys } from "@/api/client/_query-keys";
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
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  generateChestNumbers,
  resetChestNumbers,
  saveChestNumberSettings,
  updateAllChestNumbers,
} from "@/features/participants/actions/chest-number.actions";

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
  const { isReadOnly } = useFestivalReadOnly();
  const queryClient = useQueryClient();

  const invalidateParticipantsAndNotify = () => {
    queryClient.invalidateQueries({
      queryKey: ["participants", festivalId],
    });
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
    if (isReadOnly) return;
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
    const start = parseInt(editCategoryStarts[demoCat.id] || "1", 10);
    const formattedStart = String(start).padStart(2, "0");

    if (numberingStyle === "NUMERIC") {
      return `${formattedStart}`;
    }

    const code =
      editCategoryCodes[demoCat.id] || demoCat.name.charAt(0).toUpperCase();

    const safePrefix = currentPrefix?.endsWith("-")
      ? currentPrefix
      : currentPrefix
        ? `${currentPrefix}-`
        : "";

    return `${safePrefix}${code}${formattedStart}`;
  };

  const handleSaveAndGenerate = async () => {
    if (isReadOnly) return;
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
      invalidateParticipantsAndNotify();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to process");
    } finally {
      setIsSaving(false);
      setIsGenerating(false);
    }
  };

  const handleUpdateConfiguration = async () => {
    if (isReadOnly) return;
    if (numberingStyle === "ALPHANUMERIC" && !editPrefix) {
      return toast.error("Prefix is required for Alphanumeric style");
    }

    const categoryConfig: Record<string, number> = {};
    for (const cat of categories) {
      // Logic for Numeric: No codes needed
      if (numberingStyle === "ALPHANUMERIC" && !editCategoryCodes[cat.id]) {
        return toast.error(`Code is required for ${cat.name}`);
      }

      const val = parseInt(editCategoryStarts[cat.id], 10);
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
        await saveChestNumberSettings(festivalId, {
          prefix: prefixToSave,
          categories: categoryConfig,
          categoryCodes: codesToSave,
          numberingStyle: numberingStyle,
        });
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

      invalidateParticipantsAndNotify();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update configuration",
      );
    } finally {
      setIsUpdatingPrefix(false);
    }
  };

  const handleReset = async () => {
    if (isReadOnly) return;
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

      invalidateParticipantsAndNotify();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset chest numbers",
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-4 items-center justify-between p-3 sm:px-4 py-3 border rounded-xl bg-muted/20 border-border/80">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
          <Settings2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-xs sm:text-sm truncate">
            Chest numbers
          </h3>
          <div className="text-[11px] sm:text-xs text-muted-foreground">
            {isConfigured ? (
              <span>
                {categories.length} categories ·{" "}
                {pendingCount > 0 ? `${pendingCount} pending` : "All set"}
              </span>
            ) : (
              <span className="text-destructive font-medium">
                Not configured
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {!isConfigured && (
          <Button
            size="sm"
            onClick={handleOpenEdit}
            className="h-8 gap-1.5 text-xs"
            disabled={isReadOnly}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Configure
          </Button>
        )}
        {isConfigured && (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isReadOnly}
                >
                  {isResetting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Reset"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all chest numbers?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove chest numbers from ALL participants and
                    reset the generation logic. This action cannot be undone.
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
                disabled={isReadOnly || isGenerating || pendingCount === 0}
                variant="default"
                size="sm"
                className="h-8 text-xs"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : null}
                Generate {pendingCount} new
              </Button>
            )}
          </>
        )}
      </div>
      <Drawer open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Chest Number Configuration</DrawerTitle>
            <DrawerDescription>
              Define the format for chest numbers. Choose style and set
              sequences.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0 space-y-6 py-1">
              <Tabs
                value={numberingStyle}
                onValueChange={(v) =>
                  setNumberingStyle(v as "ALPHANUMERIC" | "NUMERIC")
                }
                className="w-full"
              >
                <TabsList className="flex w-full h-auto p-1 bg-muted rounded-lg">
                  <TabsTrigger
                    value="ALPHANUMERIC"
                    disabled={isReadOnly}
                    className="flex-1 text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap h-auto py-2 px-2 leading-snug"
                  >
                    Alphanumeric
                    <span className="block sm:inline sm:ml-1 text-[10px] sm:text-xs opacity-70">
                      (e.g. FEST-A-01)
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="NUMERIC"
                    disabled={isReadOnly}
                    className="flex-1 text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap h-auto py-2 px-2 leading-snug"
                  >
                    Numeric Only
                    <span className="block sm:inline sm:ml-1 text-[10px] sm:text-xs opacity-70">
                      (e.g. 101)
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Prefix Section - Only for Alphanumeric */}
              {numberingStyle === "ALPHANUMERIC" && (
                <div className="space-y-2 bg-muted/30 p-3 sm:p-4 rounded-xl border border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Label className="text-sm font-semibold">Prefix</Label>
                    <div className="text-[11px] sm:text-xs text-muted-foreground font-mono bg-background px-2 py-1 rounded border">
                      Preview:{" "}
                      <span className="font-semibold text-foreground">
                        {getEditPreview(editPrefix)}
                      </span>
                    </div>
                  </div>
                  <Input
                    value={editPrefix}
                    onChange={(e) =>
                      setEditPrefix(e.target.value.toUpperCase())
                    }
                    placeholder="e.g. FEST"
                    disabled={isReadOnly}
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This prefix will be prepended to all generated chest
                    numbers.
                  </p>
                </div>
              )}

              {/* Preview for Numeric */}
              {numberingStyle === "NUMERIC" && (
                <div className="text-xs sm:text-sm text-muted-foreground font-mono text-center p-3 bg-muted/30 rounded-xl border border-border/50">
                  Preview Format:{" "}
                  <span className="font-semibold text-foreground">
                    {getEditPreview(editPrefix)}
                  </span>
                </div>
              )}

              {/* Categories Section */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Category Sequences
                </Label>
                <div className="border rounded-xl divide-y overflow-hidden bg-card">
                  {categories.map((cat: CategoryItem) => (
                    <div
                      key={cat.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-3 sm:gap-4 transition-colors hover:bg-muted/10"
                    >
                      <span className="font-medium text-sm sm:text-base leading-tight">
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-3 sm:gap-4 self-start sm:self-auto w-full sm:w-auto">
                        {numberingStyle === "ALPHANUMERIC" && (
                          <div className="flex items-center gap-2 flex-1 sm:flex-none bg-muted/30 px-2 py-1.5 rounded-md border border-border/50">
                            <span className="text-muted-foreground text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
                              Code
                            </span>
                            <Input
                              className="w-14 sm:w-16 h-7 sm:h-8 font-mono uppercase text-xs sm:text-sm bg-background px-2"
                              value={editCategoryCodes[cat.id] ?? ""}
                              onChange={(e) =>
                                handleEditCodeChange(cat.id, e.target.value)
                              }
                              placeholder={cat.name.charAt(0)}
                              maxLength={3}
                              disabled={isReadOnly}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-1 sm:flex-none bg-muted/30 px-2 py-1.5 rounded-md border border-border/50">
                          <span className="text-muted-foreground text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
                            Start
                          </span>
                          <Input
                            className="w-16 sm:w-20 h-7 sm:h-8 text-xs sm:text-sm bg-background px-2"
                            type="number"
                            value={editCategoryStarts[cat.id] ?? ""}
                            onChange={(e) =>
                              setEditCategoryStarts((prev) => ({
                                ...prev,
                                [cat.id]: e.target.value,
                              }))
                            }
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateConfiguration}
                disabled={isReadOnly || isUpdatingPrefix}
                className="flex-1 sm:flex-none"
              >
                {isUpdatingPrefix && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isConfigured ? "Update All" : "Save & Generate"}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
