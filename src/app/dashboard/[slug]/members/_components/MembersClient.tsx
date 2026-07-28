"use client";

import { Loader2, UserPlus, Users } from "lucide-react";
import type React from "react";
import { useMembers } from "@/api/client/members";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { usePendingInvitations } from "@/features/invitation/hooks/use-invitations";
import { AddMemberDialog } from "./AddMemberDialog";
import { MemberCard } from "./MemberCard";
import { PendingInvitationCard } from "./PendingInvitationCard";
import type { Member, PendingInvitation } from "./types";

interface MembersClientProps {
  festivalId: string;
  userRole: string;
  canManageStageAssignments?: boolean;
  children?: React.ReactNode;
}

export function MembersClient({
  festivalId,
  userRole,
  canManageStageAssignments = false,
  children,
}: MembersClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const { data: members = [], isLoading: membersLoading } =
    useMembers(festivalId);
  const { data: invitationsData, isLoading: invitationsLoading } =
    usePendingInvitations(festivalId);
  const invitations: PendingInvitation[] = invitationsData?.body?.data || [];

  const isOwner = userRole === "OWNER";

  if (membersLoading && invitationsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if ((invitationsData as any)?.error || (invitationsData as any)?.isError) {
    const err = (invitationsData as any).error || (invitationsData as any);
    return (
      <div className="text-center py-8 text-destructive font-medium">
        Error: {err.message || "Failed to load invitations"}
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-row items-center justify-between gap-4">
        {children || (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Members
            </h1>
          </div>
        )}
        <div className="flex items-center gap-2.5 shrink-0">
          <HowItWorksButton
            title="How it Works"
            description="Learn how to add members to your festival"
          >
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                1
              </div>
              <div>
                <p className="font-semibold">Invite</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Fill in the member&apos;s email and select their role. An
                  invitation email will be sent automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                2
              </div>
              <div>
                <p className="font-semibold">Pending</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  The invitation stays active for 48 hours. If it expires, you
                  can re-invite from the members list.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                3
              </div>
              <div>
                <p className="font-semibold">Accept</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  The invitee clicks the link in their email and accepts the
                  invitation.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                4
              </div>
              <div>
                <p className="font-semibold">Active</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Once accepted, the member appears in your list with full
                  access to the festival.
                </p>
              </div>
            </div>
          </HowItWorksButton>
          <AddMemberDialog
            festivalId={festivalId}
            disabled={isReadOnly}
            existingEmails={[
              ...members
                .map((m: Member) => m.email?.toLowerCase())
                .filter((email): email is string => Boolean(email)),
              ...invitations
                .map((i: PendingInvitation) => i.email?.toLowerCase())
                .filter((email): email is string => Boolean(email)),
            ]}
          />
        </div>
      </div>

      {members.length === 0 && invitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 p-12 text-center shadow-sm">
          <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="mb-1 text-lg font-bold tracking-tight text-foreground">
            No team members yet
          </h3>
          <p className="mb-6 text-sm text-muted-foreground max-w-sm">
            Invite staff members to help manage schedules, stages, categories,
            and festival operations.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...members, ...invitations]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .map((item) =>
              "isActive" in item ? (
                <MemberCard
                  key={item.id}
                  member={item}
                  festivalId={festivalId}
                  isOwner={isOwner}
                  isReadOnly={isReadOnly}
                  canManageStageAssignments={canManageStageAssignments}
                />
              ) : (
                <PendingInvitationCard
                  key={item.id}
                  invitation={item as PendingInvitation}
                  isOwner={isOwner}
                  festivalId={festivalId}
                />
              ),
            )}
        </div>
      )}
    </div>
  );
}
