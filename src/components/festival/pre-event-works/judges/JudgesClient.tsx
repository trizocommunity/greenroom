"use client";

import { Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { useJudges } from "@/features/judges/hooks/use-judges";

type JudgeRow = {
  id: string;
  name: string;
  description: string | null;
};

export function JudgesClient({
  festivalId,
  children,
}: {
  festivalId: string;
  children?: React.ReactNode;
}) {
  const { isReadOnly } = useFestivalReadOnly();
  const { judges, isLoading, createJudge, updateJudge, deleteJudge, isDeleting } =
    useJudges(festivalId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JudgeRow | null>(null);
  const [deleting, setDeleting] = useState<JudgeRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setFormOpen(true);
  };

  const openEdit = (row: JudgeRow) => {
    setEditing(row);
    setName(row.name);
    setDescription(row.description ?? "");
    setFormOpen(true);
  };

  const onSubmit = async () => {
    setIsSaving(true);
    try {
      if (editing) {
        await updateJudge({
          judgeId: editing.id,
          name,
          description: description || null,
        });
      } else {
        await createJudge({ name, description: description || null });
      }
      setFormOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        {children}
        <Button onClick={openCreate} disabled={isReadOnly}>
          <Plus className="h-4 w-4 mr-2" />
          Add Judge
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {judges.map((j) => (
          <div
            key={j.id}
            className="rounded-xl border bg-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{j.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {j.description || "No description"}
                </p>
              </div>
              {!isReadOnly ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => openEdit(j as JudgeRow)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setDeleting(j as JudgeRow)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {judges.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No judges created yet.
        </div>
      ) : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Judge" : "Create Judge"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Judge name"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!name.trim() || isSaving}>
              {isSaving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleting ? (
        <DeleteDialog
          title="Delete Judge"
          description="This judge will be removed from future judgment configurations."
          open={true}
          onOpenChange={(open) => !open && setDeleting(null)}
          onDelete={async () => {
            await deleteJudge(deleting.id);
            setDeleting(null);
          }}
          isDeleting={isDeleting}
        />
      ) : null}
    </div>
  );
}

