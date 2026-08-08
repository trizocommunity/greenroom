import { z } from "zod";

export const foodSlotSchema = z.object({
  id: z.string().optional(), // Optional for new slots
  slotOrder: z.number().int().min(1),
  name: z.string().min(1, "Name is required").max(50),
  windowStartMin: z.number().int().min(0).max(1439), // 0 to 23:59
  windowEndMin: z.number().int().min(1).max(1440),
});

export const upsertFoodSlotsSchema = z
  .object({
    festivalId: z.string().uuid(),
    slots: z.array(foodSlotSchema).min(1, "At least one slot is required"),
  })
  .superRefine((data, ctx) => {
    for (let i = 0; i < data.slots.length; i++) {
      const slot = data.slots[i];
      if (slot.windowStartMin >= slot.windowEndMin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slots", i, "windowEndMin"],
          message: "End time must be after start time.",
        });
      }
    }

    const sorted = [...data.slots].sort(
      (a, b) => a.windowStartMin - b.windowStartMin,
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].windowEndMin > sorted[i + 1].windowStartMin) {
        const current = sorted[i];
        const next = sorted[i + 1];
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slots"],
          message: `Session "${current.name}" overlaps with "${next.name}".`,
        });
      }
    }
  });

export type UpsertFoodSlotsInput = z.infer<typeof upsertFoodSlotsSchema>;
export type FoodSlotInput = z.infer<typeof foodSlotSchema>;

const foodEntryFiltersSchema = z.object({
  festivalId: z.string().uuid(),
  slotId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export const getFilteredEntriesSchema = foodEntryFiltersSchema;

export type GetFilteredEntriesInput = z.infer<typeof getFilteredEntriesSchema>;

export const scanFoodEntrySchema = z.object({
  festivalId: z.string().uuid(),
  sessionId: z.string().uuid(),
  chestNumber: z.string().min(1, "Chest number is required").max(50),
});

export type ScanFoodEntryInput = z.infer<typeof scanFoodEntrySchema>;

export const closeFoodSessionSchema = z.object({
  festivalId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export type CloseFoodSessionInput = z.infer<typeof closeFoodSessionSchema>;
