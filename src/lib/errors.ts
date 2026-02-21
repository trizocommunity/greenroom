import { Prisma } from "@prisma/client";
import { ZodError, type ZodIssue } from "zod";
import type { ActionResponse } from "@/types/actions";

export const ERROR_MESSAGES = {
  // ─── Generic ───────────────────────────────────────────────────────────────
  DEFAULT: "An unexpected error occurred. Please try again.",
  UNAUTHORIZED: "You must be logged in to perform this action.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION: "Please check your input and try again.",

  // ─── Auth ──────────────────────────────────────────────────────────────────
  INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
  ACCOUNT_INACTIVE: "Your account has been deactivated. Please contact support.",
  EMAIL_ALREADY_REGISTERED: "This email address is already registered.",
  INVALID_RESET_TOKEN: "This password reset link is invalid or has expired.",
  EMAIL_SEND_FAILED: "Failed to send the email. Please try again later.",

  // ─── Festival ─────────────────────────────────────────────────────────────
  FESTIVAL_NOT_FOUND: "Festival not found.",
  FESTIVAL_EXPIRED: "This festival has expired and can no longer be modified.",
  FESTIVAL_NOT_OWNER: "Only the festival owner can perform this action.",
  FESTIVAL_FROZEN: "This festival is currently frozen and cannot be modified.",
  FESTIVAL_SLUG_TAKEN: "This subdomain is already taken. Please choose another.",

  // ─── Payment ──────────────────────────────────────────────────────────────
  PAYMENT_INVALID: "The payment is invalid, unpaid, or has already been used.",
  PAYMENT_PURPOSE_MISMATCH: "Payment purpose does not match the selected plan.",
  PAYMENT_ALREADY_PROCESSED: "This payment has already been processed.",
  PAYMENT_SIGNATURE_INVALID: "Payment verification failed. Invalid signature.",
  TIER_NOT_FOUND: "The selected plan is invalid or currently unavailable.",

  // ─── Students ─────────────────────────────────────────────────────────────
  STUDENT_NOT_FOUND: "Student not found.",
  STUDENT_LIMIT_REACHED: "Student limit reached for your plan. Please upgrade to add more.",
  STUDENT_INVALID_GROUP: "The selected group does not belong to this festival.",
  STUDENT_INVALID_CATEGORY: "The selected category does not belong to this festival.",
  STUDENT_EMAIL_DUPLICATE: "A student with this email is already registered for this festival.",
  STUDENT_GROUP_MISSING: "Please select or create a group before adding students.",
  STUDENT_CATEGORY_MISSING: "Please select or create a category before adding students.",

  // ─── Groups ───────────────────────────────────────────────────────────────
  GROUP_NOT_FOUND: "Group not found.",
  GROUP_HAS_STUDENTS: "Cannot delete a group that still has students.",

  // ─── Categories ───────────────────────────────────────────────────────────
  CATEGORY_NOT_FOUND: "Category not found in this festival.",
  CATEGORY_LIMIT_REACHED: "Category limit reached for your plan.",
  CATEGORY_HAS_PROGRAMMES: "Cannot delete a category that has existing programmes.",
  CATEGORY_REQUIRED: "Please create at least one category before adding programmes.",

  // ─── Programmes ───────────────────────────────────────────────────────────
  PROGRAMME_NOT_FOUND: "Programme not found.",
  PROGRAMME_HAS_ASSIGNMENTS: "Cannot delete a programme that has existing assignments.",

  // ─── Assignments ──────────────────────────────────────────────────────────
  ASSIGNMENT_NOT_FOUND: "Assignment not found.",
  ASSIGNMENT_INVALID_FESTIVAL: "This assignment does not belong to the specified festival.",
  ASSIGNMENT_INVALID_PROGRAMME: "The selected programme does not belong to this festival.",
  ASSIGNMENT_INVALID_STUDENT: "The selected student does not belong to this festival.",
  ASSIGNMENT_REQUIRES_PARTICIPANT: "Either a student or a group must be specified.",
  ASSIGNMENT_CATEGORY_MISMATCH: "The student's category does not match the programme's category.",
  ASSIGNMENT_ALREADY_EXISTS: "This student is already assigned to this programme.",
  ASSIGNMENT_DEADLINE_PASSED: "The programme assignment deadline has passed.",
  ASSIGNMENT_DEPENDENCIES_MISSING: "Please create categories, groups, programmes, and students before making assignments.",
  ASSIGNMENT_DEADLINE_PASSED_ADMIN: "The deadline has passed.",

  // ─── Usage / Limits ───────────────────────────────────────────────────────
  USAGE_LIMIT_EXCEEDED: "Resource limit reached for your plan. Please upgrade to continue.",

  // ─── Members ──────────────────────────────────────────────────────────────
  MEMBER_ALREADY_EXISTS: "This user is already a member of this festival.",
  MEMBER_NOT_FOUND: "Team member not found.",

  // ─── Chest Numbers ────────────────────────────────────────────────────────
  CHEST_SETTINGS_NOT_CONFIGURED: "Chest number settings have not been configured yet.",

  // ─── Support ──────────────────────────────────────────────────────────────
  TICKET_NOT_FOUND: "Support ticket not found.",
  TICKET_ACCESS_DENIED: "You do not have access to this support ticket.",
  NOTIFICATION_NOT_FOUND: "Notification not found or already read.",
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
