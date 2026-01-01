import { Prisma } from "@prisma/client";
import { ZodError, type ZodIssue } from "zod";
import type { ActionResponse } from "@/types/actions";

export const ERROR_MESSAGES = {
  DEFAULT: "An unexpected error occurred. Please try again.",
  UNAUTHORIZED: "You must be logged in to perform this action.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION: "Please check your input and try again.",
};

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "APP_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleActionError(error: unknown): ActionResponse<never> {
  console.error("[ActionError]", error);

  // 1. Handle Zod Validation Errors
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    // Ensure we handle the errors array correctly
    const issues = error.issues;
    issues.forEach((err: ZodIssue) => {
      if (err.path.length > 0) {
        fields[err.path[0].toString()] = err.message;
      }
    });
    return {
      success: false,
      error: ERROR_MESSAGES.VALIDATION,
      fields,
    };
  }

  // 2. Handle Prisma Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[]) || ["field"];
      const field = target[0] || "field";
      return {
        success: false,
        error: `This ${field} is already taken.`,
        fields: {
          [field]: `This ${field} is already taken.`,
        },
      };
    }
  }

  // 3. Handle App Errors (Custom thrown errors)
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
    };
  }

  // 4. Handle Standard Errors
  if (error instanceof Error) {
    // Only return the message if it's safe (e.g. not a system error)
    if (
      error.message.includes("database") ||
      error.message.includes("connect") ||
      error.message.includes("prisma")
    ) {
      return {
        success: false,
        error: ERROR_MESSAGES.DEFAULT,
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }

  // 5. Fallback
  return {
    success: false,
    error: ERROR_MESSAGES.DEFAULT,
  };
}
