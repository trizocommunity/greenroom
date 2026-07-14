"use client";

import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Copy, Eye, Loader2, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useAddMember,
  useMembers,
  useRemoveMember,
} from "@/api/client/members";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { useFestival } from "@/components/festival/FestivalContext";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FestivalRole } from "@/core/types/app-enums";
import { parseStoredInstant } from "@/core/utils/date-time";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";

interface MembersClientProps {
  festivalId: string;
}

export function MembersClient({ festivalId }: MembersClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const { data: members = [], isLoading } = useMembers(festivalId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Club Members</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <AddMemberDialog festivalId={festivalId} disabled={isReadOnly} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined At</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member: any) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {member.user?.fullName || member.fullName || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.user?.email || member.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <FestivalRoleBadge
                    festivalRole={member.role as FestivalRole}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(parseStoredInstant(member.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={member.isActive ? "default" : "secondary"}>
                    {member.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <MemberActions
                    member={member}
                    isReadOnly={isReadOnly}
                    festivalId={festivalId}
                  />
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AddMemberDialog({
  festivalId,
  disabled,
}: {
  festivalId: string;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const dirtySourceId = `members-add-dialog:${festivalId}`;
  const { registerDirtySource, unregisterDirtySource, setDirty } =
    useUnsavedChanges();
  const festival = useFestival();
  const readOnlyExpired = festival?.readOnlyExpired ?? false;
  const addMember = useAddMember();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "STAGE_MANAGER",
    password: "",
  });
  const hasUnsavedForm =
    open &&
    (formData.fullName.trim().length > 0 ||
      formData.email.trim().length > 0 ||
      formData.password.trim().length > 0);
  const canCreateMember =
    hasUnsavedForm &&
    formData.fullName.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.password.trim().length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await addMember.mutateAsync({
        festivalId,
        data: {
          ...formData,
          role: formData.role as "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER",
        },
      });

      toast.success("Member added successfully");
      setOpen(false);
      setFormData({
        fullName: "",
        email: "",
        role: "STAGE_MANAGER",
        password: "",
      });
      setDirty(dirtySourceId, false);
    } catch (error) {
      toast.error("Failed to add member");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    registerDirtySource(dirtySourceId);
    return () => unregisterDirtySource(dirtySourceId);
  }, [dirtySourceId, registerDirtySource, unregisterDirtySource]);

  useEffect(() => {
    setDirty(dirtySourceId, hasUnsavedForm);
  }, [dirtySourceId, hasUnsavedForm, setDirty]);

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
          <User className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Create a new staff member for this festival.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              required
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              required
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={formData.role}
              onValueChange={(val) => setFormData({ ...formData, role: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="STAGE_MANAGER">Stage Manager</SelectItem>
                <SelectItem value="ANNOUNCER">Announcer</SelectItem>
                <SelectItem value="MEDIA">Media</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Initial Password</Label>
            <Input
              required
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="******"
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 6 characters.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !canCreateMember}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberActions({
  member,
  isReadOnly,
  festivalId,
}: {
  member: any;
  isReadOnly: boolean;
  festivalId: string;
}) {
  const queryClient = useQueryClient();
  const removeMember = useRemoveMember();
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    if (isReadOnly) return;
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

  return (
    <div className="flex justify-end gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>Details for {member.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <div className="font-medium">{member.fullName}</div>
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <div className="font-medium">{member.email}</div>
            </div>
            {member.initialPassword && (
              <div className="grid gap-2">
                <Label>Initial Password</Label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">
                    {member.initialPassword}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      navigator.clipboard.writeText(member.initialPassword)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this with the member.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        title="Remove Member"
        description="Are you sure you want to remove this member? Their account will not be deleted, but they will lose access to this festival."
        onDelete={handleRevoke}
        isDeleting={isRevoking}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            disabled={isReadOnly}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}
