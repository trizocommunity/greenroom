import { z } from "zod";
import { memberRoleEnum } from "@/api/contracts/members";

export const InviteMemberSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    role: memberRoleEnum,
    stageIds: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.role === "STAGE_MANAGER" && data.stageIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stageIds"],
        message: "Select at least one stage for this stage manager",
      });
    }
  });

export type InviteMemberFormValues = z.infer<typeof InviteMemberSchema>;

export interface PendingInvitation {
  id: string;
  email: string;
  festivalRole: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  status: "pending" | "expired";
}

export interface Member {
  id: string;
  festivalId: string;
  userId: string | null;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: { additionalRoles?: string[] } | null;
  user?: {
    fullName: string | null;
    email: string | null;
    image?: string | null;
    avatarUrl?: string | null;
  } | null;
}
