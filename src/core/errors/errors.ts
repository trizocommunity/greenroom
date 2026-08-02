import { ZodError, type ZodIssue } from "zod";
import type { ActionResponse } from "@/core/types/actions";

export const ERROR_MESSAGES = {
  // ─── Generic ───────────────────────────────────────────────────────────────
  DEFAULT: "An unexpected error occurred. Please try again.",
  UNAUTHORIZED: "You must be logged in to perform this action.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION: "Please check your input and try again.",

  // ─── Auth ──────────────────────────────────────────────────────────────────
  ACCOUNT_INACTIVE:
    "Your account has been deactivated. Please contact support.",
  EMAIL_ALREADY_REGISTERED: "This email address is already registered.",
  EMAIL_SEND_FAILED: "Failed to send the email. Please try again later.",

  // ─── Festival ─────────────────────────────────────────────────────────────
  FESTIVAL_NOT_FOUND: "Festival not found.",
  FESTIVAL_EXPIRED: "This festival has expired and can no longer be modified.",
  FESTIVAL_PAST_READONLY:
    "This festival is in Past read-only mode. Editing is disabled except updating start and end dates.",
  FESTIVAL_NOT_OWNER: "Only the festival owner can perform this action.",
  FESTIVAL_FROZEN: "This festival is currently frozen and cannot be modified.",
  FESTIVAL_SLUG_TAKEN:
    "This subdomain is already taken. Please choose another.",

  // ─── Payment ──────────────────────────────────────────────────────────────
  PAYMENT_INVALID: "The payment is invalid, unpaid, or has already been used.",
  PAYMENT_PURPOSE_MISMATCH: "Payment purpose does not match the selected plan.",
  PAYMENT_ALREADY_PROCESSED: "This payment has already been processed.",
  PAYMENT_SIGNATURE_INVALID: "Payment verification failed. Invalid signature.",
  TIER_NOT_FOUND: "The selected plan is invalid or currently unavailable.",

  // ─── Participants ─────────────────────────────────────────────────────────────
  PARTICIPANT_NOT_FOUND: "Participant not found.",
  PARTICIPANT_LIMIT_REACHED:
    "Participant limit reached for your plan. Please upgrade to add more.",
  PARTICIPANT_INVALID_GROUP:
    "The selected group does not belong to this festival.",
  PARTICIPANT_INVALID_CATEGORY:
    "The selected category does not belong to this festival.",
  PARTICIPANT_INVALID_DOB: "The date of birth you entered does not match.",
  PARTICIPANT_EMAIL_DUPLICATE:
    "A participant with this email is already registered for this festival.",
  PARTICIPANT_NAME_DUPLICATE:
    "A participant with this name already exists in this festival.",
  PARTICIPANT_GROUP_MISSING:
    "Please select or create a group before adding participants.",
  PARTICIPANT_CATEGORY_MISSING:
    "Please select or create a category before adding participants.",

  // ─── Groups ───────────────────────────────────────────────────────────────
  GROUP_NOT_FOUND: "Group not found.",
  GROUP_HAS_PARTICIPANTS: "Cannot delete a group that still has participants.",

  // ─── Categories ───────────────────────────────────────────────────────────
  CATEGORY_NOT_FOUND: "Category not found in this festival.",
  CATEGORY_LIMIT_REACHED: "Category limit reached for your plan.",
  CATEGORY_HAS_PROGRAMMES:
    "Cannot delete a category that has existing programmes.",
  CATEGORY_REQUIRED:
    "Please create at least one category before adding programmes.",

  // ─── Programmes ───────────────────────────────────────────────────────────
  PROGRAMME_NOT_FOUND: "Programme not found.",
  PROGRAMME_HAS_ASSIGNMENTS:
    "Cannot delete a programme that has existing assignments.",

  // ─── Judges ───────────────────────────────────────────────────────────────
  JUDGE_NAME_REQUIRED: "Judge name is required.",
  JUDGE_NAME_DUPLICATE: "Judge name already exists. Please use a unique name.",
  JUDGE_NOT_FOUND: "Judge not found.",

  // ─── Assignments ──────────────────────────────────────────────────────────
  ASSIGNMENT_NOT_FOUND: "Assignment not found.",
  ASSIGNMENT_INVALID_FESTIVAL:
    "This assignment does not belong to the specified festival.",
  ASSIGNMENT_INVALID_PROGRAMME:
    "The selected programme does not belong to this festival.",
  ASSIGNMENT_INVALID_PARTICIPANT:
    "The selected participant does not belong to this festival.",
  ASSIGNMENT_REQUIRES_PARTICIPANT:
    "Either a participant or a group must be specified.",
  ASSIGNMENT_CATEGORY_MISMATCH:
    "The participant's category does not match the programme's category.",
  ASSIGNMENT_ALREADY_EXISTS:
    "This participant is already assigned to this programme.",
  ASSIGNMENT_DEADLINE_PASSED: "Deadline passed. Assignments are closed.",
  ASSIGNMENT_DEPENDENCIES_MISSING:
    "Please create categories, groups, programmes, and participants before making assignments.",
  ASSIGNMENT_DEADLINE_PASSED_ADMIN: "Deadline passed. Assignments are closed.",
  ASSIGNMENT_WINDOW_NOT_OPEN:
    "Assignments haven't opened yet. Please wait for the start date.",
  PARTICIPANT_CREATION_DEADLINE_PASSED:
    "Deadline passed. Adding new participants is closed.",
  PARTICIPANT_CREATION_WINDOW_NOT_OPEN:
    "Participant registration hasn't opened yet. Please wait for the start date.",

  // ─── Usage / Limits ───────────────────────────────────────────────────────
  USAGE_LIMIT_EXCEEDED:
    "Resource limit reached for your plan. Please upgrade to continue.",

  // ─── Members ──────────────────────────────────────────────────────────────
  MEMBER_ALREADY_EXISTS: "This user is already a member of this festival.",
  MEMBER_NOT_FOUND: "Team member not found.",
  MEMBER_LIMIT_REACHED:
    "Team member limit reached for your plan. Please upgrade to add more.",

  // ─── Chest Numbers ────────────────────────────────────────────────────────
  CHEST_SETTINGS_NOT_CONFIGURED:
    "Chest number settings have not been configured yet.",

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

  // 2. Handle Database/Constraint Errors (Generic for now)
  const err = error as any;
  if (err?.code === "23505") {
    // Postgres unique_violation
    return {
      success: false,
      error: "A unique constraint was violated. Please check your data.",
    };
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
    const msg = error.message.toLowerCase();
    if (
      msg.includes("database") ||
      msg.includes("connect") ||
      msg.includes("pool") ||
      msg.includes("drizzle")
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
