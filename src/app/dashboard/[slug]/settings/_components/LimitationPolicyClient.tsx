"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Info, Loader2, ShieldAlert, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getCategoryLimitsWithViolationsAction,
  removeCategoryLimitAction,
  upsertCategoryLimitAction,
  getAllViolatorsAction
} from "@/features/category-limits/actions/category-limit.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ParticipantDetailsDialog } from "@/components/festival/pre-event-works/participants/ParticipantDetailsDialog";

interface LimitationPolicyClientProps {
  festivalId: string;
}

export function LimitationPolicyClient({ festivalId }: LimitationPolicyClientProps) {
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["category-limits", festivalId],
    queryFn: () => getCategoryLimitsWithViolationsAction(festivalId),
  });

  const { data: violators, isLoading: isLoadingViolators } = useQuery({
    queryKey: ["category-violators", festivalId],
    queryFn: () => getAllViolatorsAction(festivalId),
  });

  const upsertMutation = useMutation({
    mutationFn: (vars: {
      categoryId: string;
      maxStage: number | null;
      maxNonStage: number | null;
      maxAll: number | null;
    }) => upsertCategoryLimitAction(festivalId, vars.categoryId, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-limits", festivalId] });
      queryClient.invalidateQueries({ queryKey: ["category-violators", festivalId] });
      toast.success("Category limits updated");
      setEditingCategory(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update category limits");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (categoryId: string) => removeCategoryLimitAction(festivalId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-limits", festivalId] });
      queryClient.invalidateQueries({ queryKey: ["category-violators", festivalId] });
      toast.success("Category limits removed");
      setEditingCategory(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove category limits");
    },
  });

  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const groups = Array.from(new Set(violators?.map(v => v.participant?.group?.name).filter(Boolean)));
  const categoriesList = Array.from(new Set(violators?.map(v => v.category?.name).filter(Boolean)));

  const filteredViolators = violators?.filter(v => {
    if (groupFilter !== "ALL" && v.participant?.group?.name !== groupFilter) return false;
    if (categoryFilter !== "ALL" && v.category?.name !== categoryFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-16 flex flex-col justify-center items-center text-muted-foreground gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading limitation policies...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Category Limits Configuration</CardTitle>
              <CardDescription className="mt-1.5">
                Set maximum participation limits per category. Leave fields empty for no limit.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {!categories || categories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No categories found in this festival.</p>
            </div>
          ) : (
            <div className="rounded-md border-0 sm:border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 hidden sm:table-header-group">
                    <TableRow>
                      <TableHead className="w-[200px]">Category</TableHead>
                      <TableHead className="text-center">Max Stage</TableHead>
                      <TableHead className="text-center">Max Non-Stage</TableHead>
                      <TableHead className="text-center">Max Total</TableHead>
                      <TableHead className="text-center">Violations</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat: any) => {
                      const limit = cat.limit;
                      const hasLimits = limit && (limit.maxStage !== null || limit.maxNonStage !== null || limit.maxAll !== null);
                      const hasViolations = cat.violationCounts?.total > 0;
                      
                      return (
                        <TableRow key={cat.id} className="group flex flex-col sm:table-row border-b last:border-b-0 sm:border-b">
                          <TableCell className="font-semibold text-base sm:text-sm pt-4 sm:pt-4 bg-muted/20 sm:bg-transparent">
                            {cat.name}
                            <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                              {hasLimits ? "Limits configured" : "No limits set"}
                            </div>
                          </TableCell>
                          
                          <TableCell className="sm:text-center flex justify-between sm:table-cell py-2 sm:py-4">
                            <span className="text-muted-foreground sm:hidden text-sm">Max Stage:</span>
                            {limit?.maxStage !== null && limit?.maxStage !== undefined ? (
                              <Badge variant="outline" className="font-mono">{limit.maxStage}</Badge>
                            ) : (
                              <span className="text-muted-foreground/50 text-sm">∞</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="sm:text-center flex justify-between sm:table-cell py-2 sm:py-4">
                            <span className="text-muted-foreground sm:hidden text-sm">Max Non-Stage:</span>
                            {limit?.maxNonStage !== null && limit?.maxNonStage !== undefined ? (
                              <Badge variant="outline" className="font-mono">{limit.maxNonStage}</Badge>
                            ) : (
                              <span className="text-muted-foreground/50 text-sm">∞</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="sm:text-center flex justify-between sm:table-cell py-2 sm:py-4">
                            <span className="text-muted-foreground sm:hidden text-sm">Max Total:</span>
                            {limit?.maxAll !== null && limit?.maxAll !== undefined ? (
                              <Badge variant="outline" className="font-mono">{limit.maxAll}</Badge>
                            ) : (
                              <span className="text-muted-foreground/50 text-sm">∞</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="sm:text-center flex justify-between sm:table-cell py-2 sm:py-4">
                            <span className="text-muted-foreground sm:hidden text-sm">Violations:</span>
                            {hasViolations ? (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit sm:mx-auto">
                                <ShieldAlert className="h-3 w-3" />
                                {cat.violationCounts.total}
                              </Badge>
                            ) : hasLimits ? (
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 w-fit sm:mx-auto border-0">
                                0
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/30 text-sm">-</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-right py-3 sm:py-4 bg-muted/10 sm:bg-transparent">
                            <Button
                              variant={hasLimits ? "secondary" : "default"}
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => setEditingCategory(cat)}
                            >
                              {hasLimits ? (
                                <><Edit className="h-3.5 w-3.5 mr-2" /> Edit</>
                              ) : (
                                "Set Limits"
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Violations Section */}
      <Card className="border-destructive/20 shadow-sm">
        <CardHeader className="bg-destructive/5 border-b border-destructive/10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg text-destructive">Participation Violations</CardTitle>
              <CardDescription className="mt-1">
                Participants who are assigned to more programmes than their category allows.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
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
              <p className="text-muted-foreground mt-1 text-sm">No participants are currently violating category limits.</p>
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
                      {groups.map(g => (
                        <SelectItem key={g as string} value={g as string}>{g as string}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      {categoriesList.map(c => (
                        <SelectItem key={c as string} value={c as string}>{c as string}</SelectItem>
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
                <div className="rounded-md border-0 sm:border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="hidden sm:table">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Participant</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-center">Stage</TableHead>
                          <TableHead className="text-center">Non-Stage</TableHead>
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
                                  <div className="font-medium text-primary">{v.participant.name}</div>
                                  {v.participant.chestNumber && (
                                    <div className="text-xs text-muted-foreground">Chest: {v.participant.chestNumber}</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <span 
                                      className="w-2 h-2 rounded-full shrink-0" 
                                      style={{ backgroundColor: v.participant.group?.color || "#2563eb" }} 
                                    />
                                    <span className="text-sm">{v.participant.group?.name ?? "—"}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{v.category.name}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={v.status.isOverStage ? "text-destructive font-bold" : ""}>
                                    {v.status.stageCount}
                                  </span>
                                  <span className="text-muted-foreground text-xs ml-1">/ {v.status.maxStage ?? "∞"}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={v.status.isOverNonStage ? "text-destructive font-bold" : ""}>
                                    {v.status.nonStageCount}
                                  </span>
                                  <span className="text-muted-foreground text-xs ml-1">/ {v.status.maxNonStage ?? "∞"}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={v.status.isOverAll ? "text-destructive font-bold" : ""}>
                                    {v.status.allCount}
                                  </span>
                                  <span className="text-muted-foreground text-xs ml-1">/ {v.status.maxAll ?? "∞"}</span>
                                </TableCell>
                              </TableRow>
                            }
                          />
                        ))}
                      </TableBody>
                    </Table>

                    {/* Mobile View (Cards) */}
                    <div className="sm:hidden flex flex-col gap-4">
                      {filteredViolators?.map((v, i) => (
                        <ParticipantDetailsDialog
                          key={i}
                          festivalId={festivalId}
                          participant={v.participant}
                          trigger={
                            <Card className="border border-destructive/20 hover:bg-destructive/5 transition-colors cursor-pointer rounded-lg text-left shadow-sm">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-semibold text-primary">{v.participant.name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      {v.participant.chestNumber && (
                                        <Badge variant="secondary" className="text-[10px] py-0 font-mono">
                                          {v.participant.chestNumber}
                                        </Badge>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <span 
                                          className="w-1.5 h-1.5 rounded-full shrink-0" 
                                          style={{ backgroundColor: v.participant.group?.color || "#2563eb" }} 
                                        />
                                        <span className="text-xs text-muted-foreground">{v.participant.group?.name ?? "—"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-xs shrink-0">{v.category.name}</Badge>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-sm">
                                  <div className="flex flex-col items-center">
                                    <span className="text-muted-foreground text-[10px] uppercase">Stage</span>
                                    <div>
                                      <span className={v.status.isOverStage ? "text-destructive font-bold" : ""}>{v.status.stageCount}</span>
                                      <span className="text-muted-foreground text-xs">/{v.status.maxStage ?? "∞"}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-muted-foreground text-[10px] uppercase">Non-Stage</span>
                                    <div>
                                      <span className={v.status.isOverNonStage ? "text-destructive font-bold" : ""}>{v.status.nonStageCount}</span>
                                      <span className="text-muted-foreground text-xs">/{v.status.maxNonStage ?? "∞"}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-muted-foreground text-[10px] uppercase">Total</span>
                                    <div>
                                      <span className={v.status.isOverAll ? "text-destructive font-bold" : ""}>{v.status.allCount}</span>
                                      <span className="text-muted-foreground text-xs">/{v.status.maxAll ?? "∞"}</span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {editingCategory && (
        <EditLimitModal
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => {
            if (!open) setEditingCategory(null);
          }}
          onSave={(data) => {
            upsertMutation.mutate({
              categoryId: editingCategory.id,
              ...data,
            });
          }}
          onRemove={() => {
            removeMutation.mutate(editingCategory.id);
          }}
          isSaving={upsertMutation.isPending}
          isRemoving={removeMutation.isPending}
        />
      )}
    </div>
  );
}

function EditLimitModal({
  category,
  open,
  onOpenChange,
  onSave,
  onRemove,
  isSaving,
  isRemoving,
}: {
  category: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { maxStage: number | null; maxNonStage: number | null; maxAll: number | null }) => void;
  onRemove: () => void;
  isSaving: boolean;
  isRemoving: boolean;
}) {
  const [maxStage, setMaxStage] = useState<string>(category.limit?.maxStage?.toString() || "");
  const [maxNonStage, setMaxNonStage] = useState<string>(category.limit?.maxNonStage?.toString() || "");
  const [maxAll, setMaxAll] = useState<string>(category.limit?.maxAll?.toString() || "");

  const handleSave = () => {
    onSave({
      maxStage: maxStage ? parseInt(maxStage, 10) : null,
      maxNonStage: maxNonStage ? parseInt(maxNonStage, 10) : null,
      maxAll: maxAll ? parseInt(maxAll, 10) : null,
    });
  };

  const hasExistingLimits = !!category.limit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Limits</DialogTitle>
          <DialogDescription>
            Setting limits for <strong className="text-foreground">{category.name}</strong>. Leave empty for no limit.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_100px] items-center gap-4">
              <Label htmlFor="maxStage" className="font-medium text-muted-foreground flex flex-col">
                <span className="text-foreground">Max Stage</span>
                <span className="text-xs font-normal">Programmes on stage</span>
              </Label>
              <Input
                id="maxStage"
                type="number"
                min="0"
                value={maxStage}
                onChange={(e) => setMaxStage(e.target.value)}
                placeholder="∞"
                className="text-center font-mono"
              />
            </div>
            
            <div className="grid grid-cols-[1fr_100px] items-center gap-4">
              <Label htmlFor="maxNonStage" className="font-medium text-muted-foreground flex flex-col">
                <span className="text-foreground">Max Non-Stage</span>
                <span className="text-xs font-normal">Off-stage / writing programmes</span>
              </Label>
              <Input
                id="maxNonStage"
                type="number"
                min="0"
                value={maxNonStage}
                onChange={(e) => setMaxNonStage(e.target.value)}
                placeholder="∞"
                className="text-center font-mono"
              />
            </div>
            
            <div className="grid grid-cols-[1fr_100px] items-center gap-4 pt-2 border-t">
              <Label htmlFor="maxAll" className="font-medium text-muted-foreground flex flex-col">
                <span className="text-foreground">Max Total</span>
                <span className="text-xs font-normal">Overall cap across both types</span>
              </Label>
              <Input
                id="maxAll"
                type="number"
                min="0"
                value={maxAll}
                onChange={(e) => setMaxAll(e.target.value)}
                placeholder="∞"
                className="text-center font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-2">
          {hasExistingLimits ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
              disabled={isSaving || isRemoving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Limits
            </Button>
          ) : (
            <div className="hidden sm:block" /> 
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isRemoving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || isRemoving} className="flex-1 sm:flex-none">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
