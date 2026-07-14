import { z } from "zod";

export const notificationSchema = z.object({
  id: z.string(),
  recipientStudentId: z.string(),
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  type: z.string().nullable(),
  createdAt: z.string(),
});

export const markReadInput = z.object({
  studentId: z.string(),
  notificationId: z.string(),
});

export const markAllReadInput = z.object({
  studentId: z.string(),
});

export type Notification = z.infer<typeof notificationSchema>;
export type MarkReadInput = z.infer<typeof markReadInput>;
export type MarkAllReadInput = z.infer<typeof markAllReadInput>;
