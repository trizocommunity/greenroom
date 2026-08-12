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
}

export function FoodEntryConfig({
  festivalId,
  initialSlots,
  onSaved,
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
    <div className="space-y-3">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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
                        className="h-9"
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
                        className="h-9"
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
                        className="h-9"
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
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
            <Plus className="w-4 h-4 mr-2" />
            Add Session
          </Button>

          {form.formState.errors.slots?.root?.message && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.slots.root.message}
            </p>
          )}

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={isPending} className="h-9">
              {isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
