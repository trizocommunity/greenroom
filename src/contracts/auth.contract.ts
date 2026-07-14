import { initContract } from "@ts-rest/core";
import { z } from "zod";

const onboardingSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

const contract = initContract();

export const authContract = contract.router({
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
      200: z.any(),
      401: z.object({ success: z.literal(false), error: z.string() }),
    },
    summary: "Get current authenticated user",
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
