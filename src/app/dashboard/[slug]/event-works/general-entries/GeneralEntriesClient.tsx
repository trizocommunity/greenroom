"use client";

import {
  AlertCircle,
  Award,
  Check,
  ChevronsUpDown,
  FileText,
  Grid2X2,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
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
import { Textarea } from "@/components/ui/textarea";
import {
  createGeneralEntryAction,
  createGeneralEntryCategoryAction,
  deleteGeneralEntryAction,
  deleteGeneralEntryCategoryAction,
  publishGeneralEntryAction,
  unpublishGeneralEntryAction,
  updateGeneralEntryAction,
  updateGeneralEntryCategoryAction,
} from "@/features/general-entries/actions/general-entries.actions";
import { toast } from "@/lib/toast";

type Group = { id: string; name: string };
type Category = { id: string; name: string };
type Entry = {
  id: string;
  name: string;
  categoryId: string | null;
  type: string;
  remarks: string | null;
  awards: {
    id: string;
    groupId: string;
    points: number;
    isPublished: boolean;
  }[];
};

export function GeneralEntriesClient({
  festivalId,
  categories,
  entries,
  groups,
}: {
  festivalId: string;
  categories: Category[];
  entries: Entry[];
  groups: Group[];
}) {
  const [isPending, startTransition] = useTransition();

  const [localCategories, setLocalCategories] =
    useState<Category[]>(categories);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const [categoryComboboxOpen, setCategoryComboboxOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 20;

  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [entrySheetOpen, setEntrySheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entryName, setEntryName] = useState("");
  const [entryCategoryId, setEntryCategoryId] = useState<string>("none");
  const [entryType, setEntryType] = useState<string>("GENERAL");
  const [entryRemarks, setEntryRemarks] = useState("");
  const [entryAwards, setEntryAwards] = useState<
    { groupId: string; points: string }[]
  >([]);

  const [viewEntry, setViewEntry] = useState<Entry | null>(null);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);

  function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    startTransition(async () => {
      try {
        const res = await createGeneralEntryCategoryAction({
          festivalId,
          name: newCategoryName.trim(),
        });
        if (res?.id) {
          setLocalCategories((prev) => [
            { id: res.id, name: newCategoryName.trim() },
            ...prev,
          ]);
        }
        toast.success("Category created successfully");
        setNewCategoryName("");
      } catch (err: any) {
        toast.error(err.message || "Failed to create category");
      }
    });
  }

  function handleUpdateCategory(id: string) {
    if (!editingCategoryName.trim()) return;
    startTransition(async () => {
      try {
        await updateGeneralEntryCategoryAction(festivalId, {
          id,
          name: editingCategoryName.trim(),
        });
        setLocalCategories((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, name: editingCategoryName.trim() } : c,
          ),
        );
        toast.success("Category updated successfully");
        setEditingCategoryId(null);
        setEditingCategoryName("");
      } catch (err: any) {
        toast.error(err.message || "Failed to update category");
      }
    });
  }

  function handleDeleteCategory(id: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          await deleteGeneralEntryCategoryAction(festivalId, id);
          setLocalCategories((prev) => prev.filter((c) => c.id !== id));
          toast.success("Category deleted");
        } catch (err: any) {
          toast.error(err.message || "Failed to delete category");
        }
        resolve();
      });
    });
  }

  async function handleCreateOrSelectCategory(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existing = localCategories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      setEntryCategoryId(existing.id);
      setCategorySearch("");
      setCategoryComboboxOpen(false);
      return;
    }

    setIsCreatingCategory(true);
    try {
      const res = await createGeneralEntryCategoryAction({
        festivalId,
        name: trimmed,
      });
      if (res?.id) {
        const newCat = { id: res.id, name: trimmed };
        setLocalCategories((prev) => [newCat, ...prev]);
        setEntryCategoryId(res.id);
        toast.success(`Category "${trimmed}" created`);
      }
      setCategorySearch("");
      setCategoryComboboxOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  }

  function openCreateEntry() {
    setEditingEntry(null);
    setEntryName("");
    setEntryCategoryId("none");
    setCategorySearch("");
    setCategoryComboboxOpen(false);
    setEntryType("GENERAL");
    setEntryRemarks("");
    setEntryAwards(groups.map((g) => ({ groupId: g.id, points: "" })));
    setEntrySheetOpen(true);
  }

  function openEditEntry(entry: Entry) {
    setEditingEntry(entry);
    setEntryName(entry.name);
    setEntryCategoryId(entry.categoryId || "none");
    setCategorySearch("");
    setCategoryComboboxOpen(false);
    setEntryType(entry.type || "GENERAL");
    setEntryRemarks(entry.remarks || "");

    setEntryAwards(
      groups.map((g) => {
        const existingAward = entry.awards.find((a) => a.groupId === g.id);
        return {
          groupId: g.id,
          points: existingAward ? existingAward.points.toString() : "",
        };
      }),
    );

    setEntrySheetOpen(true);
    setViewSheetOpen(false); // Close view if open
  }

  function handleSaveEntry(publish: boolean) {
    if (!entryName.trim()) return;
    const validAwards = entryAwards
      .filter(
        (a) => a.points.trim() !== "" && !Number.isNaN(parseInt(a.points, 10)),
      )
      .map((a) => ({ groupId: a.groupId, points: parseInt(a.points, 10) }));

    if (publish && validAwards.length === 0) {
      toast.error(
        "Please award points to at least one group before publishing.",
      );
      return;
    }

    startTransition(async () => {
      try {
        if (editingEntry) {
          await updateGeneralEntryAction(festivalId, {
            id: editingEntry.id,
            name: entryName.trim(),
            categoryId:
              entryType === "PROGRAMME"
                ? null
                : entryCategoryId === "none"
                  ? null
                  : entryCategoryId,
            type: entryType as "GENERAL" | "PROGRAMME",
            remarks: entryType === "PROGRAMME" ? entryRemarks : null,
            awards: validAwards,
            publish,
          });
          toast.success(
            publish ? "Entry updated and published" : "Entry saved as draft",
          );
        } else {
          await createGeneralEntryAction({
            festivalId,
            name: entryName.trim(),
            categoryId:
              entryType === "PROGRAMME"
                ? null
                : entryCategoryId === "none"
                  ? null
                  : entryCategoryId,
            type: entryType as "GENERAL" | "PROGRAMME",
            remarks: entryType === "PROGRAMME" ? entryRemarks : null,
            awards: validAwards,
            publish,
          });
          toast.success(
            publish ? "Entry added and published" : "Entry added as draft",
          );
        }
        setEntrySheetOpen(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to save entry");
      }
    });
  }

  function handleDeleteEntry(id: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          await deleteGeneralEntryAction(festivalId, id);
          toast.success("Entry deleted");
          setViewSheetOpen(false);
        } catch (err: any) {
          toast.error(err.message || "Failed to delete entry");
        }
        resolve();
      });
    });
  }

  function handlePublishEntry(id: string, isCurrentlyPublished: boolean) {
    startTransition(async () => {
      try {
        if (isCurrentlyPublished) {
          await unpublishGeneralEntryAction(festivalId, id);
          toast.success("Entry unpublished");
        } else {
          await publishGeneralEntryAction(festivalId, id);
          toast.success("Entry published");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to change publish status");
      }
    });
  }

  function openViewEntry(entry: Entry) {
    setViewEntry(entry);
    setViewSheetOpen(true);
  }

  function renderPoints(points: number) {
    return points > 0 ? `+${points}` : `${points}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
          General Entries
        </h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-9 sm:w-auto p-0 sm:px-3.5 gap-2"
                aria-label="Browse Categories"
                title="Browse Categories"
              >
                <Grid2X2 className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Browse Categories</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col h-full p-0 sm:max-w-md gap-0">
              <SheetHeader className="p-6 pb-4 border-b shrink-0">
                <SheetTitle>Categories</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-3">
                  <Label>Create New Category</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Literary, March Past"
                      disabled={isPending}
                    />
                    <Button
                      disabled={isPending || !newCategoryName.trim()}
                      onClick={handleCreateCategory}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Existing Categories</Label>
                  {localCategories.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic border rounded-md p-4 bg-muted/30">
                      No categories found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {localCategories.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2 border rounded-md bg-card"
                        >
                          {editingCategoryId === c.id ? (
                            <div className="flex items-center gap-2 w-full">
                              <Input
                                value={editingCategoryName}
                                onChange={(e) =>
                                  setEditingCategoryName(e.target.value)
                                }
                                className="h-8"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600"
                                disabled={
                                  isPending || !editingCategoryName.trim()
                                }
                                onClick={() => handleUpdateCategory(c.id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground"
                                disabled={isPending}
                                onClick={() => setEditingCategoryId(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium px-2">
                                {c.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground"
                                  disabled={isPending}
                                  onClick={() => {
                                    setEditingCategoryId(c.id);
                                    setEditingCategoryName(c.name);
                                  }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <DeleteDialog
                                  title="Delete Category"
                                  description={`Are you sure you want to delete the category "${c.name}"? This action cannot be undone.`}
                                  onDelete={() => handleDeleteCategory(c.id)}
                                  isDeleting={isPending}
                                  trigger={
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-destructive opacity-80"
                                      disabled={isPending}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  }
                                />
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            onClick={openCreateEntry}
            className="h-9 w-9 sm:w-auto p-0 sm:px-3.5 gap-2"
            aria-label="Add Entry"
            title="Add Entry"
            disabled={isPending}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Add Entry</span>
          </Button>
        </div>
      </div>

      <Sheet open={entrySheetOpen} onOpenChange={setEntrySheetOpen}>
        <SheetContent className="flex flex-col h-full p-0 sm:max-w-md gap-0">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <SheetTitle>{editingEntry ? "Edit Entry" : "Add Entry"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Entry Name</Label>
                <Input
                  value={entryName}
                  onChange={(e) => setEntryName(e.target.value)}
                  placeholder="e.g. March Past First Prize"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1.5"
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                >
                  <option value="GENERAL">General</option>
                  <option value="PROGRAMME">Programme</option>
                </select>
              </div>

              {entryType === "PROGRAMME" && (
                <div>
                  <Label>Remarks</Label>
                  <Textarea
                    value={entryRemarks}
                    onChange={(e) => setEntryRemarks(e.target.value)}
                    placeholder="Enter remarks for this programme..."
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
              )}

              {entryType === "GENERAL" && (
                <div>
                  <Label>Category</Label>
                  <Popover
                    open={categoryComboboxOpen}
                    onOpenChange={setCategoryComboboxOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryComboboxOpen}
                        disabled={isPending || isCreatingCategory}
                        className="w-full justify-between mt-1.5 h-10 px-3 font-normal text-sm"
                      >
                        <span className="truncate">
                          {entryCategoryId === "none" || !entryCategoryId
                            ? "No Category"
                            : localCategories.find(
                                (c) => c.id === entryCategoryId,
                              )?.name || "Select category"}
                        </span>
                        {isCreatingCategory ? (
                          <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
                        ) : (
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder="Search or type to add category..."
                          value={categorySearch}
                          onValueChange={setCategorySearch}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.stopPropagation();
                              if (categorySearch.trim()) {
                                handleCreateOrSelectCategory(
                                  categorySearch.trim(),
                                );
                              }
                            }
                          }}
                        />
                        <CommandList>
                          <CommandEmpty className="p-2 text-center text-sm">
                            {categorySearch.trim() ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCreateOrSelectCategory(
                                    categorySearch.trim(),
                                  )
                                }
                                className="w-full flex items-center gap-2 p-2 text-sm text-left hover:bg-muted rounded-sm transition-colors text-primary font-medium"
                              >
                                <Plus className="w-4 h-4 shrink-0" />
                                <span className="truncate">
                                  Add &ldquo;{categorySearch.trim()}&rdquo;
                                </span>
                              </button>
                            ) : (
                              "No category found."
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none no category"
                              onSelect={() => {
                                setEntryCategoryId("none");
                                setCategorySearch("");
                                setCategoryComboboxOpen(false);
                              }}
                              className="flex items-center justify-between"
                            >
                              <span>No Category</span>
                              {entryCategoryId === "none" && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </CommandItem>
                            {localCategories.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.name}
                                onSelect={() => {
                                  setEntryCategoryId(c.id);
                                  setCategorySearch("");
                                  setCategoryComboboxOpen(false);
                                }}
                                className="flex items-center justify-between"
                              >
                                <span className="truncate">{c.name}</span>
                                {entryCategoryId === c.id && (
                                  <Check className="w-4 h-4 text-primary" />
                                )}
                              </CommandItem>
                            ))}
                            {categorySearch.trim() &&
                              !localCategories.some(
                                (c) =>
                                  c.name.toLowerCase() ===
                                  categorySearch.trim().toLowerCase(),
                              ) && (
                                <CommandItem
                                  value={`add-new-category-${categorySearch.trim()}`}
                                  onSelect={() =>
                                    handleCreateOrSelectCategory(
                                      categorySearch.trim(),
                                    )
                                  }
                                  className="text-primary font-medium flex items-center gap-2 cursor-pointer"
                                >
                                  <Plus className="w-4 h-4 shrink-0" />
                                  <span className="truncate">
                                    Add &ldquo;{categorySearch.trim()}&rdquo;
                                  </span>
                                </CommandItem>
                              )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="pt-2 border-t">
              <Label className="mb-3 block text-base">Points for Groups</Label>
              <div className="space-y-3">
                {entryAwards.map((award, i) => {
                  const group = groups.find((g) => g.id === award.groupId);
                  if (!group) return null;

                  return (
                    <div
                      key={award.groupId}
                      className="flex gap-3 items-center"
                    >
                      <div className="flex-1 text-sm font-medium bg-muted/40 p-2.5 rounded-md border text-foreground">
                        {group.name}
                      </div>
                      <Input
                        type="number"
                        placeholder="Points"
                        className="w-28 text-center"
                        value={award.points}
                        onChange={(e) => {
                          const newAwards = [...entryAwards];
                          newAwards[i].points = e.target.value;
                          setEntryAwards(newAwards);
                        }}
                      />
                    </div>
                  );
                })}
                {groups.length === 0 && (
                  <div className="text-sm text-muted-foreground italic border rounded-md p-4 bg-muted/30 text-center">
                    No groups found in this festival.
                  </div>
                )}
              </div>
            </div>
          </div>
          <SheetFooter className="p-4 sm:p-6 border-t shrink-0 bg-background flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !entryName.trim()}
              onClick={() => handleSaveEntry(false)}
              className="w-full sm:w-auto flex-1"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Draft
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={
                isPending ||
                !entryName.trim() ||
                !entryAwards.some(
                  (a) =>
                    a.points.trim() !== "" &&
                    !Number.isNaN(parseInt(a.points, 10)),
                )
              }
              onClick={() => handleSaveEntry(true)}
              className="w-full sm:w-auto flex-1"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              Publish
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={viewSheetOpen} onOpenChange={setViewSheetOpen}>
        <SheetContent className="flex flex-col h-full p-0 sm:max-w-md gap-0">
          {viewEntry && (
            <>
              <SheetHeader className="p-6 pb-4 border-b shrink-0">
                <SheetTitle className="text-xl">{viewEntry.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  {viewEntry.type === "GENERAL" && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {localCategories.find(
                        (c) => c.id === viewEntry.categoryId,
                      )?.name || "Uncategorized"}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs font-normal">
                    {viewEntry.type === "PROGRAMME" ? "Programme" : "General"}
                  </Badge>
                  {viewEntry.awards.some((a) => a.isPublished) ? (
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-600 border-0 text-xs"
                    >
                      <ShieldCheck className="w-3 h-3 mr-1" /> Published
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-600 border-0 text-xs"
                    >
                      <ShieldAlert className="w-3 h-3 mr-1" /> Draft
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {viewEntry.type === "PROGRAMME" && viewEntry.remarks && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-4 h-4" /> Remarks
                    </Label>
                    <div className="p-3 bg-muted/40 rounded-md border text-sm whitespace-pre-wrap">
                      {viewEntry.remarks}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Award className="w-4 h-4" /> Awarded Points
                  </Label>
                  <div className="space-y-2">
                    {viewEntry.awards.map((award) => {
                      const groupName = groups.find(
                        (g) => g.id === award.groupId,
                      )?.name;
                      const isNegative = award.points < 0;
                      return (
                        <div
                          key={award.id}
                          className="flex justify-between items-center p-2.5 border rounded-md"
                        >
                          <span className="font-medium text-sm">
                            {groupName}
                          </span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-sm text-sm ${isNegative ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"}`}
                          >
                            {renderPoints(award.points)}
                          </span>
                        </div>
                      );
                    })}
                    {viewEntry.awards.length === 0 && (
                      <div className="text-sm text-muted-foreground italic border border-dashed rounded p-4 text-center">
                        No awards assigned
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="p-4 sm:p-6 border-t shrink-0 bg-background flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto flex-1"
                  disabled={isPending}
                  onClick={() => openEditEntry(viewEntry)}
                >
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </Button>

                <Button
                  variant={
                    viewEntry.awards.some((a) => a.isPublished)
                      ? "destructive"
                      : "default"
                  }
                  className="w-full sm:w-auto flex-1"
                  disabled={isPending || viewEntry.awards.length === 0}
                  onClick={() =>
                    handlePublishEntry(
                      viewEntry.id,
                      viewEntry.awards.some((a) => a.isPublished),
                    )
                  }
                >
                  {viewEntry.awards.some((a) => a.isPublished)
                    ? "Unpublish"
                    : "Publish"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Points Awarded To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Award className="w-8 h-8 mb-2 opacity-20" />
                      <p>No general entries found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                entries
                  .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
                  .map((entry) => {
                    const isPublished = entry.awards.some((a) => a.isPublished);
                    const categoryName =
                      entry.type === "PROGRAMME"
                        ? "Programme"
                        : localCategories.find((c) => c.id === entry.categoryId)
                            ?.name || "Uncategorized";
                    const pointsCount = entry.awards.length;

                    return (
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => openViewEntry(entry)}
                      >
                        <TableCell className="font-medium">
                          {entry.name}
                        </TableCell>
                        <TableCell>{categoryName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-normal text-xs"
                          >
                            {entry.type === "PROGRAMME"
                              ? "Programme"
                              : "General"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pointsCount > 0 ? (
                            <span className="text-muted-foreground text-sm">
                              {pointsCount} group(s)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic opacity-60">
                              None
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isPublished ? (
                            <Badge
                              variant="secondary"
                              className="bg-green-500/10 text-green-600 border-0 shadow-none"
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" /> Published
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-amber-500/10 text-amber-600 border-0 shadow-none"
                            >
                              <ShieldAlert className="w-3 h-3 mr-1" /> Draft
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* biome-ignore lint/a11y/noStaticElementInteractions: row click handler on parent <TableRow>; this wrapper stops propagation so action buttons don't trigger the row view */}
                          <div
                            className="flex justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isPending}
                              onClick={() => openEditEntry(entry)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <DeleteDialog
                              title="Delete Entry"
                              description={`Are you sure you want to delete the entry "${entry.name}"? This action cannot be undone.`}
                              onDelete={() => handleDeleteEntry(entry.id)}
                              isDeleting={isPending}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  disabled={isPending || isPublished}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="block sm:hidden divide-y divide-border">
          {entries.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
              <Award className="w-8 h-8 mb-2 opacity-20" />
              <p>No general entries found.</p>
            </div>
          ) : (
            entries
              .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
              .map((entry) => {
                const isPublished = entry.awards.some((a) => a.isPublished);
                const categoryName =
                  entry.type === "PROGRAMME"
                    ? "Programme"
                    : localCategories.find((c) => c.id === entry.categoryId)
                        ?.name || "Uncategorized";
                const pointsCount = entry.awards.length;

                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: mobile-card variant of the row; keyboard equivalent is the row's activate button rendered below
                  <div
                    key={entry.id}
                    className="flex flex-col gap-3 p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => openViewEntry(entry)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0 gap-1">
                        <span className="font-semibold truncate">
                          {entry.name}
                        </span>
                        <div className="flex items-center flex-wrap gap-2 text-xs mt-0.5">
                          <span className="text-muted-foreground">
                            {categoryName}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                          <Badge
                            variant="outline"
                            className="font-normal text-[10px] px-1.5 h-4"
                          >
                            {entry.type === "PROGRAMME"
                              ? "Programme"
                              : "General"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0">
                        {isPublished ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-500/10 text-green-600 border-0 shadow-none px-2 h-5 text-[10px]"
                          >
                            Published
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/10 text-amber-600 border-0 shadow-none px-2 h-5 text-[10px]"
                          >
                            Draft
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/40">
                      <div className="text-xs">
                        {pointsCount > 0 ? (
                          <span className="text-muted-foreground font-medium">
                            {pointsCount} group(s) awarded
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic opacity-60">
                            No points awarded
                          </span>
                        )}
                      </div>

                      {/* biome-ignore lint/a11y/noStaticElementInteractions: mobile-card variant of the row; wrapping clickables so they don't trigger the card's open handler */}
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isPending}
                          onClick={() => openEditEntry(entry)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <DeleteDialog
                          title="Delete Entry"
                          description={`Are you sure you want to delete the entry "${entry.name}"? This action cannot be undone.`}
                          onDelete={() => handleDeleteEntry(entry.id)}
                          isDeleting={isPending}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              disabled={isPending || isPublished}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
      {entries.length > pageSize && (
        <DataTablePagination
          pageIndex={pageIndex}
          pageCount={Math.ceil(entries.length / pageSize)}
          onPageChange={(page) => setPageIndex(page)}
          className="mt-4"
        />
      )}
    </div>
  );
}
