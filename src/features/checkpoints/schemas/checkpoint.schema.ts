import { z } from "zod";

/**
 * Checkpoints generalise the old Food Hall entry into named scan points
 * (Attendance, Food, …). A checkpoint owns many sessions; each session is one
 * open scanning window on a date; each scan is one participant check-in.
 */

export const createCheckpointSchema = z.object({
  festivalId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(50),
  // Food-style checkpoints require an explicit start/end window; attendance
  // captures the window when the session is started.
  requiresWindow: z.boolean().default(false),
});

export type CreateCheckpointInput = z.infer<typeof createCheckpointSchema>;

export const updateCheckpointSchema = z.object({
  festivalId: z.string().uuid(),
  checkpointId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(50),
  requiresWindow: z.boolean().default(false),
});

export type UpdateCheckpointInput = z.infer<typeof updateCheckpointSchema>;

export const deleteCheckpointSchema = z.object({
  festivalId: z.string().uuid(),
  checkpointId: z.string().uuid(),
});

export type DeleteCheckpointInput = z.infer<typeof deleteCheckpointSchema>;

export const startSessionSchema = z
  .object({
    festivalId: z.string().uuid(),
    checkpointId: z.string().uuid(),
    name: z.string().max(80).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    windowStartMin: z.number().int().min(0).max(1439).nullish(),
    windowEndMin: z.number().int().min(1).max(1440).nullish(),
  })
  .superRefine((data, ctx) => {
    if (
      data.windowStartMin != null &&
      data.windowEndMin != null &&
      data.windowStartMin >= data.windowEndMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["windowEndMin"],
        message: "End time must be after start time.",
      });
    }
  });

export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const scanCheckpointSchema = z.object({
  festivalId: z.string().uuid(),
  sessionId: z.string().uuid(),
  chestNumber: z.string().min(1, "Chest number is required").max(50),
});

export type ScanCheckpointInput = z.infer<typeof scanCheckpointSchema>;

const scanFiltersSchema = z.object({
  sessionId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export const getSessionScansSchema = scanFiltersSchema;
export type GetSessionScansInput = z.infer<typeof getSessionScansSchema>;

export const getRosterSchema = z.object({
  festivalId: z.string().uuid(),
  sessionId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export type GetRosterInput = z.infer<typeof getRosterSchema>;

export const toggleSessionStatusSchema = z.object({
  festivalId: z.string().uuid(),
  sessionId: z.string().uuid(),
  status: z.enum(["OPEN", "CLOSED"]),
});

export type ToggleSessionStatusInput = z.infer<
  typeof toggleSessionStatusSchema
>;

export const getSessionStatusSchema = z.object({
  festivalId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export type GetSessionStatusInput = z.infer<typeof getSessionStatusSchema>;

export const deleteSessionSchema = z.object({
  festivalId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export type DeleteSessionInput = z.infer<typeof deleteSessionSchema>;
