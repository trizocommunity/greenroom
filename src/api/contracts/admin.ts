import { z } from "zod";

export const updateUserInput = z.object({
  id: z.string(),
  fullName: z.string().optional(),
  displayName: z.string().optional(),
  globalRole: z.enum(["USER", "SUPER_ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  globalRole: z.enum(["USER", "SUPER_ADMIN"]),
  fullName: z.string().nullable(),
  displayName: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adminPaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.string(),
  razorpayOrderId: z.string(),
  createdAt: z.string(),
  user: userSchema,
  festival: z.null(),
});

export const adminAnalyticsSchema = z.object({
  purchases: z.array(
    z.object({
      period: z.string(),
      count: z.number(),
      revenue: z.number(),
    }),
  ),
  logins: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    }),
  ),
  topCategories: z.array(
    z.object({
      categoryName: z.string(),
      count: z.number(),
    }),
  ),
  loginsByDay: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    }),
  ),
  revenueByDay: z.array(
    z.object({
      date: z.string(),
      amount: z.number(),
    }),
  ),
});

export type UpdateUserInput = z.infer<typeof updateUserInput>;
export type UserRecord = z.infer<typeof userSchema>;
export type AdminPayment = z.infer<typeof adminPaymentSchema>;
export type AdminAnalytics = z.infer<typeof adminAnalyticsSchema>;
