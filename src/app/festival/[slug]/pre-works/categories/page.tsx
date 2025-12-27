"use client";

import { useFestival } from "@/components/festival/FestivalContext";
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
} from "@/hooks/useFestivalData";
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
  const festival = useFestival();
  const festivalId = festival.id;

  const { data: categories, isLoading } = useCategories(festivalId);
  const createMutation = useCreateCategory(festivalId);
  const deleteMutation = useDeleteCategory(festivalId);

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

  if (!festivalId) return <div>Loading...</div>;

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
                Create a new category for this festival.
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
            List of all categories in this festival.
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
                {categories?.map(
                  (cat: {
                    id: string;
                    name: string;
                    description?: string | null;
                  }) => (
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
                  ),
                )}
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
