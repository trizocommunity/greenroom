"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createStage,
  updateStage,
} from "@/features/stages/actions/stage.actions";

const StageSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  description: z.string().optional(),
});

type StageFormValues = z.infer<typeof StageSchema>;

interface StageDialogProps {
  festivalId: string;
  stageToEdit?: any; // or typed Stage
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StageDialog({
  festivalId,
  stageToEdit,
  open,
  onOpenChange,
  onSuccess,
}: StageDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(StageSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (stageToEdit) {
        form.reset({
          name: stageToEdit.name,
          description: stageToEdit.description || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
        });
      }
      form.trigger();
    }
  }, [open, stageToEdit, form]);

  const onSubmit = async (data: StageFormValues) => {
    try {
      setIsLoading(true);
      if (stageToEdit) {
        await updateStage(stageToEdit.id, data);
        toast.success("Stage updated successfully");
      } else {
        await createStage(festivalId, data);
        toast.success("Stage created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const message = error.message || "Failed to save stage";
      if (message.toLowerCase().includes("already exists")) {
        form.setError("name", { message });
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {stageToEdit ? "Edit Stage" : "Create Stage"}
          </DialogTitle>
          <DialogDescription>
            {stageToEdit
              ? "Update the details of the stage."
              : "Add a new stage for the festival."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Stage Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Main Auditorium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Located effectively near the entrance..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {stageToEdit ? "Update Stage" : "Create Stage"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
