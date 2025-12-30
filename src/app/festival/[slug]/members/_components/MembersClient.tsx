"use client";

import { useMembers } from "@/hooks/useMembers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Copy, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { FestivalRole } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { revokeFestivalMember } from "@/server/actions/team.actions";
import { toast } from "sonner";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createFestivalMember } from "@/server/actions/team.actions";

interface MembersClientProps {
  festivalId: string;
}

export function MembersClient({ festivalId }: MembersClientProps) {
  const { members, isLoading } = useMembers(festivalId);

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
        <h2 className="text-lg font-semibold">Club Members</h2>
        <AddMemberDialog festivalId={festivalId} />
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
                  {format(new Date(member.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={member.isActive ? "default" : "secondary"}>
                    {member.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <MemberActions member={member} />
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

function AddMemberDialog({ festivalId }: { festivalId: string }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "STAGE_MANAGER",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await createFestivalMember({
        festivalId,
        ...formData,
        role: formData.role as "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER",
      });

      if (result.success) {
        toast.success("Member added successfully");
        setOpen(false);
        setFormData({
          fullName: "",
          email: "",
          role: "STAGE_MANAGER",
          password: "",
        });
        window.location.reload(); // Simple reload to refresh list
      } else {
        toast.error(result.error as string);
      }
    } catch (error) {
      toast.error("Failed to add member");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberActions({ member }: { member: any }) {
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      const result = await revokeFestivalMember(member.id);
      if (result.success) {
        toast.success("Member removed");
        window.location.reload();
      } else {
        toast.error("Failed to remove member");
      }
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
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}
