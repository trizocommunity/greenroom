"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useGroups } from "@/features/groups/hooks/use-groups";

const GroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
});

type GroupFormValues = z.infer<typeof GroupSchema>;

interface GroupDialogProps {
  festivalId: string;
  group?: any;
  trigger?: React.ReactNode;
  readOnly?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#84cc16", // Lime
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
];

export function GroupDialog({
  festivalId,
  group,
  trigger,
  readOnly,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: GroupDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;
  const { createGroup, isCreating, updateGroup, isUpdating } =
    useGroups(festivalId);

  const isEditing = !!group;
  const isLoading = isCreating || isUpdating;

  const form = useForm({
    resolver: zodResolver(GroupSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      color: "#2563eb",
    },
  });

  useEffect(() => {
    if (open) {
      if (group) {
        form.reset({
          name: group.name || "",
          color: group.color || "#2563eb",
        });
      } else {
        const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        form.reset({
          name: "",
          color: randomColor,
        });
      }
      form.trigger();
    }
  }, [open, group, form]);

  const onSubmit = async (data: GroupFormValues) => {
    try {
      if (isEditing && group) {
        await updateGroup({
          id: group.id,
          data,
        });
      } else {
        await createGroup(data);
      }
      setOpen(false);
    } catch (error: any) {
      const message = error.message || "An error occurred";
      if (message.toLowerCase().includes("already exists")) {
        form.setError("name", { message });
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? "Group Details"
              : isEditing
                ? "Edit Group"
                : "Create Group"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "View group details."
              : isEditing
                ? "Update group details."
                : "Add a new group (School/College)."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Model School"
                      disabled={readOnly || isLoading}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Color</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        disabled={readOnly || isLoading}
                        onClick={() => field.onChange(c)}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          field.value === c
                            ? "border-primary scale-110 shadow-sm"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Select color ${c}`}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                {readOnly ? "Close" : "Cancel"}
              </Button>
              {!readOnly && (
                <Button
                  type="submit"
                  disabled={!form.formState.isValid || isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Save Changes" : "Create"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
