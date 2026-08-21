"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Edit,
  Info,
  Loader2,
  Settings2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ParticipantDetailsDialog } from "@/components/festival/pre-event-works/participants/ParticipantDetailsDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAllViolatorsAction,
  getCategoryLimitsWithViolationsAction,
  removeCategoryLimitAction,
  upsertCategoryLimitAction,
} from "@/features/category-limits/actions/category-limit.actions";

interface LimitationPolicyClientProps {
  festivalId: string;
}

export function LimitationPolicyClient({
  festivalId,
}: LimitationPolicyClientProps) {
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["category-limits", festivalId],
    queryFn: () => getCategoryLimitsWithViolationsAction(festivalId),
  });

  const { data: violators, isLoading: isLoadingViolators } = useQuery({
    queryKey: ["category-violators", festivalId],
    queryFn: () => getAllViolatorsAction(festivalId),
  });

  const bulkUpsertMutation = useMutation({
    mutationFn: async (
      updates: Array<{
        categoryId: string;
        maxStage: number | null;
        maxNonStage: number | null;
        maxAll: number | null;
      }>,
    ) => {
      // Execute all updates sequentially or in parallel
      await Promise.all(
        updates.map((update) =>
          upsertCategoryLimitAction(festivalId, update.categoryId, update),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["category-limits", festivalId],
      });
      queryClient.invalidateQueries({
        queryKey: ["category-violators", festivalId],
      });
      toast.success("Category limits updated successfully");
      setIsDrawerOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update category limits");
    },
  });

  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const groups = Array.from(
    new Set(violators?.map((v) => v.participant?.group?.name).filter(Boolean)),
  );
  const categoriesList = Array.from(
    new Set(violators?.map((v) => v.category?.name).filter(Boolean)),
  );

  const filteredViolators = violators?.filter((v) => {
    if (groupFilter !== "ALL" && v.participant?.group?.name !== groupFilter)
      return false;
    if (categoryFilter !== "ALL" && v.category?.name !== categoryFilter)
      return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col justify-center items-center text-muted-foreground gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading limitation policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold">
            Category Limits Configuration
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDrawerOpen(true)}
            disabled={isLoading || !categories || categories.length === 0}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Manage Limits
          </Button>
        </div>

        <div className="pt-2">
          {!categories || categories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border rounded-md">
              <Info className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No categories found in this festival.</p>
            </div>
          ) : (
            <div className="w-full min-w-0">
              {/* Universal View (Compact Swipe Cards on mobile, Grid on desktop) */}
              <div className="flex w-full overflow-x-auto md:overflow-visible gap-4 pb-4 pt-1 px-1 snap-x snap-mandatory md:snap-none scroll-smooth max-w-[calc(100vw-2rem)] md:max-w-none md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:flex-none">
                {categories.map((cat: any) => {
                  const limit = cat.limit;
                  const hasLimits =
                    limit &&
                    (limit.maxStage !== null ||
                      limit.maxNonStage !== null ||
                      limit.maxAll !== null);
                  const hasViolations = cat.violationCounts?.total > 0;

                  return (
                    <div
                      key={cat.id}
                      className="snap-center shrink-0 w-[240px] md:w-auto md:shrink md:flex-none flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden"
                    >
                      <div className="bg-muted/30 p-2 border-b flex flex-col justify-center min-h-[48px]">
                        <div
                          className="font-semibold text-[13px] truncate"
                          title={cat.name}
                        >
                          {cat.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {hasLimits ? "Limits configured" : "No limits set"}
                        </div>
                      </div>

                      <div className="flex flex-col flex-1 p-3 gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            Max Stage:
                          </span>
                          {limit?.maxStage !== null &&
                          limit?.maxStage !== undefined ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] py-0 h-4"
                            >
                              {limit.maxStage}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs font-mono">
                              ∞
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            Max Non-Stage:
                          </span>
                          {limit?.maxNonStage !== null &&
                          limit?.maxNonStage !== undefined ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] py-0 h-4"
                            >
                              {limit.maxNonStage}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs font-mono">
                              ∞
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            Max Total:
                          </span>
                          {limit?.maxAll !== null &&
                          limit?.maxAll !== undefined ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] py-0 h-4"
                            >
                              {limit.maxAll}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs font-mono">
                              ∞
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-2 mt-auto border-t">
                          <span className="text-xs text-muted-foreground">
                            Violations:
                          </span>
                          {hasViolations ? (
                            <Badge
                              variant="destructive"
                              className="flex items-center gap-1 text-[10px] py-0 h-4"
                            >
                              <ShieldAlert className="h-2.5 w-2.5" />
                              {cat.violationCounts.total}
                            </Badge>
                          ) : hasLimits ? (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] py-0 h-4"
                            >
                              0
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">
                              -
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Violations Section */}
      <div className="mt-12 space-y-4">
        <div className="flex items-center gap-2 border-b border-destructive/10 pb-4">
          <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-destructive">
            Participation Violations
          </h3>
        </div>

        <div className="pt-2">
          {isLoadingViolators ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !violators || violators.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <ShieldAlert className="h-6 w-6 text-emerald-500 opacity-50" />
              </div>
              <p className="text-lg font-medium text-emerald-600">All Clear</p>
              <p className="text-muted-foreground mt-1 text-sm">
                No participants are currently violating category limits.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 mb-2">
                <div className="flex-1">
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Groups</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g as string} value={g as string}>
                          {g as string}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      {categoriesList.map((c) => (
                        <SelectItem key={c as string} value={c as string}>
                          {c as string}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredViolators?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-md">
                  No violators match the selected filters.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Participant</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-center">Stage</TableHead>
                          <TableHead className="text-center">
                            Non-Stage
                          </TableHead>
                          <TableHead className="text-center">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredViolators?.map((v, i) => (
                          <ParticipantDetailsDialog
                            key={i}
                            festivalId={festivalId}
                            participant={v.participant}
                            trigger={
                              <TableRow className="hover:bg-destructive/5 cursor-pointer transition-colors">
                                <TableCell>
                                  <div className="font-medium text-primary">
                                    {v.participant.name}
                                  </div>
                                  {v.participant.chestNumber && (
                                    <div className="text-xs text-muted-foreground">
                                      Chest: {v.participant.chestNumber}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{
                                        backgroundColor:
                                          v.participant.group?.color ||
                                          "#2563eb",
                                      }}
                                    />
                                    <span className="text-sm">
                                      {v.participant.group?.name ?? "—"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {v.category.name}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span
                                    className={
                                      v.status.isOverStage
                                        ? "text-destructive font-bold"
                                        : ""
                                    }
                                  >
                                    {v.status.stageCount}
                                  </span>
                                  <span className="text-muted-foreground text-xs ml-1">
                                    / {v.status.maxStage ?? "∞"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span
                                    className={
                                      v.status.isOverNonStage
                                        ? "text-destructive font-bold"
                                        : ""
                                    }
                                  >
                                    {v.status.nonStageCount}
                                  </span>
                                  <span className="text-muted-foreground text-xs ml-1">
                                    / {v.status.maxNonStage ?? "∞"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span
                                    className={
                                      v.status.isOverAll
                                        ? "text-destructive font-bold"
                                        : ""
                                    }
                                  >
                                    {v.status.allCount}
                                  </span>
                                  <span className="text-muted-foreground text-xs ml-1">
                                    / {v.status.maxAll ?? "∞"}
                                  </span>
                                </TableCell>
                              </TableRow>
                            }
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View (Compact Cards) */}
                  <div className="sm:hidden flex flex-col gap-3">
                    {filteredViolators?.map((v, i) => (
                      <ParticipantDetailsDialog
                        key={i}
                        festivalId={festivalId}
                        participant={v.participant}
                        trigger={
                          <div className="border border-destructive/20 hover:bg-destructive/5 transition-colors cursor-pointer rounded-md text-left shadow-sm bg-card p-2.5">
                            <div className="flex justify-between items-center mb-1.5">
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <div className="font-medium text-sm text-primary truncate">
                                  {v.participant.name}
                                </div>
                                {v.participant.chestNumber && (
                                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                    #{v.participant.chestNumber}
                                  </span>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 h-4 shrink-0 whitespace-nowrap bg-muted/20"
                              >
                                {v.category.name}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-1.5 mb-2 min-w-0">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    v.participant.group?.color || "#2563eb",
                                }}
                              />
                              <span className="text-[10px] text-muted-foreground truncate">
                                {v.participant.group?.name ?? "—"}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 border-t border-border/50 text-[10px]">
                              <div className="flex items-center gap-0.5">
                                <span className="text-muted-foreground">
                                  Stg:
                                </span>
                                <span
                                  className={
                                    v.status.isOverStage
                                      ? "text-destructive font-bold"
                                      : ""
                                  }
                                >
                                  {v.status.stageCount}
                                </span>
                                <span className="text-muted-foreground">
                                  /{v.status.maxStage ?? "∞"}
                                </span>
                              </div>
                              <span className="text-muted-foreground/30">
                                •
                              </span>
                              <div className="flex items-center gap-0.5">
                                <span className="text-muted-foreground">
                                  Non:
                                </span>
                                <span
                                  className={
                                    v.status.isOverNonStage
                                      ? "text-destructive font-bold"
                                      : ""
                                  }
                                >
                                  {v.status.nonStageCount}
                                </span>
                                <span className="text-muted-foreground">
                                  /{v.status.maxNonStage ?? "∞"}
                                </span>
                              </div>
                              <span className="text-muted-foreground/30">
                                •
                              </span>
                              <div className="flex items-center gap-0.5">
                                <span className="text-muted-foreground">
                                  Tot:
                                </span>
                                <span
                                  className={
                                    v.status.isOverAll
                                      ? "text-destructive font-bold"
                                      : ""
                                  }
                                >
                                  {v.status.allCount}
                                </span>
                                <span className="text-muted-foreground">
                                  /{v.status.maxAll ?? "∞"}
                                </span>
                              </div>
                            </div>
                          </div>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ManageLimitsDrawer
        categories={categories || []}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onSave={(data) => {
          bulkUpsertMutation.mutate(data);
        }}
        isSaving={bulkUpsertMutation.isPending}
      />
    </div>
  );
}

function ManageLimitsDrawer({
  categories,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  categories: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    data: Array<{
      categoryId: string;
      maxStage: number | null;
      maxNonStage: number | null;
      maxAll: number | null;
    }>,
  ) => void;
  isSaving: boolean;
}) {
  // Store form state for all categories in a map keyed by categoryId
  const [limitsState, setLimitsState] = useState<
    Record<
      string,
      {
        maxStage: string;
        maxNonStage: string;
        maxAll: string;
        isActive: boolean; // whether this category has limits toggled on
      }
    >
  >({});

  // Initialize state when drawer opens
  useEffect(() => {
    if (open && categories) {
      const initialState: Record<string, any> = {};
      categories.forEach((cat) => {
        const hasLimits =
          cat.limit &&
          (cat.limit.maxStage !== null ||
            cat.limit.maxNonStage !== null ||
            cat.limit.maxAll !== null);

        initialState[cat.id] = {
          isActive: !!hasLimits,
          maxStage: cat.limit?.maxStage?.toString() || "",
          maxNonStage: cat.limit?.maxNonStage?.toString() || "",
          maxAll: cat.limit?.maxAll?.toString() || "",
        };
      });
      setLimitsState(initialState);
    }
  }, [open, categories]);

  const handleUpdate = (
    categoryId: string,
    field: "maxStage" | "maxNonStage" | "maxAll",
    value: string,
  ) => {
    setLimitsState((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [field]: value,
      },
    }));
  };

  const handleToggleActive = (categoryId: string) => {
    setLimitsState((prev) => {
      const isCurrentlyActive = prev[categoryId]?.isActive;
      return {
        ...prev,
        [categoryId]: {
          ...prev[categoryId],
          isActive: !isCurrentlyActive,
          // When turning ON for the first time, default values to "1"
          maxStage: !isCurrentlyActive ? "1" : prev[categoryId].maxStage,
          maxNonStage: !isCurrentlyActive ? "1" : prev[categoryId].maxNonStage,
          maxAll: !isCurrentlyActive ? "1" : prev[categoryId].maxAll,
        },
      };
    });
  };

  const handleSave = () => {
    const updates = categories.map((cat) => {
      const state = limitsState[cat.id];
      if (!state || !state.isActive) {
        // If inactive, send nulls to clear limits
        return {
          categoryId: cat.id,
          maxStage: null,
          maxNonStage: null,
          maxAll: null,
        };
      }
      return {
        categoryId: cat.id,
        maxStage: state.maxStage ? parseInt(state.maxStage, 10) : null,
        maxNonStage: state.maxNonStage ? parseInt(state.maxNonStage, 10) : null,
        maxAll: state.maxAll ? parseInt(state.maxAll, 10) : null,
      };
    });
    onSave(updates);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0"
      >
        <div className="p-6 pb-4 border-b">
          <SheetHeader>
            <SheetTitle>Manage Category Limits</SheetTitle>
            <SheetDescription>
              Configure maximum participation limits for all categories in one
              place. Turn on limits for a category to set its caps.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {categories?.map((cat) => {
              const state = limitsState[cat.id] || {
                isActive: false,
                maxStage: "",
                maxNonStage: "",
                maxAll: "",
              };

              return (
                <div
                  key={cat.id}
                  className={`border rounded-lg p-4 transition-colors ${state.isActive ? "bg-muted/10 border-primary/20" : "bg-card"}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-sm">{cat.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {state.isActive
                          ? "Limits enforced"
                          : "No limits enforced"}
                      </p>
                    </div>
                    <Button
                      variant={state.isActive ? "destructive" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleActive(cat.id)}
                    >
                      {state.isActive ? "Disable Limits" : "Enable Limits"}
                    </Button>
                  </div>

                  {state.isActive && (
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                      <div className="space-y-2">
                        <Label
                          htmlFor={`stage-${cat.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          Max Stage
                        </Label>
                        <Input
                          id={`stage-${cat.id}`}
                          type="number"
                          min="0"
                          value={state.maxStage}
                          onChange={(e) =>
                            handleUpdate(cat.id, "maxStage", e.target.value)
                          }
                          placeholder="∞"
                          className="h-8 font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor={`nonstage-${cat.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          Max Non-Stage
                        </Label>
                        <Input
                          id={`nonstage-${cat.id}`}
                          type="number"
                          min="0"
                          value={state.maxNonStage}
                          onChange={(e) =>
                            handleUpdate(cat.id, "maxNonStage", e.target.value)
                          }
                          placeholder="∞"
                          className="h-8 font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor={`all-${cat.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          Max Total
                        </Label>
                        <Input
                          id={`all-${cat.id}`}
                          type="number"
                          min="0"
                          value={state.maxAll}
                          onChange={(e) =>
                            handleUpdate(cat.id, "maxAll", e.target.value)
                          }
                          placeholder="∞"
                          className="h-8 font-mono text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t mt-auto">
          <div className="flex gap-3 justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save All Changes
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
