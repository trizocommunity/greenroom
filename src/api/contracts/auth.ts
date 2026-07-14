import { z } from "zod";

export const onboardingInput = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

export const completeOnboardingResponse = z.object({});

export type OnboardingInput = z.infer<typeof onboardingInput>;
export type CompleteOnboardingResponse = z.infer<typeof completeOnboardingResponse>;
