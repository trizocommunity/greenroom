"use client";

import { useEditionDashboard } from "@/components/festival/dashboard/EditionDashboardContext";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
} from "@/components/festival/editions/pre-works/hooks";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CategoriesPage() {
  const { editionSlug } = useEditionDashboard(); // Assuming this context gives us slug.
  // Wait, hooks need editionId (UUID). Context usually gives slug.
  // I might need to fetch editionId or modifying context to provide it.
  // The layout fetches `activeEdition`. Standard pattern: Provide ID in context.
  // I will check `EditionDashboardContext` to see provided values.

  // Checking `layout.tsx` (Step 142):
  // <EditionDashboardProvider value={{ festivalSlug: ..., editionSlug: ..., editionName: ... }} >
  // It does NOT provide ID.
  // BUT `FestivalProvider` is also wrapped.
  // `const { activeEdition } = useFestival();` might work.

  return <CategoriesPageContent />;
}

import { useFestival } from "@/components/festival/FestivalContext";

function CategoriesPageContent() {
  const { activeEdition } = useFestival();
  const editionId = activeEdition?.id;

  const { data: categories, isLoading } = useCategories(editionId || "");
  const createMutation = useCreateCategory(editionId || "");
  const deleteMutation = useDeleteCategory(editionId || "");

  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleCreate = async () => {
    if (!newName) return;
    await createMutation.mutateAsync({ name: newName, description: newDesc });
    setIsOpen(false);
    setNewName("");
    setNewDesc("");
  };

  if (!editionId) return <div>Loading context...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage competition categories (e.g., General, Kiddies, Senior).
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescription>
                Create a new category for this edition.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Senior Boys"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional details"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Categories</CardTitle>
          <CardDescription>
            List of all categories in this edition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      No categories found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
                {categories?.map((cat: any) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{cat.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Are you sure?"))
                            deleteMutation.mutate(cat.id);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Guidance Note */}
      <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        💡 <strong>Tip:</strong> Create categories before adding programmes.
      </div>
    </div>
  );
}
