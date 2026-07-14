import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  globalRole: z.enum(["USER", "SUPER_ADMIN"]),
  fullName: z.string().nullable(),
  displayName: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const loginInput = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
});

export const registerInput = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const forgotPasswordInput = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordInput = z
  .object({
    token: z.string(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const onboardingInput = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

export const loginResponse = z.object({
  role: z.enum(["USER", "SUPER_ADMIN"]),
});

export const logoutResponse = z.object({});

export const forgotPasswordResponse = z.object({});

export const resetPasswordResponse = z.object({});

export const completeOnboardingResponse = z.object({});

export type LoginInput = z.infer<typeof loginInput>;
export type RegisterInput = z.infer<typeof registerInput>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInput>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInput>;
export type OnboardingInput = z.infer<typeof onboardingInput>;
export type LoginResponse = z.infer<typeof loginResponse>;
export type LogoutResponse = z.infer<typeof logoutResponse>;
export type ForgotPasswordResponse = z.infer<typeof forgotPasswordResponse>;
export type ResetPasswordResponse = z.infer<typeof resetPasswordResponse>;
export type CompleteOnboardingResponse = z.infer<
  typeof completeOnboardingResponse
>;
