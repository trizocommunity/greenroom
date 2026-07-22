import { z } from "zod";
import { memberRoleEnum } from "@/api/contracts/members";

export const InviteMemberSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: memberRoleEnum,
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
  user?: {
    fullName: string | null;
    email: string | null;
    image?: string | null;
    avatarUrl?: string | null;
  } | null;
}
