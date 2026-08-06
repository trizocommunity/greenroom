import { z } from "zod";

export const foodSlotSchema = z.object({
  id: z.string().optional(), // Optional for new slots
  slotOrder: z.number().int().min(1),
  name: z.string().min(1, "Name is required").max(50),
  windowStartMin: z.number().int().min(0).max(1439), // 0 to 23:59
  windowEndMin: z.number().int().min(1).max(1440),
});

export const upsertFoodSlotsSchema = z.object({
  festivalId: z.string().uuid(),
  slots: z.array(foodSlotSchema).min(1, "At least one slot is required"),
}).refine(
  (data) => {
    // Validate that no slots overlap and start < end
    for (const slot of data.slots) {
      if (slot.windowStartMin >= slot.windowEndMin) {
        return false;
      }
    }
    // Check overlaps
    const sorted = [...data.slots].sort((a, b) => a.windowStartMin - b.windowStartMin);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].windowEndMin > sorted[i + 1].windowStartMin) {
        return false;
      }
    }
    return true;
  },
  { message: "Slots cannot overlap and start time must be before end time." }
);

export type UpsertFoodSlotsInput = z.infer<typeof upsertFoodSlotsSchema>;
export type FoodSlotInput = z.infer<typeof foodSlotSchema>;

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
