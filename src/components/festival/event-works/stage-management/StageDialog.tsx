"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useCreateStage, useUpdateStage } from "@/api/client/stages";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const isLoading = createStage.isPending || updateStage.isPending;

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
      if (stageToEdit) {
        await updateStage.mutateAsync({
          festivalId,
          stageId: stageToEdit.id,
          data,
        });
        toast.success("Stage updated successfully");
      } else {
        await createStage.mutateAsync({ festivalId, data });
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
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {stageToEdit ? "Edit Stage" : "Create Stage"}
          </DrawerTitle>
          <DrawerDescription>
            {stageToEdit
              ? "Update the details of the stage."
              : "Add a new stage for the festival."}
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 sm:space-y-4 py-1">
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
            </div>

            <DrawerFooter>
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
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
