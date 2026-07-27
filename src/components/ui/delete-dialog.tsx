"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogAction,
  ResponsiveDialogCancel,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";

interface DeleteDialogProps {
  title?: string;
  description?: string;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteDialog({
  title = "Are you sure?",
  description = "This action cannot be undone.",
  onDelete,
  isDeleting,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: DeleteDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  const handleDelete = async () => {
    await onDelete();
    setOpen(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <ResponsiveDialogTrigger asChild>
          {trigger ?? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </ResponsiveDialogTrigger>
      )}
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ResponsiveDialogCancel disabled={isDeleting}>
            Cancel
          </ResponsiveDialogCancel>
          <ResponsiveDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </ResponsiveDialogAction>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
