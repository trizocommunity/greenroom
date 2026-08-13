"use client";

import {
  AlertCircle,
  Award,
  Check,
  FileText,
  Grid2X2,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        await createGeneralEntryCategoryAction({
          festivalId,
          name: newCategoryName.trim(),
        });
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
          toast.success("Category deleted");
        } catch (err: any) {
          toast.error(err.message || "Failed to delete category");
        }
        resolve();
      });
    });
  }

  function openCreateEntry() {
    setEditingEntry(null);
    setEntryName("");
    setEntryCategoryId("none");
    setEntryType("GENERAL");
    setEntryRemarks("");
    setEntryAwards(groups.map((g) => ({ groupId: g.id, points: "" })));
    setEntrySheetOpen(true);
  }

  function openEditEntry(entry: Entry) {
    setEditingEntry(entry);
    setEntryName(entry.name);
    setEntryCategoryId(entry.categoryId || "none");
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

  function handleSaveEntry() {
    if (!entryName.trim()) return;
    const validAwards = entryAwards
      .filter((a) => a.points.trim() !== "" && !isNaN(parseInt(a.points)))
      .map((a) => ({ groupId: a.groupId, points: parseInt(a.points) }));

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
          });
          toast.success("Entry updated successfully");
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
          });
          toast.success("Entry created successfully");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            General Entries
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage general point awards for non-stage competitions like March
            Past, Band, Magazine etc.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Grid2X2 className="w-4 h-4" />
                Browse Categories
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Categories</SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-6">
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
                  {categories.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic border rounded-md p-4 bg-muted/30">
                      No categories found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((c) => (
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
                                disabled={isPending}
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
            className="gap-2"
            disabled={isPending}
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </div>
      </div>

      <Sheet open={entrySheetOpen} onOpenChange={setEntrySheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingEntry ? "Edit Entry" : "Create Entry"}
            </SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-6">
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
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1.5"
                    value={entryCategoryId}
                    onChange={(e) => setEntryCategoryId(e.target.value)}
                  >
                    <option value="none">No Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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
          <SheetFooter className="mt-2">
            <Button
              disabled={isPending || !entryName.trim()}
              onClick={handleSaveEntry}
              className="w-full"
            >
              {editingEntry ? "Save Changes" : "Create Entry"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={viewSheetOpen} onOpenChange={setViewSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {viewEntry && (
            <>
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="text-xl">{viewEntry.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  {viewEntry.type === "GENERAL" && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {categories.find((c) => c.id === viewEntry.categoryId)
                        ?.name || "Uncategorized"}
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

              <div className="py-6 space-y-6">
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

              <SheetFooter className="flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 mt-auto pt-6 border-t">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto flex-1"
                  disabled={
                    isPending || viewEntry.awards.some((a) => a.isPublished)
                  }
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
                        : categories.find((c) => c.id === entry.categoryId)
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
                          <div
                            className="flex justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isPending || isPublished}
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
                    : categories.find((c) => c.id === entry.categoryId)?.name ||
                      "Uncategorized";
                const pointsCount = entry.awards.length;

                return (
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

                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isPending || isPublished}
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
