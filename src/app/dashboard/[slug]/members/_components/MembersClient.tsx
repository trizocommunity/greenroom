"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Eye,
  HelpCircle,
  Loader2,
  Mail,
  MoreVertical,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useMembers, useRemoveMember } from "@/api/client/members";
import { memberRoleEnum } from "@/api/contracts/members";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { useFestival } from "@/components/festival/FestivalContext";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseStoredInstant } from "@/core/utils/date-time";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  useCancelInvitation,
  useCreateInvitation,
  usePendingInvitations,
} from "@/features/invitation/hooks/use-invitations";

const InviteMemberSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: memberRoleEnum,
});

type InviteMemberFormValues = z.infer<typeof InviteMemberSchema>;

interface PendingInvitation {
  id: string;
  email: string;
  festivalRole: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  status: "pending" | "expired";
}

interface Member {
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
  } | null;
}

interface MembersClientProps {
  festivalId: string;
  userRole: string;
}

export function MembersClient({ festivalId, userRole }: MembersClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const { data: members = [], isLoading: membersLoading } =
    useMembers(festivalId);
  const { data: invitationsData, isLoading: invitationsLoading } =
    usePendingInvitations(festivalId);
  const invitations: PendingInvitation[] = invitationsData?.body?.data || [];

  const isOwner = userRole === "OWNER";

  if (membersLoading && invitationsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Club Members</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "member" : "members"}
            {invitations.length > 0 &&
              ` • ${invitations.length} pending invitation${invitations.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HowItWorksButton
            title="How it Works"
            description="Learn how to add members to your festival"
          >
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Invite</p>
                <p className="text-sm text-muted-foreground">
                  Fill in the member&apos;s email and select their role. An
                  invitation email will be sent automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Pending</p>
                <p className="text-sm text-muted-foreground">
                  The invitation stays active for 48 hours. If it expires, you
                  can re-invite from the members list.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Accept</p>
                <p className="text-sm text-muted-foreground">
                  The invitee clicks the link in their email and accepts the
                  invitation.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-muted-foreground">
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

      {invitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pending Invitations
          </h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {invitations.map((invitation: PendingInvitation) => (
              <PendingInvitationCard
                key={invitation.id}
                invitation={invitation}
                isOwner={isOwner}
              />
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && invitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <User className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No members yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Invite staff members to help manage this festival.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member: Member) => (
            <MemberCard
              key={member.id}
              member={member}
              festivalId={festivalId}
              isOwner={isOwner}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingInvitationCard({
  invitation,
  isOwner,
}: {
  invitation: PendingInvitation;
  isOwner: boolean;
}) {
  const cancelInvitation = useCancelInvitation();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelInvitation.mutateAsync({ invitationId: invitation.id });
      toast.success("Invitation cancelled");
    } catch (e) {
      toast.error("Failed to cancel invitation");
    } finally {
      setIsCancelling(false);
    }
  };

  const expiresAt = parseStoredInstant(invitation.expiresAt);
  const isExpired = invitation.status === "expired";
  const createdAt = parseStoredInstant(invitation.createdAt);

  return (
    <div className="rounded-2xl border border-dashed bg-card p-4 flex flex-col gap-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar className="h-10 w-10 shrink-0 rounded-full border bg-muted/50 flex items-center justify-center text-xs font-semibold">
            <AvatarFallback className="bg-transparent text-muted-foreground">
              <Mail className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate tracking-wide">
              {invitation.email}
            </h3>
            <p className="text-sm text-muted-foreground truncate mt-1">
              Pending Invitation
            </p>
          </div>
        </div>
        {!isOwner ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Cancel Invitation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Role & status
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <FestivalRoleBadge festivalRole={invitation.festivalRole as any} />
          <Badge
            variant="outline"
            className={
              isExpired
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
            }
          >
            {isExpired ? "Expired" : "Pending"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center rounded-xl border bg-muted/20 p-2">
        <div>
          <p className="text-sm font-semibold leading-none mt-0.5">
            {format(createdAt, "MMM d, yyyy")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Invited</p>
        </div>
        <div>
          <p className="text-sm font-semibold leading-none mt-0.5">
            {format(expiresAt, "MMM d, yyyy")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {isExpired ? "Expired On" : "Expires"}
          </p>
        </div>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  festivalId,
  isOwner,
  isReadOnly,
}: {
  member: Member;
  festivalId: string;
  isOwner: boolean;
  isReadOnly: boolean;
}) {
  const removeMember = useRemoveMember();
  const [isRevoking, setIsRevoking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await removeMember.mutateAsync({ festivalId, memberId: member.id });
      toast.success("Member removed");
    } catch (e) {
      toast.error("Error removing member");
    } finally {
      setIsRevoking(false);
    }
  };

  const fullName = member.user?.fullName || member.fullName || "Unknown";
  const email = member.user?.email || member.email || "";
  const joinedAt = parseStoredInstant(member.createdAt);
  const avatarUrl =
    (member.user as any)?.image || (member.user as any)?.avatarUrl;
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="rounded-2xl border bg-card p-4 flex flex-col gap-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar className="h-10 w-10 shrink-0 rounded-full border bg-muted/50 flex items-center justify-center text-xs font-semibold">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
            <AvatarFallback className="bg-transparent text-xs font-semibold text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate tracking-wide">
              {fullName}
            </h3>
            <p className="text-sm text-muted-foreground truncate mt-1">
              {email}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setShowDetails(true)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {!isOwner && !isReadOnly ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={handleRevoke}
                disabled={isRevoking}
              >
                {isRevoking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove Member
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Role & status
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <FestivalRoleBadge festivalRole={member.role as any} />
          <Badge
            variant="outline"
            className={
              member.isActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
            }
          >
            <span
              className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                member.isActive ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {member.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center rounded-xl border bg-muted/20 p-2">
        <div>
          <p className="text-sm font-semibold leading-none mt-0.5">
            {format(joinedAt, "MMM d, yyyy")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Joined</p>
        </div>
        <div>
          <p className="text-sm font-semibold leading-none mt-0.5">
            {member.isActive ? "Full Access" : "Disabled"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Access Status
          </p>
        </div>
      </div>

      <MemberDetailsDialog
        member={member}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
    </div>
  );
}

function MemberDetailsDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fullName = member.user?.fullName || member.fullName || "Unknown";
  const email = member.user?.email || member.email || "";
  const joinedAt = parseStoredInstant(member.createdAt);
  const avatarUrl =
    (member.user as any)?.image || (member.user as any)?.avatarUrl;
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center gap-4 space-y-0 border-b pb-4">
          <Avatar className="h-14 w-14 border bg-muted">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
            <AvatarFallback className="text-base font-semibold text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <DialogTitle className="truncate text-lg font-semibold">
              {fullName}
            </DialogTitle>
            <DialogDescription className="truncate text-sm">
              {email}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Role
              </span>
              <div>
                <FestivalRoleBadge festivalRole={member.role as any} />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Status
              </span>
              <div>
                <Badge
                  variant="secondary"
                  className="flex w-fit items-center gap-1.5 font-normal"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      member.isActive ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {member.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-t pt-3 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Joined On
            </span>
            <p className="text-sm font-medium text-foreground">
              {format(joinedAt, "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({
  festivalId,
  disabled,
  existingEmails,
}: {
  festivalId: string;
  disabled: boolean;
  existingEmails: string[];
}) {
  const createInvitation = useCreateInvitation();
  const festival = useFestival();
  const readOnlyExpired = festival?.readOnlyExpired ?? false;
  const [open, setOpen] = useState(false);

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(InviteMemberSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      role: "STAGE_MANAGER",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ email: "", role: "STAGE_MANAGER" });
    }
  }, [open, form]);

  const onSubmit = async (data: InviteMemberFormValues) => {
    try {
      await createInvitation.mutateAsync({
        email: data.email,
        festivalId,
        festivalRole: data.role,
      });
      toast.success("Invitation sent successfully");
      setOpen(false);
      form.reset();
    } catch (error: any) {
      const errorMsg =
        error?.body?.error || error?.message || "Failed to send invitation";
      if (errorMsg.toLowerCase().includes("already pending")) {
        form.setError("email", { message: errorMsg });
      } else if (errorMsg.toLowerCase().includes("already a member")) {
        form.setError("email", { message: errorMsg });
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const validateEmailNotExists = (email: string) => {
    if (existingEmails.includes(email.toLowerCase())) {
      form.setError("email", {
        message: "This email is already a member or has a pending invitation",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = (data: InviteMemberFormValues) => {
    if (!validateEmailNotExists(data.email)) return;
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={disabled || readOnlyExpired}
          title={
            readOnlyExpired
              ? "Festival has expired; read-only access."
              : undefined
          }
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite New Member</DialogTitle>
          <DialogDescription>
            Enter the member&apos;s email and select their role. An invitation
            email will be sent automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="member@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Role <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="ANNOUNCER">Announcer</SelectItem>
                      <SelectItem value="STAGE_MANAGER">
                        Stage Manager
                      </SelectItem>
                      <SelectItem value="MEDIA">Media</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createInvitation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || createInvitation.isPending}
              >
                {createInvitation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Invitation
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
