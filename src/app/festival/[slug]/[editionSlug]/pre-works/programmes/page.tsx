"use client";

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
  useProgrammes,
  useCreateProgramme,
  useDeleteProgramme,
  useCategories,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFestival } from "@/components/festival/FestivalContext";

export default function ProgrammesPage() {
  const { activeEdition } = useFestival();
  const editionId = activeEdition?.id;

  const { data: programmes, isLoading } = useProgrammes(editionId || "");
  const { data: categories } = useCategories(editionId || "");

  const createMutation = useCreateProgramme(editionId || "");
  const deleteMutation = useDeleteProgramme(editionId || "");

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    type: "INDIVIDUAL",
    stageType: "STAGE",
    maxEntries: 1,
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.categoryId) return;
    await createMutation.mutateAsync({
      ...formData,
      maxEntries: Number(formData.maxEntries),
    });
    setIsOpen(false);
    setFormData({
      name: "",
      categoryId: "",
      type: "INDIVIDUAL",
      stageType: "STAGE",
      maxEntries: 1,
    });
  };

  if (!editionId) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programmes</h1>
          <p className="text-muted-foreground">
            Manage competition items (e.g., Mappilappattu, Oppana).
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Add Programme</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Programme</DialogTitle>
              <DialogDescription>
                Create a new programme. Category is required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, categoryId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Solo Song"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) =>
                      setFormData({ ...formData, type: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                      <SelectItem value="GROUP">Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stage">Stage Type</Label>
                  <Select
                    value={formData.stageType}
                    onValueChange={(val) =>
                      setFormData({ ...formData, stageType: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAGE">Stage Event</SelectItem>
                      <SelectItem value="NON_STAGE">Non-Stage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          <CardTitle>Existing Programmes</CardTitle>
          <CardDescription>
            List of programmes grouped by category.
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
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programmes?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      No programmes found.
                    </TableCell>
                  </TableRow>
                )}
                {programmes?.map((prog: any) => (
                  <TableRow key={prog.id}>
                    <TableCell className="font-medium">{prog.name}</TableCell>
                    <TableCell>{prog.category?.name}</TableCell>
                    <TableCell>
                      {prog.type} / {prog.stageType}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Are you sure?"))
                            deleteMutation.mutate(prog.id);
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

      <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        💡 <strong>Tip:</strong> Programmes are required for Participant
        Assignment.
      </div>
    </div>
  );
}
