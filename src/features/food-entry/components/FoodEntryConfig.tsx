"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { upsertFoodSlotsSchema } from "../schemas/food-entry.schema";
import { upsertFoodSlotsAction } from "../actions/food-entry.actions";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2 } from "lucide-react";

interface FoodEntryConfigProps {
  festivalId: string;
  initialSlots: any[];
}

export function FoodEntryConfig({ festivalId, initialSlots }: FoodEntryConfigProps) {
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<z.infer<typeof upsertFoodSlotsSchema>>({
    resolver: zodResolver(upsertFoodSlotsSchema),
    defaultValues: {
      festivalId,
      slots: initialSlots.length > 0 ? initialSlots : [
        { id: crypto.randomUUID(), name: "Breakfast", slotOrder: 1, windowStartMin: 420, windowEndMin: 600 },
        { id: crypto.randomUUID(), name: "Lunch", slotOrder: 2, windowStartMin: 720, windowEndMin: 900 },
        { id: crypto.randomUUID(), name: "Dinner", slotOrder: 3, windowStartMin: 1140, windowEndMin: 1320 },
      ],
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
        } else {
          toast.error("Failed to update food slots.");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to update food slots.");
      }
    });
  };

  const formatMinToTime = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const parseTimeToMin = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h * 60) + (m || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Food Sessions Configuration</CardTitle>
        <CardDescription>
          Define the daily food sessions and their active time windows. Time windows are evaluated against the festival's timezone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col md:flex-row gap-4 items-end border p-4 rounded-md">
                <FormField
                  control={form.control}
                  name={`slots.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Session Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Breakfast" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name={`slots.${index}.windowStartMin`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          value={formatMinToTime(field.value)} 
                          onChange={(e) => field.onChange(parseTimeToMin(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`slots.${index}.windowEndMin`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          value={formatMinToTime(field.value)} 
                          onChange={(e) => field.onChange(parseTimeToMin(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ id: crypto.randomUUID(), name: "New Session", slotOrder: fields.length + 1, windowStartMin: 0, windowEndMin: 60 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Session
            </Button>

            {form.formState.errors.slots?.root?.message && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.slots.root.message}</p>
            )}

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
