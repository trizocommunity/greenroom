"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useMembers } from "@/api/client/members";
import { useAssignStageManager } from "@/api/client/stage-assignments";
import { useCreateStage, useUpdateStage } from "@/api/client/stages";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

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
  const assignManager = useAssignStageManager();
  const { data: members = [] } = useMembers(festivalId);
  const stageManagers = members.filter(
    (m) => m.role === "STAGE_MANAGER" && m.isActive,
  );
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
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
        setSelectedManagerIds([]);
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
        const newStage = await createStage.mutateAsync({ festivalId, data });
        if (selectedManagerIds.length > 0) {
          await Promise.all(
            selectedManagerIds.map((memberId) =>
              assignManager.mutateAsync({
                festivalId,
                data: { stageId: newStage.id, memberId },
              }),
            ),
          );
        }
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

              {!stageToEdit && stageManagers.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign to Stage Managers (Optional)</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {stageManagers.map((manager) => {
                      const checked = selectedManagerIds.includes(manager.id);
                      return (
                        <div
                          key={manager.id}
                          className="flex items-center gap-2 rounded-md border px-3 py-2"
                        >
                          <Checkbox
                            id={`stage-create-manager-${manager.id}`}
                            checked={checked}
                            onCheckedChange={(next) =>
                              setSelectedManagerIds((prev) =>
                                next === true
                                  ? [...prev, manager.id]
                                  : prev.filter((id) => id !== manager.id),
                              )
                            }
                          />
                          <Label
                            htmlFor={`stage-create-manager-${manager.id}`}
                            className="flex flex-col cursor-pointer min-w-0"
                          >
                            <span className="font-medium truncate">
                              {manager.fullName}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {manager.email}
                            </span>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
