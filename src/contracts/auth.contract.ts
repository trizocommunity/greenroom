import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { globalRoleSchema, userWithoutPasswordSchema } from "./shared-schemas";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const onboardingSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

const contract = initContract();

export const authContract = contract.router({
  login: {
    method: "POST",
    path: "/api/auth/login",
    body: loginSchema,
    responses: {
      200: z.object({ success: z.literal(true), role: globalRoleSchema }),
      401: z.object({ success: z.literal(false), error: z.string() }),
      429: z.object({ success: z.literal(false), error: z.string() }),
    },
    summary: "Login with email and password",
  },

  register: {
    method: "POST",
    path: "/api/auth/register",
    body: registerSchema,
    responses: {
      201: userWithoutPasswordSchema,
      409: z.object({ success: z.literal(false), error: z.string() }),
      429: z.object({ success: z.literal(false), error: z.string() }),
    },
    summary: "Register a new user",
  },

  logout: {
    method: "POST",
    path: "/api/auth/logout",
    body: null,
    responses: {
      200: z.object({ success: z.literal(true) }),
      401: z.object({ success: z.literal(false), error: z.string() }),
    },
    summary: "Logout current user",
  },

  me: {
    method: "GET",
    path: "/api/auth/me",
    responses: {
      200: userWithoutPasswordSchema,
      401: z.object({ success: z.literal(false), error: z.string() }),
    },
    summary: "Get current authenticated user",
  },

  forgotPassword: {
    method: "POST",
    path: "/api/auth/forgot-password",
    body: forgotPasswordSchema,
    responses: {
      200: z.object({ success: z.literal(true) }),
      429: z.object({ success: z.literal(false), error: z.string() }),
    },
    summary: "Request password reset email",
  },

  resetPassword: {
    method: "POST",
    path: "/api/auth/reset-password",
    body: resetPasswordSchema,
    responses: {
      200: z.object({ success: z.literal(true) }),
      400: z.object({ success: z.literal(false), error: z.string() }),
      429: z.object({ success: z.literal(false), error: z.string() }),
    },
    summary: "Reset password with token",
  },

  completeOnboarding: {
    method: "POST",
    path: "/api/auth/complete-onboarding",
    body: onboardingSchema,
    responses: {
      200: z.object({ success: z.literal(true) }),
      401: z.object({ success: z.literal(false), error: z.string() }),
    },
    summary: "Complete user onboarding",
  },
});

export type AuthContract = typeof authContract;
