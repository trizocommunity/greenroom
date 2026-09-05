"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { upsertFoodSlotsAction } from "../actions/food-entry.actions";
import { upsertFoodSlotsSchema } from "../schemas/food-entry.schema";

interface FoodEntryConfigProps {
  festivalId: string;
  initialSlots: any[];
  onSaved?: () => void;
  onCancel?: () => void;
}

export function FoodEntryConfig({
  festivalId,
  initialSlots,
  onSaved,
  onCancel,
}: FoodEntryConfigProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof upsertFoodSlotsSchema>>({
    resolver: zodResolver(upsertFoodSlotsSchema),
    defaultValues: {
      festivalId,
      slots: initialSlots.length > 0 ? initialSlots : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "slots",
  });

  const onSubmit = (data: z.infer<typeof upsertFoodSlotsSchema>) => {
    startTransition(async () => {
      try {
        const result = await upsertFoodSlotsAction(data);
        if (result.success) {
          toast.success("Food slots updated successfully.");
          router.refresh();
          onSaved?.();
        } else {
          toast.error("Failed to update food slots.");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to update food slots.");
      }
    });
  };

  const formatMinToTime = (min: number) => {
    const h = Math.floor(min / 60)
      .toString()
      .padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const parseTimeToMin = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return 0;
    return h * 60 + m;
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] overflow-hidden">
      {/* Header: heading only, no description, and the new session button */}
      <DrawerHeader className="shrink-0 text-left items-start !text-left p-0 pb-3 border-b">
        <div className="flex items-center justify-between w-full gap-2">
          <DrawerTitle className="text-lg font-bold">
            Food Sessions Configuration
          </DrawerTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() =>
              append({
                id: crypto.randomUUID(),
                name: "",
                slotOrder: fields.length + 1,
                windowStartMin: 0,
                windowEndMin: 60,
              })
            }
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Session
          </Button>
        </div>
      </DrawerHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          {/* Scrollable list keeping the old row state */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-12 gap-2 items-end border p-2 rounded-md"
              >
                <FormField
                  control={form.control}
                  name={`slots.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="col-span-12 sm:col-span-5">
                      <FormControl>
                        <Input
                          placeholder="Session name"
                          className="h-9 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`slots.${index}.windowStartMin`}
                  render={({ field }) => (
                    <FormItem className="col-span-5 sm:col-span-3">
                      <FormControl>
                        <Input
                          type="time"
                          className="h-9 text-sm"
                          value={formatMinToTime(field.value)}
                          onChange={(e) =>
                            field.onChange(parseTimeToMin(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`slots.${index}.windowEndMin`}
                  render={({ field }) => (
                    <FormItem className="col-span-5 sm:col-span-3">
                      <FormControl>
                        <Input
                          type="time"
                          className="h-9 text-sm"
                          value={formatMinToTime(field.value)}
                          onChange={(e) =>
                            field.onChange(parseTimeToMin(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {form.formState.errors.slots?.root?.message && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.slots.root.message}
              </p>
            )}
          </div>

          {/* Drawer Footer: Save Configuration button */}
          <DrawerFooter className="border-t pt-3 px-0 flex flex-row items-center justify-end gap-2 shrink-0">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-9 min-w-[140px]"
            >
              {isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </DrawerFooter>
        </form>
      </Form>
    </div>
  );
}
